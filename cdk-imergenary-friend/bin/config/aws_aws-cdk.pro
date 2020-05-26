% vim:filetype=prolog:

% People who are core team members
core_member('rix0rrr').
core_member('RomainMuller').
core_member('eladb').
core_member('nija-at').
core_member('shivlaks').
core_member('skinny85').
core_member('MrArnoldPalmer').
core_member('NetaNir').
core_member('iliapolo').
core_member('NGL321').
core_member('SomayaB').

% Need this to auto-approve Dependabot.
core_member('imergenary-friend').

% Shortcut for dependabot PRs
is_dependabot_pr :- pr_author('dependabot[bot]').
is_dependabot_pr :- pr_author('dependabot-preview[bot]').

% Let's make sure the butcher doesn't get to approve their own meat.
approved_by_core_member_except(X) :- pr_review(Y, approved), core_member(Y), X \= Y.

% ACTION: Label Core PRs
action(add_label('contribution/core')) :-
    pr_author(A), core_member(A),
    not(pr_label('contribution/core')).

% ACTION: Comment with a happy note if the PR got approved.
action(post_comment('Thank you for contributing! Your pull request will be updated from master and then merged automatically (do not update manually, and be sure to [allow changes to be pushed to your fork](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork)).')) :-
    not(is_dependabot_pr),
    approved_for_merging.

% ACTION: Different happy note if it's dependabot submitting.
action(post_comment('Thanks dependabot! <3')) :-
    is_dependabot_pr,
    approved_for_merging.

% ACTION: Squash merge if we can and nobody said we couldn't.
action(squash(T, B)) :-
    ready_to_merge,
    not(pr_label('pr/no-squash')),
    pr_title(T),
    commit_message_from_pr_body(B).

% ACTION: Regular-merge if we can and we were told not to squash.
action(merge(T, B)) :-
    ready_to_merge,
    pr_label('pr/no-squash'),
    pr_title(T),
    commit_message_from_pr_body(B).

% ACTION: Merge-with-master if the PR state is behind, so we're sure to
% run the PR validation against the new proposed master.
action(merge_from_base) :-
    approved_for_merging,
    % We're behind and we can actually be merged.
    pr_mergeable_state(behind),
    pr_mergeable,
    % Dependabot will sync itself
    not(is_dependabot_pr).

approved_for_merging :-
    pr_state(open),
    % Labeled PRs are not ready to be merged
    % not(pr_label('pr/blocked')), not(pr_label('pr/do-not-merge')),
    % Approved by at least one person who is a core member who is not the author, and no changes requested.
    not(pr_review(_, changes_requested)),
    pr_author(A), approved_by_core_member_except(A).

ready_to_merge :-
    approved_for_merging,
    % GitHub itself says it's okay to be merged (follows branch protection)
    pr_mergeable_state(clean),
    % No merge conflicts
    pr_mergeable.

commit_message_from_pr_body('Merge it!').

% ACTION: Dismiss stale approvals if anyone except a core member added commits to the PR
action(dismiss_approvals) :-
    pr_state(open),
    % Dependabot will change the PR in flight, but we trust it.
    not(is_dependabot_pr),
    % Any non-core member causes this to trigger.
    event_change(A, synchronize), not(core_member(A)).

% ACTION: Automatically approve dependabot PRs, they will be merged using the regular
% workflow.
action(approve) :-
    pr_state(open),
    % Dependabot PR
    is_dependabot_pr,
    % Not approved yet
    not(pr_review(R, approved)).
