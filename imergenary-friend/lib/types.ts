/**
 * Information we have on the pull request
 */
export interface PullRequestInformation {
  number: number;
  state: string;
  locked: boolean;
  title: string;
  body: string;
  author: string;
  draft: boolean;
  base: string;
  head: string;
  authorAssociation: string;
  merged: boolean;
  mergeable: boolean;
  rebaseable: boolean;
  mergeableState: string;
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
  conclusion: string;
}

export interface CommitStatus {
  context: string;
  state: string;
}

export interface PullRequestReview {
  reviewer: string;
  state: string;
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

export type PullRequestAction = 'assigned' | 'unassigned' | 'review_requested' |
    'review_request_removed' | 'labeled' | 'unlabeled' | 'opened' | 'edited' |
    'closed' | 'ready_for_review' | 'locked' | 'unlocked' | 'reopened';

export type PullRequestEvent = {
  event: 'pull_request';
  action: PullRequestAction;
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
};