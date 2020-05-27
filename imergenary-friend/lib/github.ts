import { PullRequestInformation, TriggerEvent, Action } from "./types";
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

export function graphqlQuery(query: string) {
 return octokit().graphql(query, {
    headers: {
      // Use preview API
      accept: 'application/vnd.github.merge-info-preview+json,application/vnd.github.antiope-preview+json',
      authorization: `token ${process.env.GITHUB_TOKEN}`
    }
  });
}

export async function getPullRequestInformation(owner: string, repo: string, pull_number: number): Promise<PullRequestInformation> {
  // Get what we can from the GraphQL query. GraphQL support for
  // status queries is currently broken, so we fall back to the old API
  // for those.
 const response = await graphqlQuery(
    `{
      repository(name: "${repo}", owner: "${owner}") {
        pullRequest(number: ${pull_number}) {
          ${PULL_REQUEST_QUERY}
        }
      }
    }`);

  const { repository: { pullRequest } } = response as any;

  return pullRequestInfoFromQuery(owner, repo, pullRequest);
}

async function pullRequestInfoFromQuery(owner: string, repo: string, pullRequest: any): Promise<PullRequestInformation> {
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
    repository: { owner, repo },
    nodeId: pullRequest.id,
    number: pullRequest.number,
    state: pullRequest.state?.toLowerCase(),
    locked: pullRequest.locked,
    title: pullRequest.title,
    body: pullRequest.body,
    author: pullRequest.author?.login,
    draft: pullRequest.isDraft,
    base: pullRequest.baseRefName,
    head: pullRequest.headRefName,
    headOid: pullRequest.headRefOid,
    authorAssociation: pullRequest.authorAssociation?.toLowerCase(),
    merged: pullRequest.merged,
    mergeable: pullRequest.mergeable?.toLowerCase() === 'mergeable',
    rebaseable: pullRequest.canBeRebased,
    mergeStateStatus: pullRequest.mergeStateStatus?.toLowerCase(),
    maintainerCanModify: pullRequest.maintainerCanModify,
    requestedReviewers: pullRequest.reviewRequests.nodes.map((r: any) => r.login).filter((x: any) => x !== undefined),
    requestedTeams: pullRequest.reviewRequests.nodes.map((r: any) => r.name).filter((x: any) => x !== undefined),
    labels: pullRequest.labels.nodes.map((l: any) => l.name),
    checks: checks.check_runs.map(c => ({ name: c.name, conclusion: c.conclusion as any ?? 'pending' })),
    statuses: Object.entries(uniqueStatuses).map(([context, state]) => ({context, state: state as any })),
    reviews: pullRequest.reviews.nodes
      .filter((r: any) => ['APPROVED', 'CHANGES_REQUESTED'].includes(r.state))
      .map((r: any) => ({ nodeId: r.id, reviewer: r.author.login, state: r.state.toLowerCase() }))
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
  id,
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
    id,
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

interface Query {
  lookup?: Record<string, string>;
  modifications?: string[];
  updateBranch?: boolean;
}

export async function executeActionsUNSAFE(actions: Action[], pullRequest: PullRequestInformation) {
  if (actions.length === 0) { return; }
  const queries = actions.map(a => queryFromAction(a, pullRequest)).reduce(mergeQueries);

  let modifications = [...queries.modifications || []];
  if (queries.lookup) {
    const lookups = await performLookups(queries.lookup, pullRequest);
    for (const [id, value] of Object.entries(lookups)) {
      modifications = replacePlaceholder(id, value, modifications);
    }
  }

  if (modifications.length > 0) {
    await graphqlQuery(`mutation ApplyChanges {
      repository(name: "${pullRequest.repository.repo}", owner: "${pullRequest.repository.owner}") {
        ${modifications.join('\n')}
      }
    }`);
  }

  // Unfortunately I don't know the GraphQL command for this, so
  // do it via the *old* API
  if (queries.updateBranch) {
    await updateBranch(
      pullRequest.repository.owner,
      pullRequest.repository.repo,
      pullRequest.number,
      pullRequest.headOid,
    );
  }
}

export async function updateBranch(owner: string, repo: string, number: number, expectedSha: string) {
  await octokit().pulls.updateBranch({
    owner: owner,
    repo: repo,
    pull_number: number,
    expected_head_sha: expectedSha,
  })
}

function mergeQueries(a: Query, b: Query): Query {
  let n = Object.keys(a.lookup ?? {}).length + 1;

  const lookup: Record<string, string> = { ...a.lookup };
  let bModifications = [...b.modifications ?? []];
  for (const [key, query] of Object.entries(b.lookup ?? {})) {
    const [id, field] = key.split(':');
    const newId = `$Q${n++}`;
    lookup[`${newId}:${field}`] = query;
    bModifications = replacePlaceholder(id, newId, bModifications);
  }

  return {
    lookup: lookup,
    modifications: (a.modifications ?? []).concat(bModifications),
    updateBranch: a.updateBranch || b.updateBranch,
  };
}

function replacePlaceholder(placeholder: string, value: string, s: string): string;
function replacePlaceholder(placeholder: string, value: string, s: string[]): string[];
function replacePlaceholder(placeholder: string, value: string, s: string | string[]): string | string[] {
  if (typeof s === 'string') {
    return s.replace(new RegExp(`"${placeholder}"`, 'g'), `"${value}"`)
  } else {
    return s.map(x => replacePlaceholder(placeholder, value, x));
  }
}

function queryFromAction(action: Action, pullRequest: PullRequestInformation): Query {
  switch (action.action) {
    case 'add_label':
      // FIXME: Lookup Label IDs
      return {
        lookup: { '$LABELID:id': `label(name: "${gqlesc(action.label)}") { id }` },
        modifications: [gqlMutation('addLabelsToLabelable', {
          labelIds: ['$LABELID'],
          labelableId: pullRequest.nodeId,
        })]
      };
    case 'remove_label':
      // FIXME: Lookup Label IDs
      return {
        lookup: { '$LABELID:id': `label(name: "${gqlesc(action.label)}") { id }` },
        modifications: [gqlMutation(`removeLabelsToLabelable`, {
          labelIds: ['$LABELID'],
          labelableId: pullRequest.nodeId
        })]
      };
    case 'approve':
      return {
        modifications: [gqlMutation(`addPullRequestReview`, {
          pullRequestId: pullRequest.nodeId,
          event: "APPROVE",
          body: action.approvalComment || undefined,
        })]
      };
    case 'comment':
      return {
        modifications: [gqlMutation(`addComment`, {
          subjectId: pullRequest.nodeId,
          body: action.comment
        })],
      };
    case 'dismiss_approvals':
      const ids = (pullRequest.reviews ?? []).filter(r => r.state === 'approved').map(r => r.nodeId);
      return {
        modifications: ids.map(id => gqlMutation(`dismissPullRequestReview`, {
          pullRequestReviewId: id,
          message: action.reason || 'Dismissed'
        }))
      };
    case 'merge_from_base':
      return {
        // Completely nonobvious to me how to do this via GraphQL API
        updateBranch: true,
      };
    case 'merge':
      return {
        modifications: [gqlMutation(`mergePullRequest`, {
          pullRequestId: pullRequest.nodeId,
          commitBody: action.commitBody || undefined,
          commitHeadline: action.commitTitle || undefined,
          expectedHeadOid: pullRequest.headOid,
          mergeMethod: action.type === 'merge' ? 'MERGE' : 'SQUASH'
        })]
      };
    case 'unknown':
      return {};
  }
}

function gqlMutation(method: string, input: Record<string, string | string[] | undefined>) {
  const args = Object.entries(input)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${render(v!)}`);
  return `${method}(input: { ${args.join(', ')} }) { clientMutationId }`;

  function render(x: string | string[]): string {
    if (typeof x === 'string') {
      return `"${gqlesc(x)}"`;
    } else {
      return `[${x.map(render)}]`;
    }
  }
}

function gqlesc(x: string) {
  return x.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function performLookups(lookups: Record<string, string>, pullRequest: PullRequestInformation): Promise<Record<string, string>> {
  const keyFromAlias: Record<string, string> = {};
  const queries = [];
  for (const [key,  query] of Object.entries(lookups)) {
    const alias: string = `query${queries.length + 1}`;
    keyFromAlias[alias] = key;
    queries.push(`${alias}: ${query}`);
  }

  if (queries.length === 0) { return {}; }

  const response = await graphqlQuery(`{
    repository(name: "${pullRequest.repository.repo}", owner: "${pullRequest.repository.owner}") {
      ${queries.join('\n')}
    }
  }`);

  const { repository: results } = response as any;
  const ret: Record<string, string> = {};
  for (const [alias, key] of Object.entries(keyFromAlias)) {
    const [id, field] = key.split(':');
    ret[id] = results[alias][field];
  }
  return ret;
}
