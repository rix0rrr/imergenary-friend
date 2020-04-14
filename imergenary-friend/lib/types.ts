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

/**
 * Information we have on the pull request
 */
export interface PullRequestInformation {
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
  labels?: string[];
  checks?: PullRequestCheck[];
  statuses?: CommitStatus[];
  reviews?: PullRequestReview[];
}

export type TriggerEvent = {};

export type CheckRunCompleted = {
  event: 'check_run';
  action: 'completed';
  conclusion: string;
};

export type PullRequestLabeled = {
  event: 'pull_request';
  action: 'labeled' | 'unlabeled';
  label: string;
  sender: string;
};

export type PullRequestOpened = {
  event: 'pull_request';
  action: 'opened';
  label: string;
  sender: string;
};

export type CommitPushed = {
  event: 'pull_request';
  action: 'opened';
  label: string;
  sender: string;
};