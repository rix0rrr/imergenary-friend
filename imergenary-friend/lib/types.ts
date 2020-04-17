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

export interface PullRequestIdentifier {
  owner: string;
  repo: string;
  number: number;
}

export type TriggerEvent = {};

export type ChecksCompleted = {
  event: 'check_run' | 'check_suite';
  action: 'completed';
  conclusion: string;
  pullRequest: PullRequestIdentifier;
};

export type PullRequestLabeled = {
  event: 'pull_request';
  action: 'labeled' | 'unlabeled';
  label: string;
  sender: string;
  pullRequest: PullRequestIdentifier;
};

export type PullRequestOpened = {
  event: 'pull_request';
  action: 'opened' | 'reopened';
  sender: string;
  pullRequest: PullRequestIdentifier;
};

export type PullRequestEdited = {
  event: 'pull_request';
  action: 'edited';
  sender: string;
  pullRequest: PullRequestIdentifier;
};

export type PullRequestSynchronized = {
  event: 'pull_request';
  action: 'synchronize';
  sender: string;
  pullRequest: PullRequestIdentifier;
};

export type PullRequestReviewRequested = {
  event: 'pull_request';
  action: 'review_requested';
  sender: string;
  pullRequest: PullRequestIdentifier;
};

export type PullRequestReviewSubmitted = {
  event: 'pull_request_review';
  action: 'submitted';
  pullRequest: PullRequestIdentifier;
};

export type CommitPushed = {
  event: 'pull_request';
  action: 'opened';
  label: string;
  sender: string;
};