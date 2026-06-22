import fs from 'fs';
import path from 'path';
import action from '../src/action';
import { Context } from '@actions/github/lib/context';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import * as github from '@actions/github';

jest.mock('@actions/github', () => ({
  ...jest.requireActual('@actions/github'),
  getOctokit: jest.fn(),
}));

// Prevent real network calls in validateSubscription
jest.mock('axios', () => ({
  default: { post: jest.fn().mockRejectedValue(new Error('Network error')) },
  isAxiosError: jest.fn().mockReturnValue(false),
  __esModule: true,
}));

const mockAddLabels = jest.fn();
const mockGetContent = jest.fn();

describe('pr-labeler-action', () => {
  beforeEach(() => {
    setupEnvironmentVariables();
    jest.clearAllMocks();
    (github.getOctokit as jest.Mock).mockReturnValue({
      rest: {
        repos: { getContent: mockGetContent },
        issues: { addLabels: mockAddLabels },
      },
    });
    mockAddLabels.mockResolvedValue({});
  });

  it('adds the "fix" label for "fix/510-logging" branch', async () => {
    mockGetContent.mockResolvedValue({ data: configFixture() });

    await action(new MockContext(pullRequestOpenedFixture({ ref: 'fix/510-logging' })));

    expect(mockAddLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['fix'] }),
    );
  });

  it('adds the "feature" label for "feature/sign-in-page/101" branch', async () => {
    mockGetContent.mockResolvedValue({ data: configFixture() });

    await action(new MockContext(pullRequestOpenedFixture({ ref: 'feature/sign-in-page/101' })));

    expect(mockAddLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['🎉 feature'] }),
    );
  });

  it('adds the "release" label for "release/2.0" branch', async () => {
    mockGetContent.mockResolvedValue({ data: configFixture() });

    await action(new MockContext(pullRequestOpenedFixture({ ref: 'release/2.0' })));

    expect(mockAddLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['release'] }),
    );
  });

  it('uses the default config when no config was provided', async () => {
    mockGetContent.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    await action(new MockContext(pullRequestOpenedFixture({ ref: 'fix/510-logging' })));

    expect(mockAddLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['fix'] }),
    );
  });

  it('adds only one label if the branch matches a negative pattern', async () => {
    mockGetContent.mockResolvedValue({ data: configFixture() });

    await action(new MockContext(pullRequestOpenedFixture({ ref: 'release/skip-this-one' })));

    expect(mockAddLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['skip-release'] }),
    );
  });

  it("adds no labels if the branch doesn't match any patterns", async () => {
    mockGetContent.mockResolvedValue({ data: configFixture() });

    await action(new MockContext(pullRequestOpenedFixture({ ref: 'hello_world' })));

    expect(mockAddLabels).not.toHaveBeenCalled();
  });
});

class MockContext extends Context {
  constructor(payload: WebhookPayload) {
    super();
    this.payload = payload;
  }
}

function encodeContent(content: Buffer) {
  return Buffer.from(content).toString('base64');
}

function configFixture(fileName = 'config.yml') {
  return {
    type: 'file',
    encoding: 'base64',
    size: 5362,
    name: fileName,
    path: `.github/${fileName}`,
    content: encodeContent(fs.readFileSync(path.join(__dirname, `fixtures/${fileName}`))),
    sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
    url: 'https://api.github.com/repos/octokit/octokit.rb/contents/.github/release-drafter.yml',
    git_url:
      'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
    html_url: 'https://github.com/octokit/octokit.rb/blob/master/.github/release-drafter.yml',
    download_url:
      'https://raw.githubusercontent.com/octokit/octokit.rb/master/.github/release-drafter.yml',
    _links: {
      git: 'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
      self: 'https://api.github.com/repos/octokit/octokit.rb/contents/.github/release-drafter.yml',
      html: 'https://github.com/octokit/octokit.rb/blob/master/.github/release-drafter.yml',
    },
  };
}

function pullRequestOpenedFixture({ ref }: { ref: string }) {
  return {
    pull_request: {
      number: 1,
      head: {
        ref,
      },
    },
    repository: {
      name: 'Hello-World',
      owner: {
        login: 'Codertocat',
      },
    },
  };
}

function setupEnvironmentVariables() {
  process.env = {};
  process.env['GITHUB_TOKEN'] = '123';
  process.env['INPUT_CONFIGURATION-PATH'] = '.github/pr-labeler.yml';
}
