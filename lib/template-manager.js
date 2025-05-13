/**
 * Template Manager
 * 
 * Tracks the relationship between template repositories and repositories created from them
 * Uses GitHub repository topics as a storage mechanism for mapping templates to repositories
 */

// Topic format for marking repositories that use a template
const TOPIC_PREFIX = 'template-source-';

/**
 * The Template Manager handles tracking which repositories use each template repository
 */
class TemplateManager {
  /**
   * Get a list of repositories that are using the given template
   * 
   * @param {import('probot').Context} context - Probot context
   * @param {number} templateRepoId - The ID of the template repository
   * @returns {Promise<Array<object>>} - Array of repository objects that use the template
   */
  async getRepositoriesUsingTemplate(context, templateRepoId) {
    const topic = `${TOPIC_PREFIX}${templateRepoId}`;
    const { octokit } = context;
    
    try {
      // Search for repositories with the template topic
      const searchResult = await octokit.rest.search.repos({
        q: `topic:${topic}`,
        per_page: 100,
      });
      
      return searchResult.data.items;
    } catch (error) {
      context.log.error(`Error searching for repositories with topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Register a repository as being derived from a template
   * 
   * @param {import('probot').Context} context - Probot context
   * @param {number} templateRepoId - The ID of the template repository
   * @param {number} repoId - The ID of the repository using the template
   * @param {string} repoFullName - The full name of the repository (owner/name)
   */
  async registerRepositoryWithTemplate(context, templateRepoId, repoId, repoFullName) {
    const topic = `${TOPIC_PREFIX}${templateRepoId}`;
    const { octokit } = context;
    const [owner, repo] = repoFullName.split('/');
    
    try {
      // Get current topics for the repository
      const repoData = await octokit.rest.repos.get({
        owner,
        repo,
      });
      
      const currentTopics = repoData.data.topics || [];
      
      // Add the template topic if it doesn't already exist
      if (!currentTopics.includes(topic)) {
        const newTopics = [...currentTopics, topic];
        
        // Update the repository topics
        await octokit.rest.repos.replaceAllTopics({
          owner,
          repo,
          names: newTopics,
        });
        
        context.log.info(`Registered repository ${repoFullName} with template ID ${templateRepoId}`);
      }
    } catch (error) {
      context.log.error(`Error registering repository ${repoFullName} with template:`, error);
      throw error;
    }
  }
}

// Export a singleton instance of the TemplateManager
exports.templateManager = new TemplateManager();