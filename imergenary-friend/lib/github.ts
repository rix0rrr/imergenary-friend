import { PullRequestInformation, TriggerEvent } from "./types";
import { Octokit } from '@octokit/rest';

let _octokit: Octokit;
function octokit() {
  if (!_octokit) {
    _octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
      userAgent: 'imergenary-friend',
    });
  }
  return _octokit;
}


export async function getPullRequestInformation(owner: string, repo: string, pull_number: number): Promise<PullRequestInformation> {
  // Get what we can from the GraphQL query. GraphQL support for
  // status queries is currently broken, so we fall back to the old API
  // for those.
 const response = await octokit().graphql(
    `{
      repository(name: "${repo}", owner: "${owner}") {
        pullRequest(number: ${pull_number}) {
          ${PULL_REQUEST_QUERY}
        }
      }
    }`, {
    headers: {
      // Use preview API
      accept: 'application/vnd.github.merge-info-preview+json,application/vnd.github.antiope-preview+json',
      authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  });

  const { repository: { pullRequest } } = response as any;

  return pullRequestInfoFromQuery(owner, repo, pullRequest);
}

async function pullRequestInfoFromQuery(owner: string, repo: string, pullRequest: any) {
  // commit statuses and check runs are apparently 2 different things :(
  const { data: checks } = await octokit().checks.listForRef({
    owner, repo,
    ref: pullRequest.headRefOid
  });

  const { data: statuses } = await octokit().repos.listStatusesForRef({
    owner, repo,
    ref: pullRequest.headRefOid,
  });

  // We might get multiple reports of the same status
  statuses.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const uniqueStatuses: Record<string, string> = {};
  for (const status of statuses) {
    uniqueStatuses[status.context] = status.state;
  }

  return {
    number: pullRequest.number,
    state: pullRequest.state?.toLowerCase(),
    locked: pullRequest.locked,
    title: pullRequest.title,
    body: pullRequest.body,
    author: pullRequest.author?.login,
    draft: pullRequest.isDraft,
    base: pullRequest.baseRefName,
    head: pullRequest.headRefName,
    authorAssociation: pullRequest.authorAssociation?.toLowerCase(),
    merged: pullRequest.merged,
    mergeable: pullRequest.mergeable?.toLowerCase(),
    rebaseable: pullRequest.canBeRebased,
    mergeableState: pullRequest.mergeableStateStatus?.toLowerCase(),
    maintainerCanModify: pullRequest.maintainerCanModify,
    requestedReviewers: pullRequest.reviewRequests.nodes.map((r: any) => r.login).filter((x: any) => x !== undefined),
    requestedTeams: pullRequest.reviewRequests.nodes.map((r: any) => r.name).filter((x: any) => x !== undefined),
    labels: pullRequest.labels.nodes.map((l: any) => l.name),
    checks: checks.check_runs.map(c => ({ name: c.name, conclusion: c.conclusion ?? 'pending' })),
    statuses: Object.entries(uniqueStatuses).map(([context, state]) => ({context, state })),
    reviews: pullRequest.reviews.nodes
      .filter((r: any) => ['APPROVED', 'CHANGES_REQUESTED'].includes(r.state))
      .map((r: any) => ({ reviewer: r.author.login, state: r.state.toLowerCase() }))
  };
}

/**
 * Find pull requests whose HEAD is equal to the given commit SHA
 *
 * We can find the commit for a PR in other places:
 * - Might be an older commit
 * - Might be the merge commit that merges the PR into master
 *
 * But in those cases, we don't really care about the status.
 */
export async function findPullRequestsFromHead(owner: string, repo: string, commitSha: string): Promise<PullRequestInformation[]> {
  const response = await octokit().graphql(`{
    repository(name: "${repo}", owner: "${owner}") {
      object(oid: "${commitSha}") { ...on Commit {
        associatedPullRequests(first: 100) {
          nodes {
            number
            ${PULL_REQUEST_QUERY}
          }
        }
      }}
    }
  }`, {
    headers: {
      accept: 'application/vnd.github.merge-info-preview+json,application/vnd.github.antiope-preview+json',
      authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  });

  const { repository: { object: { associatedPullRequests } } } = response as any;

  const ret: PullRequestInformation[] = [];
  for (const pr of associatedPullRequests.nodes) {
    if (pr.headRefOid === commitSha) {
      ret.push(await pullRequestInfoFromQuery(owner, repo, pr));
    }
  }
  return ret;
}

const PULL_REQUEST_QUERY =
`
  state, locked, title, body,
  author { login },
  isDraft,
  baseRefName,
  headRefName,
  headRefOid,
  authorAssociation,
  merged,
  mergeable,
  maintainerCanModify,
  canBeRebased,
  mergeStateStatus,
  reviewRequests(first: 100) { nodes { requestedReviewer {
    ...on Actor { login },
    ...on Team { name },
  }}},
  reviews(first: 100) { nodes {
    state,
    author { ...on Actor { login } }
  }},
  labels(first: 100) { nodes { name } },
`;

export function parseEvent(eventType: string, event: any): TriggerEvent[] {
  const repository =  {
    repo: event?.repository?.name,
    owner: event?.repository?.owner?.login,
  };

  switch (eventType) {
    case 'status':
      if (event.state === 'success' || event.state === 'failure' || event.state === 'error') {
        return [{
          event: 'status',
          state: event.state,
          repository,
          sha: event.sha,
          context: event.context,
        }];
      }
      break;
    case 'check_run':
      if (event.action === 'completed') {
        return event.check_run.check_suite.pull_requests.map((pr: any) => ({
          event: eventType,
          action: 'completed',
          conclusion: event.check_run.conclusion,
          repository,
          pullNumber: pr.number,
        }));
      }
      break;
    case 'check_suite':
      if (event.action === 'completed') {
        return event.check_suite.pull_requests.map((pr: any) => ({
          event: eventType,
          action: 'completed',
          conclusion: event.check_suite.conclusion,
          repository,
          pullNumber: pr.number,
        }));
      }
      break;
    case 'pull_request':
      return [{
        event: eventType,
        action: event.action,
        repository,
        sender: event.sender.login,
        pullNumber: event.number,
      }];
    case 'pull_request_review':
      if (event.action === 'submitted') {
        return [{
          event: eventType,
          action: event.action,
          repository,
          pullNumber: event.pull_request.number,
        }];
      }
      break;
  }
  return [];
}