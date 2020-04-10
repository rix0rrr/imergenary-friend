import * as pl from 'tau-prolog';

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
