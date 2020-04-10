import * as fs from 'fs';
import * as pl from 'tau-prolog';

/**
 * Helper factory functions
 */
namespace prolog {
  export function rule(id: string, args: pl.type.Atom[], ...rules: pl.type.Term[]) {
    let body;
    if (rules.length === 0) {
      body = null
    } else  {
      // , has an arity of 2, so we must recursively pack up the remaining terms
      // Need to pack up from the rear...
      while (rules.length > 1) {
        rules.splice(rules.length - 2, 2,
          new pl.type.Term(',', [rules[rules.length - 2], rules[rules.length - 1]]));
      }

      body = rules[0];
    }

    return new pl.type.Rule(new pl.type.Term(id, args), body);
  }

  export function term(id: string, ...args: pl.type.Atom[]) {
    return new pl.type.Term(id, args);
  }

  export function v(id: string) {
    return new pl.type.Var(id);
  }

  export function X() {
    return v('X');
  }
}

const session = pl.create();

// Facts about the PR
session.add_rule(prolog.rule('label', [prolog.term('contribution/core')]));
session.add_rule(prolog.rule('label', [prolog.term('poop')]));
session.add_rule(prolog.rule('author', [prolog.term('rix0rrr')]));
session.add_rule(prolog.rule('base', [prolog.term('master')]));
session.add_rule(prolog.rule('title', [prolog.term('Gave PR he')]));
session.add_rule(prolog.rule('status', [prolog.term('open')]));
session.add_rule(prolog.rule('checks_passed', []));

// Add a 'not' rule as an alias for \+, can't explain that to anyone.
// not(X) :- call(X), !, fail.
// not(_).
session.add_rule(prolog.rule('not', [prolog.X()],
  prolog.term('call', prolog.X()),
  prolog.term('!'),
  prolog.term('fail')));
session.add_rule(prolog.rule('not', [prolog.v('_')]));

const parsed = session.consult(fs.readFileSync('config.prolog', { encoding: 'utf-8' }));
if (parsed !== true) {
  console.log('Error parsing', parsed.toString());
  process.exit(1);
}

console.log('Query', process.argv[2]);
const queried = session.query(process.argv[2]);
if (queried !== true) {
  console.log(queried.toString());
  process.exit(1);
}

session.answers(x => x && console.log(pl.format_answer(x)));

