import * as pl from 'tau-prolog';
import * as ph from './prolog-helpers';
import { PullRequestInformation } from "./types";

export interface EvaluateOptions {
  debug?: NodeJS.WriteStream;
}

/**
 * Evaluate the given prolog program against the given Pull Request
 */
export function evaluate(pr: PullRequestInformation, program: string, options: EvaluateOptions = {}) {
  const session = pl.create();

  // Seed the session with rules
  addPrFacts(pr, session, options);
  extendRuleSet(session);

  // Evaluate the program
  const parsed = session.consult(program);
  if (parsed !== true) { throw termToError(parsed); }

  // Ask for all actions
  const queried = session.query('action(X).');
  if (queried !== true) { throw termToError(queried); }

  session.answers(x => x && console.log(pl.format_answer(x)));
}

/**
 * Turn PR data into a set of facts
 */
function addPrFacts(pr: PullRequestInformation, session: pl.type.Session, options: EvaluateOptions) {
  // Facts about the PR
  stringFact('pr_state', pr.state);
  boolFact('pr_locked', pr.locked);
  stringFact('pr_title', pr.title);
  stringFact('pr_body', pr.body);
  stringFact('pr_author', pr.author);
  boolFact('pr_draft', pr.draft);
  stringFact('pr_base', pr.base);
  stringFact('pr_head', pr.head);
  stringFact('pr_author_association', pr.authorAssociation);
  boolFact('pr_merged', pr.merged);
  boolFact('pr_mergeable', pr.mergeable);
  boolFact('pr_rebaseable', pr.rebaseable);
  stringFact('pr_mergeable_state', pr.mergeableState);
  boolFact('pr_maintainer_can_modify', pr.maintainerCanModify);

  listFact('pr_label', 1, pr.labels ?? []);
  listFact('pr_check', 2, (pr.checks ?? []).map(c => [c.name, c.conclusion]));
  listFact('pr_status', 2, (pr.statuses ?? []).map(c => [c.context, c.state]));
  listFact('pr_review', 2, (pr.reviews ?? []).map(r => [r.reviewer, r.state]));

  // Helpers
  function stringFact(factName: string, value: string) {
    addRule(ph.rule(factName, [ph.term(value)]));
  }

  function boolFact(factName: string, value: boolean) {
    if (value) {
      addRule(ph.rule(factName, []));
    } else {
      addRule(ph.rule(factName, [], ph.term('fail')));
    }
  }

  type ArityValue<A extends number> =
    A extends 1 ? string :
    A extends 2 ? [any, any] :
    A extends 3 ? [any, any, any] :
    never;

  function listFact<A extends number>(factName: string, arity: A, values: ArityValue<A>[]) {
    for (const value of values) {
      if (typeof value === 'string') {
        addRule(ph.rule(factName, [ph.term(value)]));
      } else if (Array.isArray(value)) {
        addRule(ph.rule(factName, value.map(t => ph.term(t))));
      }
    }

    // Add a 'fail' for this list if it is empty, otherwise we'll get an 'undefined' error.
    if (values.length === 0) {
      addRule(ph.rule(factName, range(arity).map(_ => ph.v('_')), ph.term('fail')));
    }
  }

  function addRule(rule: pl.type.Rule) {
    if (options.debug) {
      options.debug.write(`${rule}\n`);
    }
    session.add_rule(rule);
  }
}

/**
 * Extend the base rule set with some convenient rules
 */
function extendRuleSet(session: pl.type.Session) {
  // Add a 'not' rule. \+ is the built-in 'not', but that reads like crap.
  // Definition:  not(X) :- call(X), !, fail.
  //              not(_).
  session.add_rule(ph.rule('not', [ph.X()],
    ph.term('call', ph.X()),
    ph.term('!'),
    ph.term('fail')));
  session.add_rule(ph.rule('not', [ph.v('_')]));
}

/**
 * Translate an error term to an throwable Error
 *
 * Examples:
 * - throw(error(syntax_error('. or operator expected'), [line(1), column(2), found('Users')]))
 * - throw(error(syntax_error('. or operator expected'), [line(1), column(15), token_not_found]))
 * - throw(error(syntax_error('argument expected'), [line(7), column(75), found(')')]))
 *
 * This means 'draft/0' does not exist (found inside 'call/1')
 * - error(existence_error(procedure, '/'(draft, 0)), '/'(call, 1))
 *
 */
function termToError(term: pl.type.Term) {
  if (term.id !== 'throw') { return new Error(term.toString()); }
  // FIXME: Do properly at some point
  console.log((term as any).__constructor__);
  return new Error(term.toString());
}

function range(n: number) {
  const ret: number[] = [];
  for (let i = 0; i < n; i++) {
    ret.push(i);
  }
  return ret;
}