/**
 * Template Manager
 *
 * Tracks the relationship between template repositories and repositories created from them
 * Uses GitHub repository custom properties as a storage mechanism for mapping templates to repositories
 */

// Import configuration
const config = require('../config/config');
const CUSTOM_PROPERTY_NAME = config.template.propertyName;

/**
 * The Template Manager handles tracking which repositories use each template repository
 */
class TemplateManager {
  /**
   * Get a list of repositories that are using the given template
   *
   * @param {import('probot').Context} context - Probot context
   * @param {number} templateRepoId - The ID of the template repository
   * @param {string} templateRepoName - The full name of the template repository
   * @returns {Promise<Array<object>>} - Array of repository objects that use the template
   */
  async getRepositoriesUsingTemplate(context, templateRepoId, templateRepoName) {
    const { octokit } = context;
    // Extract just the repo name without the org
    const templateName = templateRepoName ? templateRepoName.split('/')[1] : '';

    try {
      // Get the org from the context if available
      const org = context.payload.repository?.owner?.login;
      if (!org) {
        throw new Error('Unable to determine organization from context');
      }

      context.log.info(`Searching for repositories in ${org} with template name ${templateName}`);

      if (!templateName) {
        context.log.warn('Template name is empty, cannot search for repositories');
        return [];
      }

      // Use the REST API with search query for custom properties
      // Syntax: org:ORGNAME props.PROPERTY:VALUE
      const searchQuery = `org:${org} props.${CUSTOM_PROPERTY_NAME}:${templateName}`;

      context.log.debug(`Executing search query: ${searchQuery}`);

      // Use the search repositories endpoint with the proper query parameter
      const searchResult = await octokit.rest.search.repos({
        q: searchQuery, // Use the dynamic search query here
        per_page: 100,
      });

      context.log.debug(`Search API request completed with status ${searchResult.status}`);

      console.log('Search result:', searchResult.data.total_count);

      if (searchResult.data.items && searchResult.data.items.length > 0) {
        context.log.info(`Found ${searchResult.data.items.length} repositories using template ${templateName}`);

        // Map the search results to the expected format
        return searchResult.data.items.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name
        }));
      }

      context.log.info(`No repositories found using template ${templateName}`);
      return [];
    } catch (error) {
      context.log.error('Error searching for repositories with custom property:', error);
      throw error;
    }
  }

  /**
   * Register a repository as being derived from a template
   *
   * @param {import('probot').Context} context - Probot context
   * @param {number} templateRepoId - The ID of the template repository
   * @param {string} templateRepoName - The full name of the template repository
   * @param {number} repoId - The ID of the repository using the template
   * @param {string} repoFullName - The full name of the repository (owner/name)
   * @returns {Promise<void>} - Promise that resolves when registration is complete
   */
  async registerRepositoryWithTemplate(context, templateRepoId, templateRepoName, repoId, repoFullName) {
    const { octokit } = context;
    const [owner, repo] = repoFullName.split('/');

    // Extract just the template repo name without the org
    const templateRepoNameOnly = templateRepoName ? templateRepoName.split('/')[1] : '';

    try {
      context.log.info(`Registering repository ${repoFullName} with template ${templateRepoNameOnly}`);

      // Check if the custom property exists (don't create it if it doesn't)
      try {
        // Use the GraphQL API to check if the organization has the custom property defined
        const orgData = await octokit.graphql(`
          query($owner: String!) {
            organization(login: $owner) {
              repositoryCustomProperties(first: 20) {
                nodes {
                  name
                  dataType
                }
              }
            }
          }
        `, { owner });

        // Check if our custom property exists
        const customProps = orgData.organization?.repositoryCustomProperties?.nodes || [];
        const propExists = customProps.some(prop => prop.name === CUSTOM_PROPERTY_NAME);

        if (propExists) {
          // Only set the property if it already exists
          await octokit.rest.repos.setCustomPropertyValue({
            owner,
            repo,
            property_name: CUSTOM_PROPERTY_NAME,
            value: templateRepoNameOnly
          });

          context.log.info(`Successfully set custom property for ${repoFullName} with template ${templateRepoNameOnly}`);
        } else {
          context.log.info(`Custom property ${CUSTOM_PROPERTY_NAME} doesn't exist in organization ${owner}, skipping registration`);
        }
      } catch (error) {
        context.log.warn(`Error checking custom property: ${error.message}`);
      }
    } catch (error) {
      context.log.error(`Error registering repository ${repoFullName} with template:`, error);
      throw error;
    }
  }
}

// Export a singleton instance of the TemplateManager
exports.templateManager = new TemplateManager();
