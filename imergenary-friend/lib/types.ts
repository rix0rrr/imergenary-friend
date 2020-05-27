/**
 * Information we have on the pull request
 */
export interface PullRequestInformation {
  repository: Repository;
  nodeId: string; // GraphQL node id
  number: number;
  state: 'closed' | 'merged' | 'open';
  locked: boolean;
  title: string;
  body: string;
  author: string;
  draft: boolean;
  base: string;
  head: string;
  headOid: string;
  authorAssociation: 'collaborator' | 'contributor' | 'first_timer' | 'first_time_contributor' | 'member' | 'none' | 'owner';
  merged: boolean;

  /**
   * Whether a merge would lead to merge conflicts
   */
  mergeable: boolean;

  /**
   * Whether a rebase would lead to merge conflicts
   */
  rebaseable: boolean;

  /**
   * Most important blocker to merging
   */
  mergeStateStatus: MergeStateStatus;
  maintainerCanModify: boolean;
  requestedReviewers?: string[];
  requestedTeams?: string[];
  labels?: string[];
  checks?: PullRequestCheck[];
  statuses?: CommitStatus[];
  reviews?: PullRequestReview[];
}

export interface PullRequestCheck {
  name: string;
  conclusion: 'action_required' | 'cancelled' | 'failure' | 'neutral' | 'skipped' | 'stale' | 'success' | 'timed_out' | 'pending';
}

export interface CommitStatus {
  context: string;
  state: 'error' | 'expected' | 'failure' | 'pending' | 'success';
}

export interface PullRequestReview {
  nodeId: string;
  reviewer: string;
  state: 'approved' | 'changes_requested';
}

export interface Repository {
  owner: string;
  repo: string;
}

export interface PullRequestIdentifier {
  number: number;
}

/**
 * Events that do something to a PR that may cause it to need to be re-evaluated
 */
export type TriggerEvent = ChecksCompleted | PullRequestEvent | PullRequestReviewSubmitted | StatusFinished;

export type ChecksCompleted = {
  event: 'check_run' | 'check_suite';
  action: 'completed';
  conclusion: string;
  repository: Repository;
  pullNumber: number;
};

export type PullRequestEventAction = 'assigned' | 'unassigned' | 'review_requested' |
    'review_request_removed' | 'labeled' | 'unlabeled' | 'opened' | 'edited' |
    'closed' | 'ready_for_review' | 'locked' | 'unlocked' | 'reopened';

export type PullRequestEvent = {
  event: 'pull_request';
  action: PullRequestEventAction;
  sender: string;
  repository: Repository;
  pullNumber: number;
};

export type PullRequestReviewSubmitted = {
  event: 'pull_request_review';
  action: 'submitted';
  repository: Repository;
  pullNumber: number;
};

export type StatusFinished = {
  event: 'status';
  state: 'success' | 'failure' | 'error';
  repository: Repository;
  sha: string;
  context: string;
};

export type Action = CommentAction | AddLabelAction | RemoveLabelAction |
  MergeFromBaseAction | DismissApprovalsAction | ApproveAction | MergeAction |
  UnknownAction;

export interface CommentAction {
  action: 'comment';
  comment: string;
}

export interface AddLabelAction {
  action: 'add_label';
  label: string;
}

export interface RemoveLabelAction {
  action: 'remove_label';
  label: string;
}

export interface MergeFromBaseAction {
  action: 'merge_from_base';
}

export interface DismissApprovalsAction {
  action: 'dismiss_approvals';
  reason: string;
}

export interface UnknownAction {
  action: 'unknown';
  actionName: string;
  arguments?: string[];
}

export interface ApproveAction {
  action: 'approve';
  approvalComment: string;
}

export interface MergeAction {
  action: 'merge';
  type: 'merge' | 'squash';
  commitTitle?: string;
  commitBody?: string;
}

export type MergeStateStatus = 'behind' // Out of date with the base branch
  | 'blocked' // Not mergeable because not all tests/conditions have been met
  | 'clean'  // Ready to merge
  | 'dirty'  // Has conflicts which prevent updating with base branch
  | 'draft'  // PR is a draft so cannot be merged by definition
  | 'has_hooks'
  | 'unknown'  // Merged or otherwise unapplicable
  | 'unstable' // Mergeable with non-passing commit status.
  ;