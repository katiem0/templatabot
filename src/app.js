/**
 * TemplateBot - A GitHub App that propagates changes from template repositories to repositories that use them
 */
const { Probot } = require('probot');
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
      const repoList = await templateManager.getRepositoriesUsingTemplate(context, repository.id);
      
      if (repoList.length === 0) {
        app.log.info(`No repositories found using template: ${repository.full_name}`);
        return;
      }
      
      app.log.info(`Found ${repoList.length} repositories using template: ${repository.full_name}`);
      
      // Process each repository that uses the template
      for (const repo of repoList) {
        await repoUpdater.propagateChanges(context, repository, repo);
      }
    } catch (error) {
      app.log.error(`Error processing template repository ${repository.full_name}:`, error);
    }
  });
  
  // Listen for repository events to update template usage records
  app.on(['repository.created', 'repository.publicized'], async (context) => {
    const { repository } = context.payload;
    
    // Check if this repo was created from a template
    if (repository.template_repository) {
      app.log.info(`Repository ${repository.full_name} created from template ${repository.template_repository.full_name}`);
      
      // Register this repository as using the template
      try {
        await templateManager.registerRepositoryWithTemplate(
          context,
          repository.template_repository.id,
          repository.id,
          repository.full_name
        );
      } catch (error) {
        app.log.error(`Error registering repository ${repository.full_name} with template:`, error);
      }
    }
  });
};