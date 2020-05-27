import * as crypto from 'crypto';
import { Action, PullRequestInformation } from "./types";
import { IPullRequestStore, IPullRequestState } from './store';
import { executeActionsUNSAFE, updateBranch } from './github';

export async function performGitHubActions(actions: Action[], pullRequest: PullRequestInformation, store: IPullRequestStore) {
  const state = await store.accessPullRequestState(pullRequest);

  let actionsToPerform = actions.filter(a => canPerformAction(a, pullRequest, state));

  // Is this a merge-from-base request? We'll only sync one PR at a time, all merges
  // except one are going to be wasted anyway.
  if (actionsToPerform.find(isMergeFromBaseAction)) {
    await store.enqueueMerge(pullRequest);
  }

  const mergeHead = await store.checkHeadOfQueue(pullRequest);
  if (!mergeHead) {
    actionsToPerform = actionsToPerform.filter(a => !isMergeFromBaseAction(a));
  }

  executeActionsUNSAFE(actionsToPerform, pullRequest);

  const newPrStates = actions.filter(shouldStoreActionState).map(actionHash);
  await state.replaceActions(newPrStates);

  // Dequeue this PR from the merge-from-base queue if it's in there (obviously)
  // and nothing about the PR's merge state would have prevented it from
  // having been merged.
  //
  // If it could have been merged but our actions didn't, we should dequeue it
  // and focus our attention on the next element of the queue.
  if (mergeHead && !waitingForCommitStatuses(pullRequest)) {
    const nextPr = await mergeHead.dequeue();
    if (nextPr) {
      // Trigger the merge-back on the next PR. This will lead to another 'sync'
      // event and a follow-up handling of the PR then.
      await updateBranch(nextPr.owner, nextPr.repo, nextPr.number, nextPr.expectedSha);
    }
  }
}

function canPerformAction(action: Action, pullRequest: PullRequestInformation, state: IPullRequestState) {
  const hash = actionHash(action);

  switch (action.action) {
    case 'add_label': return !(pullRequest.labels ?? []).includes(action.label);
    case 'remove_label': return (pullRequest.labels ?? []).includes(action.label);
    // Need to use "previous action" check because we can't know which of the
    // approvers we are ourselves.
    case 'approve': return !state.hasAction(hash);
    case 'comment': return !state.hasAction(hash);
    case 'dismiss_approvals': return (pullRequest.reviews ?? []).some(r => r.state === 'approved');
    case 'merge_from_base': return pullRequest.mergeStateStatus === 'behind';
    case 'merge': return pullRequest.mergeable;
  }

  return false;
}

export function shouldStoreActionState(action: Action) {
  return action.action === 'approve' || action.action === 'comment';
}

export function actionHash(action: Action) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(action));
  return hash.digest().toString('hex');
}

function isMergeFromBaseAction(action: Action) {
  return action.action === 'merge_from_base';
}

function waitingForCommitStatuses(pullRequest: PullRequestInformation) {
  // Only status in which we're waiting.
  return pullRequest.mergeStateStatus === 'blocked';
}