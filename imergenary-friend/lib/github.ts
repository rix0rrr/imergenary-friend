import { PullRequestInformation } from "./types";
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
  userAgent: 'imergenary-friend',
});

export async function getPullRequestInformation(options: { owner: string, repo: string, pull_number: number }): Promise<PullRequestInformation> {
  const { data: pullRequest } = await octokit.pulls.get({
    ...options,
  });

  // commit statuses and check runs are apparently 2 different things :(
  const { data: checks } = await octokit.checks.listForRef({
    ...options,
    ref: pullRequest.head.sha,
  });

  const { data: statuses } = await octokit.repos.listStatusesForRef({
    ...options,
    ref: pullRequest.head.sha,
  });

  const { data: reviews } = await octokit.pulls.listReviews({
    ...options
  });

  return { pullRequest, checks, statuses, reviews };
}