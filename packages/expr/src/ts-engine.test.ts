import { describe, it, expect } from 'vitest';
import { tokenize } from './ts-engine.js';

describe('tokenize', () => {
  it('tokenize an integer number', () => {
    const toks = tokenize('42');
    expect(toks).toEqual([
      { t: 'num', v: 42 },
      { t: 'eof' },
    ]);
  });

  it('tokenize a double number', () => {
    const toks = tokenize('12.5');
    expect(toks).toEqual([
      { t: 'num', v: 12.5 },
      { t: 'eof' },
    ]);
  });

  it('tokenize a symbol', () => {
    const toks = tokenize('(),[].');
    expect(toks).toEqual([
      { t: 'lparen' },
      { t: 'rparen' },
      { t: 'comma' },
      { t: 'lbrack' },
      { t: 'rbrack' },
      { t: 'dot' },
      { t: 'eof' },
    ]);
  });

  it('ignore spaces', () => {
    const toks = tokenize('  42   ');
    expect(toks).toEqual([
      { t: 'num', v: 42 },
      { t: 'eof' },
    ]);
  });
});