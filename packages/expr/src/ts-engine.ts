import { EvalContext, EvalResult, ExpressionEngine, Json } from "./contract.js";

export type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ident'; v: string }
  | { t: 'root'; v: string }
  | { t: 'dot' }
  | { t: 'lparen' }
  | { t: 'rparen' }
  | { t: 'lbrack' }
  | { t: 'rbrack' }
  | { t: 'comma' }
  | { t: 'eof' };

type Ast =
  | { k: 'lit'; v: Json }
  | { k: 'root'; name: string }
  | { k: 'member'; obj: Ast; name: string }
  | { k: 'index'; obj: Ast; index: Ast }
  | { k: 'call'; name: string; args: Ast[] };

export function tokenize(src: string): Tok[] {
    const toks: Tok[] = [];
    let i = 0;
    
    while (i < src.length) {
        const c = src[i];
        if (c === undefined) {
            break;
        }
        if (c == ' ' || c == '\n' || c == '\t' || c == '\r')
        {
            i++;
            continue;
        }
        switch (c) {
            case '.':
                toks.push({t: 'dot'});
                i++;
                continue;
            case ',':
                toks.push({t: 'comma'});
                i++;
                continue;
            case '(':
                toks.push({t: 'lparen'});
                i++;
                continue;
            case ')':
                toks.push({t: 'rparen'});
                i++;
                continue;
            case '[':
                toks.push({t: 'lbrack'});
                i++;
                continue;
            case ']':
                toks.push({t: 'rbrack'});
                i++;
                continue;
            default:
                break;
        }
        // num
        if (c >= '0' && c <= '9') {
            let j = i + 1;
            while (j < src.length && isNumberChar(src[j])) {
                j++;
            }
            const value = src.slice(i, j);
            toks.push({t: 'num', v: Number(value)});
            i = j;
            continue;
        }
        // ident
        if (isIdentStart(c)) {
            let j = i + 1;
            while (j < src.length && isIdentChar(src[j]))
            {
                j++;
            }
            const value = src.slice(i, j);
            toks.push({t: 'ident', v: value});
            i = j;
            continue;
        }
        // root
        if (c == '$') {
            let j = i + 1;
            while (j < src.length && isIdentChar(src[j]))
            {
                j++;
            }
            const value = src.slice(i, j);
            toks.push({t: 'root', v: value});
            i = j;
            continue;
        }
        // string
        if (c === "'" || c === '"')
        {
            const quote = c;
            let j = i + 1;
            while (j < src.length && src[j] !== quote) {
                j++;
            }
            const value = src.slice(i + 1, j);
            toks.push({t: 'str', v: value});
            i = j + 1;
            continue;
        }
        // Every valid branch above `continue`s; reaching here means an
        // unrecognized character. Throw instead of spinning forever on the
        // same index (the ExpressionEngine boundary turns this into ok:false).
        throw new Error(`unexpected character '${c}' at position ${i}`);
    }

    toks.push({ t: 'eof' });
    return toks;
}

function isNumberChar(ch: string | undefined): boolean {
    return ch != null && (
        (ch >= '0' && ch <= '9') || 
        (ch == '.')
    );
}


