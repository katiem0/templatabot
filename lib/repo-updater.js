/**
 * Repository Updater
 *
 * This module handles propagating changes from template repositories to repositories
 * that were created from them, and creating pull requests with those changes.
 */

// Import configuration
const config = require('../config/config');

// Branch name prefix and custom property name from config
const UPDATE_BRANCH_PREFIX = config.template.branchPrefix;
const CUSTOM_PROPERTY_NAME = config.template.propertyName;
/**
 * The RepoUpdater handles propagating changes from template repos to derived repos
 */
class RepoUpdater {
  /**
   * Propagate changes from a template repository to a repository created from it
   *
   * @param {import('probot').Context} context - Probot context
   * @param {object} templateRepo - The template repository object
   * @param {object} targetRepo - The repository object that uses the template
   */
  async propagateChanges(context, templateRepo, targetRepo) {
    const { octokit } = context;
    const [targetOwner, targetRepoName] = targetRepo.full_name.split('/');

    // Generate timestamp with format YYYYMMDD-HHMM
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.toISOString().split('T')[1].substring(0, 5).replace(':', '');
    const timestamp = `${date}-${time}`;

    const branchName = `${UPDATE_BRANCH_PREFIX}${timestamp}`;

    try {
      context.log.info(`Propagating changes from ${templateRepo.full_name} to ${targetRepo.full_name}`);

      // Get changes from template repo (most recent commit)
      const templateOwner = templateRepo.owner.login;
      const templateRepoName = templateRepo.name;

      const templateCommits = await octokit.rest.repos.listCommits({
        owner: templateOwner,
        repo: templateRepoName,
        per_page: 1,
      });

      const latestCommit = templateCommits.data[0];
      const commitMessage = latestCommit.commit.message;
      const latestCommitSha = latestCommit.sha;

      try {
        // Check if we've already processed this specific commit
        const branches = await octokit.rest.repos.listBranches({
          owner: targetOwner,
          repo: targetRepoName,
          protected: false
        });

        const updateBranches = branches.data
          .filter(branch => branch.name.startsWith(UPDATE_BRANCH_PREFIX));

        if (updateBranches.length > 0) {
          // Look for open PRs for these branches
          const openPRs = await octokit.rest.pulls.list({
            owner: targetOwner,
            repo: targetRepoName,
            state: 'open',
            head: updateBranches.map(branch => `${targetOwner}:${branch.name}`).join(',')
          });

          // Check if any of the open PRs contain this commit already
          for (const pr of openPRs.data) {
            if (pr.body && pr.body.includes(latestCommitSha)) {
              context.log.info(`Skipping update for ${targetRepo.full_name} - commit ${latestCommitSha.substring(0, 7)} is already in PR #${pr.number}`);
              return null;
            }
          }

          // If we get here, we have update branches but none contain this commit
          context.log.info(`Found update branches but none contain the latest commit ${latestCommitSha.substring(0, 7)}`);
        }

        const { data: properties } = await octokit.rest.repos.getAllCustomPropertyValues({
          owner: targetOwner,
          repo: targetRepoName
        });
        // Get just the template repo name (without owner)
        const templateName = templateRepo.name;

        // Verify the target repo has the correct custom property value
        if (!properties.properties || !properties.properties[CUSTOM_PROPERTY_NAME] ||
            properties.properties[CUSTOM_PROPERTY_NAME] !== templateName) {
          context.log.info(`Repository ${targetRepo.full_name} doesn't have the correct template property value. Expected: ${templateName}`);
          return null; // Skip this repository
        }

        context.log.info(`Confirmed ${targetRepo.full_name} has template property set to ${templateName}`);
      } catch (error) {
        if (error.status === 404) {
          context.log.info(`Repository ${targetRepo.full_name} doesn't have any custom properties`);
          return null; // Skip this repository
        }
        // For any other error, log and continue with caution
        context.log.warn(`Error checking custom properties for ${targetRepo.full_name}: ${error.message}`);
      }

      // Get template files that changed
      const changedFiles = await this.getChangedFiles(
        octokit,
        templateOwner,
        templateRepoName,
        latestCommit.sha
      );

      if (changedFiles.length === 0) {
        context.log.info(`No file changes found in commit ${latestCommit.sha.substring(0, 7)}, skipping update`);
        return null;
      }

      // Rest of the code for creating branch and PR...
      const targetRepoDetails = await octokit.rest.repos.get({
        owner: targetOwner,
        repo: targetRepoName,
      });

      const baseBranch = targetRepoDetails.data.default_branch;

      // Get the reference to the default branch
      const ref = await octokit.rest.git.getRef({
        owner: targetOwner,
        repo: targetRepoName,
        ref: `heads/${baseBranch}`,
      });

      const baseSha = ref.data.object.sha;

      // Create a new branch for the template updates
      await octokit.rest.git.createRef({
        owner: targetOwner,
        repo: targetRepoName,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      context.log.info(`Created branch ${branchName} in ${targetRepo.full_name}`);

      // Apply the changes to the target repository
      await this.applyChangesToRepo(
        octokit,
        templateOwner,
        templateRepoName,
        targetOwner,
        targetRepoName,
        branchName,
        changedFiles
      );

      // Include the commit SHA in the PR body for future reference
      const prTitle = `Template Update: ${commitMessage.split('\n')[0]}`;
      const prBody = `This PR updates this repository with the latest changes from the template repository (${templateRepo.full_name}).

## Changes from template
${commitMessage}

Template commit: ${latestCommitSha}

---
_This PR was automatically generated by TemplataBot_`;

      const pr = await octokit.rest.pulls.create({
        owner: targetOwner,
        repo: targetRepoName,
        title: prTitle,
        body: prBody,
        head: branchName,
        base: baseBranch,
      });

      context.log.info(`Created PR #${pr.data.number} in ${targetRepo.full_name}`);

      return pr.data;
    } catch (error) {
      context.log.error(`Error propagating changes to ${targetRepo.full_name}:`, error);
      // Don't throw the error to avoid breaking the loop in app.js for other repos
      return null;
    }
  }

  /**
   * Get files that changed in the most recent commit to the template
   *
   * @param {import('@octokit/rest').Octokit} octokit - Octokit instance
   * @param {string} owner - Template repo owner
   * @param {string} repo - Template repo name
   * @param {string} commitSha - Commit SHA to analyze
   * @returns {Promise<Array<object>>} - List of changed files
   */
  async getChangedFiles(octokit, owner, repo, commitSha) {
    const commit = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: commitSha,
    });

    return commit.data.files;
  }

