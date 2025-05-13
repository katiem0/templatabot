const { Probot, ProbotOctokit } = require('probot');
const app = require('../src/app');
const { templateManager } = require('../lib/template-manager');
const { repoUpdater } = require('../lib/repo-updater');

// Mock the template manager and repo updater
jest.mock('../lib/template-manager');
jest.mock('../lib/repo-updater');

describe('TemplateBot', () => {
  let probot;

  beforeEach(() => {
    probot = new Probot({
      appId: 1,
      privateKey: 'test',
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
    });
    
    probot.load(app);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('ignores push events to non-template repositories', async () => {
    await probot.receive({
      name: 'push',
      payload: {
        ref: 'refs/heads/main',
        repository: {
          id: 123,
          name: 'non-template-repo',
          full_name: 'owner/non-template-repo',
          default_branch: 'main',
          is_template: false
        }
      }
    });

    expect(templateManager.getRepositoriesUsingTemplate).not.toHaveBeenCalled();
    expect(repoUpdater.propagateChanges).not.toHaveBeenCalled();
  });

  test('processes push events to template repositories', async () => {
    templateManager.getRepositoriesUsingTemplate.mockResolvedValue([
      { id: 456, full_name: 'owner/repo1' },
      { id: 789, full_name: 'owner/repo2' }
    ]);

    await probot.receive({
      name: 'push',
      payload: {
        ref: 'refs/heads/main',
        repository: {
          id: 123,
          name: 'template-repo',
          full_name: 'owner/template-repo',
          default_branch: 'main',
          is_template: true
        }
      }
    });

    expect(templateManager.getRepositoriesUsingTemplate).toHaveBeenCalledWith(
      expect.anything(), 
      123
    );
    
    expect(repoUpdater.propagateChanges).toHaveBeenCalledTimes(2);
  });

  test('registers new repositories created from templates', async () => {
    await probot.receive({
      name: 'repository.created',
      payload: {
        repository: {
          id: 456,
          name: 'new-repo',
          full_name: 'owner/new-repo',
          template_repository: {
            id: 123,
            full_name: 'owner/template-repo'
          }
        }
      }
    });

    expect(templateManager.registerRepositoryWithTemplate).toHaveBeenCalledWith(
      expect.anything(),
      123,
      456,
      'owner/new-repo'
    );
  });
});