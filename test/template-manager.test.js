const { templateManager } = require('../lib/template-manager');

describe('Template Manager', () => {
  let mockContext;

  beforeEach(() => {
    // Mock the Probot context
    mockContext = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      octokit: {
        graphql: jest.fn().mockImplementation((query) => {
          // Mock GraphQL responses for different queries
          if (query.includes('search(query: "is:repo"')) {
            return {
              search: {
                nodes: [
                  {
                    id: 'repo1_id',
                    name: 'repo1',
                    owner: { login: 'org' },
                    customProperties: {
                      nodes: [
                        {
                          name: 'template-source',
                          value: { value: '12345' }
                        }
                      ]
                    }
                  },
                  {
                    id: 'repo2_id',
                    name: 'repo2',
                    owner: { login: 'org' },
                    customProperties: {
                      nodes: [
                        {
                          name: 'template-source',
                          value: { value: '12345' }
                        }
                      ]
                    }
                  }
                ]
              }
            };
          } else if (query.includes('organization(login:')) {
            return {
              organization: {
                repositoryCustomProperties: {
                  nodes: [{ name: 'template-source', dataType: 'STRING' }]
                }
              }
            };
          }

          return {}; // Default empty response
        }),
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

  test('getRepositoriesUsingTemplate returns repositories with matching custom property', async () => {
    const repos = await templateManager.getRepositoriesUsingTemplate(mockContext, 12345);

    expect(mockContext.octokit.graphql).toHaveBeenCalled();

    expect(repos).toHaveLength(2);
    expect(repos[0].name).toBe('repo1');
    expect(repos[1].name).toBe('repo2');
  });

  test('fallbacks to topics when GraphQL API fails', async () => {
    // Make GraphQL fail
    mockContext.octokit.graphql.mockRejectedValueOnce(new Error('GraphQL error'));

    const repos = await templateManager.getRepositoriesUsingTemplate(mockContext, 12345);

    expect(mockContext.octokit.rest.search.repos).toHaveBeenCalledWith({
      q: 'topic:template-source-12345',
      per_page: 100
    });

    expect(repos).toHaveLength(2);
    expect(repos[0].full_name).toBe('org/repo1');
  });

  test('registerRepositoryWithTemplate sets custom property when available', async () => {
    await templateManager.registerRepositoryWithTemplate(
      mockContext,
      12345,
      67890,
      'owner/repo'
    );

    expect(mockContext.octokit.graphql).toHaveBeenCalled();
    expect(mockContext.log.info).toHaveBeenCalled();
  });

  test('registerRepositoryWithTemplate falls back to topics when custom properties fail', async () => {
    // Make GraphQL fail
    mockContext.octokit.graphql.mockRejectedValueOnce(new Error('GraphQL error'));

    await templateManager.registerRepositoryWithTemplate(
      mockContext,
      12345,
      67890,
      'owner/repo'
    );

    // Should fall back to using topics
    expect(mockContext.octokit.rest.repos.get).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo'
    });

    expect(mockContext.octokit.rest.repos.replaceAllTopics).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      names: ['existing-topic', 'template-source-12345']
    });

    expect(mockContext.log.warn).toHaveBeenCalled();
    expect(mockContext.log.info).toHaveBeenCalled();
  });
});
