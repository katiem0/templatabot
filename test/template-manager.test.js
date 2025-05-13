const { templateManager } = require('../lib/template-manager');

describe('Template Manager', () => {
  let mockContext;
  
  beforeEach(() => {
    // Mock the Probot context
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn()
      },
      octokit: {
        rest: {
          search: {
            repos: jest.fn().mockResolvedValue({
              data: {
                items: [
                  { full_name: 'org/repo1' },
                  { full_name: 'org/repo2' }
                ]
              }
            })
          },
          repos: {
            get: jest.fn().mockResolvedValue({
              data: {
                topics: ['existing-topic']
              }
            }),
            replaceAllTopics: jest.fn().mockResolvedValue({})
          }
        }
      }
    };
  });

  test('getRepositoriesUsingTemplate returns repositories with matching topic', async () => {
    const repos = await templateManager.getRepositoriesUsingTemplate(mockContext, 12345);
    
    expect(mockContext.octokit.rest.search.repos).toHaveBeenCalledWith({
      q: 'topic:template-source-12345',
      per_page: 100
    });
    
    expect(repos).toHaveLength(2);
    expect(repos[0].full_name).toBe('org/repo1');
    expect(repos[1].full_name).toBe('org/repo2');
  });

  test('registerRepositoryWithTemplate adds topic to repository', async () => {
    await templateManager.registerRepositoryWithTemplate(
      mockContext,
      12345,
      67890,
      'owner/repo'
    );
    
    expect(mockContext.octokit.rest.repos.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo'
    });
    
    expect(mockContext.octokit.rest.repos.replaceAllTopics).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      names: ['existing-topic', 'template-source-12345']
    });
    
    expect(mockContext.log.info).toHaveBeenCalled();
  });
});