  /**
   * Apply changes from template repo to target repo
   *
   * @param {import('@octokit/rest').Octokit} octokit - Octokit instance
   * @param {string} templateOwner - Template repo owner
   * @param {string} templateRepo - Template repo name
   * @param {string} targetOwner - Target repo owner
   * @param {string} targetRepo - Target repo name
   * @param {string} branch - Branch name to apply changes to
   * @param {Array<object>} changedFiles - List of changed files
   */

  async applyChangesToRepo(
    octokit,
    templateOwner,
    templateRepo,
    targetOwner,
    targetRepo,
    branch,
    changedFiles
  ) {
    // Get target repo's default branch once (avoid repeated calls)
    const targetRepoDetails = await octokit.rest.repos.get({
      owner: targetOwner,
      repo: targetRepo,
    });
    const baseBranch = targetRepoDetails.data.default_branch;

    // Process each changed file
    for (const file of changedFiles) {
      try {
        // Skip deleted files for now
        if (file.status === 'removed') {
          continue;
        }

        // Get the file content from the template repository
        const fileContent = await octokit.rest.repos.getContent({
          owner: templateOwner,
          repo: templateRepo,
          path: file.filename,
        });

        const content = Buffer.from(fileContent.data.content, 'base64').toString();

        // Check if file exists in the BASE branch (to prevent duplicate updates)
        let existingFile = null;
        let sha = null;

        try {
          existingFile = await octokit.rest.repos.getContent({
            owner: targetOwner,
            repo: targetRepo,
            path: file.filename,
            ref: baseBranch, // Always check the base branch
          });
          sha = existingFile.data.sha;
        } catch (error) {
          // File doesn't exist in the base branch - this is fine
          if (error.status !== 404) {
            throw error; // Re-throw if it's not a 404
          }
        }

        // Create/update file with conditional SHA
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: targetOwner,
          repo: targetRepo,
          path: file.filename,
          message: sha ? `Update ${file.filename} from template` : `Add ${file.filename} from template`,
          content: Buffer.from(content).toString('base64'),
          branch,
          sha // Will be null for new files, which is what we want
        });
      } catch (error) {
        console.error(`Error applying changes for file ${file.filename}:`, error);
        // Continue with the next file
      }
    }
  }
}

// Export a singleton instance of the RepoUpdater
exports.repoUpdater = new RepoUpdater();
