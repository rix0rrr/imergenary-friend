import { PullRequestInformation } from "./types";
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : undefined,
  userAgent: 'imergenary-friend',
});

export async function getPullRequestInformation(options: { owner: string, repo: string, pull_number: number }): Promise<PullRequestInformation> {
  // Get what we can from the GraphQL query. GraphQL support for
  // status queries is currently broken, so we fall back to the old API
  // for those.
 const response = await octokit.graphql(
    `{
      repository(name: "${options.repo}", owner: "${options.owner}") {
        pullRequest(number: ${options.pull_number}) {
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
        }
      }
    }`
    /*
    `
    {
      repository(name: "aws-cdk", owner: "aws") {
        ref(qualifiedName: "master") {
          target {
            ... on Commit {
              id
              history(first: 5) {
                nodes {
                  id
                  associatedPullRequests(first: 10) {
                    edges {
                      node {
                        title
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ` */, {
    headers: {
      // Use preview API
      accept: 'application/vnd.github.merge-info-preview+json,application/vnd.github.antiope-preview+json ',
      authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  });

  const { repository: { pullRequest, pullRequest: { headRefOid } } } = response as any;

  // commit statuses and check runs are apparently 2 different things :(
  const { data: checks } = await octokit.checks.listForRef({
    ...options,
    ref: headRefOid
  });

  const { data: statuses } = await octokit.repos.listStatusesForRef({
    ...options,
    ref: headRefOid,
  });

  // We might get multiple reports of the same status
  statuses.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  const uniqueStatuses: Record<string, string> = {};
  for (const status of statuses) {
    uniqueStatuses[status.context] = status.state;
  }

  return {
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