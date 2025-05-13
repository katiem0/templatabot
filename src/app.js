/**
 * TemplateBot - A GitHub App that propagates changes from template repositories to repositories that use them
 */
const { templateManager } = require('../lib/template-manager');
const { repoUpdater } = require('../lib/repo-updater');

/**
 * @param {Probot} app - Probot's main application class
 */
module.exports = (app) => {
  app.log.info('TemplateBot started!');

  // Listen for pushes to template repositories
  app.on('push', async (context) => {
    const { repository, ref } = context.payload;

    // Only react to pushes to the default branch
    if (!ref.includes(`refs/heads/${repository.default_branch}`)) {
      return;
    }

    // Check if this is a template repository
    if (!repository.is_template) {
      return;
    }

    app.log.info(`Detected push to template repository: ${repository.full_name}`);

    try {
      // Get the list of repositories that use this template
      // We only need the name part of the template repository (not the org/repo format)
      const repoList = await templateManager.getRepositoriesUsingTemplate(
        context,
        repository.id,
        repository.full_name // The method will extract just the name part
      );

      if (repoList.length === 0) {
        app.log.info(`No repositories found using template: ${repository.name}`);
        return;
      }

      app.log.info(`Found ${repoList.length} repositories using template: ${repository.name}`);

      // Process each repository that uses the template
      for (const repo of repoList) {
        app.log.info(`Propagating changes to repository: ${repo.full_name}`);
        try {
          const result = await repoUpdater.propagateChanges(context, repository, repo);
          if (result) {
            app.log.info(`Successfully created PR #${result.number} in ${repo.full_name}`);
          } else {
            app.log.info(`No PR created for ${repo.full_name} - repository may not match criteria`);
          }
        } catch (error) {
          app.log.error(`Error propagating changes to ${repo.full_name}:`, error);
        }
      }
    } catch (error) {
      app.log.error(`Error processing template repository ${repository.full_name}:`, error);
    }
  });
};
