% vim:filetype=prolog:

% People who are core team members
core_member('rix0rrr').
core_member('RomainMuller').
core_member('eladb').

% Shortcut for dependabot PRs
is_dependabot_pr :- pr_author('dependabot[bot]').
is_dependabot_pr :- pr_author('dependabot-preview[bot]').

% Let's make sure the butcher doesn't get to approve their own meat.
approved_by_anyone_except(X) :- pr_review(Y, approved), X \= Y.

% Label Core
action(add_label('contribution/core')) :-
    pr_author(A), core_member(A),
    not(pr_label('contribution/core2')).

% Merging
action(post_comment('Thank you for contributing! Your pull request will be updated from master and then merged automatically (do not update manually, and be sure to [allow changes to be pushed to your fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork)).')) :-
    ready_to_merge.

action(squash_merge(X)) :-
    safe_to_merge,
    not(pr_label('pr/no-squash')),
    commit_message(X).

action(merge(X)) :-
    safe_to_merge,
    pr_label('pr/no-squash'),
    commit_message(X).

action(sync_with_base) :-
    ready_to_merge,
    not(safe_to_merge),
    not(is_dependabot_pr).

ready_to_merge :-
    pr_state(open),
    pr_base(master),
    not(pr_label('pr/blocked')), not(pr_label('pr/do-not-merge')),
    not(is_dependabot_pr),
    not(pr_draft),
    not(pr_review(_, changes_requested)),
    pr_author(A), approved_by_anyone_except(A),
    checks_passed.

safe_to_merge :-
    ready_to_merge,
    pr_mergeable_state(clean).

commit_message('Merge it!').

% Dismiss stale approvals
action(dismiss_approvals) :-
    pr_state(open),
    not(is_dependabot_pr).
% event_actor(A), not(core_member(A)).

