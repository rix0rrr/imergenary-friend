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

  // We might get multiple reports of the same status
  statuses.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const uniqueStatuses: Record<string, string> = {};
  for (const status of statuses) {
    uniqueStatuses[status.context] = status.state;
  }

  return {
    state: pullRequest.state,
    locked: pullRequest.locked,
    title: pullRequest.title,
    body: pullRequest.body,
    author: pullRequest.user.login,
    draft: pullRequest.draft,
    base: pullRequest.base.ref,
    head: pullRequest.head.ref,
    authorAssociation: pullRequest.author_association.toLowerCase(),
    merged: pullRequest.merged,
    mergeable: pullRequest.mergeable,
    rebaseable: pullRequest.rebaseable,
    mergeableState: pullRequest.mergeable_state,
    maintainerCanModify: pullRequest.maintainer_can_modify,
    labels: pullRequest.labels.map(l => l.name),
    checks: checks.check_runs.map(c => ({ name: c.name, conclusion: c.conclusion ?? 'pending' })),
    statuses: Object.entries(uniqueStatuses).map(([context, state]) => ({context, state })),
    reviews: reviews
      .filter(r => ['APPROVED', 'CHANGES_REQUESTED'].includes(r.state))
      .map(r => ({ reviewer: r.user.login, state: r.state.toLowerCase() }))
  };
}