function isIdentStart(ch: string | undefined): boolean {
    return ch != null && (
        (ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        (ch === '_')
    );
}

function isIdentChar(ch: string | undefined): boolean {
    return ch != null && (
        (ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        (ch >= '0' && ch <= '9') ||
        (ch === '_')
    );
}

class Parser {
    private position = 0;
    constructor(private toks: Tok[]) {}

    private peek(): Tok {
        return this.toks[this.position]!;
    }

    private next(): Tok {
        return this.toks[this.position++]!;
    }

    private expect<K extends Tok['t']>(t: K): Extract<Tok, { t: K }> {
        const tok = this.next();
        if (tok.t !== t) throw new Error(`expected ${t}, got ${tok.t}`);
        return tok as Extract<Tok, { t: K }>;
    }

    parse(): Ast {
        const ast = this.parsePrimary();
        if (this.peek().t !== 'eof') {
            throw new Error(`unexpected trailing token: ${this.peek().t}`);
        }
        return ast;
    }
    
    parsePrimary(): Ast {
        const tok = this.peek();
        switch (tok.t) {
            case 'num':
                this.next();
                return {k: 'lit', v: tok.v};
            case 'str':
                this.next();
                return { k: 'lit', v: tok.v };
            case 'root':
                this.next();
                return this.parsePostfix({ k: 'root', name: tok.v });
            case 'ident':
                this.next();
                const newTok = this.peek();
                if (newTok.t == 'lparen') {
                    // function call 
                    this.next();
                    return this.parseCall(tok.v);
                } else {
                    // it's like root
                    return this.parsePostfix({
                        k: 'member', obj: { k: 'root', name: '$'},
                        name: tok.v
                    });
                }
            default:
                throw new Error(`unexpected token: ${tok.t}`);
        }
    }

    parsePostfix(base: Ast): Ast {
        let node = base;
        while(true)
        {
            const tok = this.peek();
            if (tok.t == 'dot')
            {
                this.next();
                let nextTok = this.expect('ident');
                node = { k: 'member', obj: node, name: nextTok.v };
            } else if (tok.t == 'lbrack') {
                this.next();
                let index = this.parsePrimary();
                this.expect('rbrack');
                node = { k: 'index', obj: node, index };
            } else {
                return node;
            }
        }
    }

    parseCall(name: string): Ast {
        const callNode: Ast = {k: 'call', name, args: []};
        // i need to find all arguments
        const tok = this.peek();
        if (tok.t !== 'rparen') {
            callNode.args.push(this.parsePrimary());
            while (this.peek().t === 'comma') {
                this.next();
                callNode.args.push(this.parsePrimary());
            }
        }
        // i finish all argument, i need to check that ther's the closed parenthesis
        this.expect('rparen');
        return callNode;
    }
}

export function parse(src: string): Ast {
    return new Parser(tokenize(src)).parse();
}

function EvalAst(ast: Ast, ctx: EvalContext): Json {
    switch (ast.k) {
        case 'lit':
            return ast.v    
        case 'root':
            return resolveRoot(ast.name, ctx);
        case 'member': {
            const objVal = EvalAst(ast.obj, ctx);
            return getMember(objVal, ast.name);
        };
        case 'index': {
            const objVal = EvalAst(ast.obj, ctx);
            const indexVal = EvalAst(ast.index, ctx);
            if (Array.isArray(objVal) && typeof indexVal === 'number') {
                // array with index
                return objVal[indexVal] ?? null;
            } else if (isObject(objVal) && typeof indexVal === 'string') {
                // object with property access
                return objVal[indexVal] ?? null;
            }
            return null;
        };
        case 'call': {
            const argsVal = ast.args.map(arg => EvalAst(arg, ctx));
            return evalCall(ast.name, argsVal);
        }
        default:
            return null;
    }
}

function resolveRoot(name: string, ctx: EvalContext): Json {
    switch (name) {
        case '$group':
            return ctx.group ?? null;
        case '$item':
            return ctx.item ?? null;
        case '$page':
            return ctx.page ?? null;
        case '$':
            return ctx.root;
        default:
            return null;
    }
}

function getMember(obj: Json, name: string): Json {
    if (Array.isArray(obj)) {
        // it's an array
        return obj.map(el => getMember(el, name));
    } else if (isObject(obj)) {
        // is an object, return the value
        return obj[name] ?? null;
    } else {
        return null;
    }
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function evalCall(name: string, args: Json[]): Json {
    switch (name) {
        case 'SUM': {
            const nums = args.flatMap(a => toNumbers(a));
            return nums.reduce((x, y) => x + y, 0);
        }
        case 'COUNT': {
            const values = args.flatMap(a => Array.isArray(a) ? a : [a]);
            return values.filter(x => x != null).length;
        };
        case 'AVG': {
            const nums = args.flatMap(a => toNumbers(a));
            if (nums.length === 0) return 0;
            return nums.reduce((x, y) => x + y, 0)/nums.length;
        }
        case 'MIN': {
            const nums = args.flatMap(a => toNumbers(a));
            return nums.length ? Math.min(...nums) : null;
        }
        case 'MAX': {
            const nums = args.flatMap(a => toNumbers(a));
            return nums.length ? Math.max(...nums) : null;
        }
        case 'CONCAT':
            return args.map(v => v === null ? '' : String(v)).join('');
        default:
            break;
    }
    return null;
}

function toNumbers(v: Json): number[] {
    if (Array.isArray(v)) return v.filter((x): x is number => typeof x === 'number');
    if (typeof v === 'number') return [v];
    return [];
}

export class TsExpressionEngine implements ExpressionEngine {
    readonly kind = 'ts';

    evaluate(expression: string, ctx: EvalContext): EvalResult {
        try {
            const ast = new Parser(tokenize(expression)).parse();
            return {
                ok: true,
                value: EvalAst(ast, ctx)
            };
        } catch (e) {
            return {
                ok: false,
                error: e instanceof Error ? e.message: String(e)
            };
        }
    }
}