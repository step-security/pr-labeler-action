import axios, { isAxiosError } from 'axios';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context';
import matcher from 'matcher';
import getConfig, { Config } from './utils/config';

const defaultConfig = {
  feature: ['feature/*', 'feat/*'],
  fix: 'fix/*',
  chore: 'chore/*',
};

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'TimonVS/pr-labeler-action'
  const action = process.env.GITHUB_ACTION_REPOSITORY
  const docsUrl =
    'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions'

  core.info('')
  core.info('[1;36mStepSecurity Maintained Action[0m')
  core.info(`Secure drop-in replacement for ${upstream}`)
  if (repoPrivate === false)
    core.info('[32m✓ Free for public repositories[0m')
  core.info(`[36mLearn more:[0m ${docsUrl}`)
  core.info('')

  if (repoPrivate === false) return

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const body: Record<string, string> = {action: action || ''}
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      {timeout: 3000}
    )
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        `[1;31mThis action requires a StepSecurity subscription for private repositories.[0m`
      )
      core.error(
        `[31mLearn how to enable a subscription: ${docsUrl}[0m`
      )
      process.exit(1)
    }
    core.info('Timeout or API not reachable. Continuing to next step.')
  }
}

async function action(context: Context = github.context) {
  try {
    await validateSubscription();
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? core.getInput('repo-token', { required: true });
    const octokit = github.getOctokit(GITHUB_TOKEN).rest;
    const configPath = core.getInput('configuration-path', { required: true });

    if (!context.payload.pull_request) {
      throw new Error(
        "Payload doesn't contain `pull_request`. Make sure this Action is being triggered by a pull_request event (https://help.github.com/en/articles/events-that-trigger-workflows#pull-request-event-pull_request).",
      );
    }

    const ref: string = context.payload.pull_request.head.ref;
    const config = await getConfig(octokit, configPath, context.repo, ref, defaultConfig);
    const labelsToAdd = getLabelsToAdd(config, ref);

    if (labelsToAdd.length > 0) {
      await octokit.issues.addLabels({
        ...context.repo,
        issue_number: context.payload.pull_request.number,
        labels: labelsToAdd,
      });
    }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'test') {
      throw error;
    }

    core.error(error);
    core.setFailed(error.message);
  }
}

function getLabelsToAdd(config: Config, branchName: string): string[] {
  const labelsToAdd: string[] = [];

  for (const label in config) {
    const matches = matcher(branchName, config[label]);

    if (matches.length > 0) {
      labelsToAdd.push(label);
    }
  }

  return labelsToAdd;
}

export default action;
