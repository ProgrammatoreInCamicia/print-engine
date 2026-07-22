import { Json } from "./contract";

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
                return this.parsePostFix({ k: 'root', name: tok.v });
            case 'ident':
                this.next();
                const newTok = this.peek();
                if (newTok.t == 'lparen') {
                    // function call 
                    this.next();
                    return this.parseCall(tok.v);
                } else {
                    // it's like root
                    return this.parsePostFix({
                        k: 'member', obj: { k: 'root', name: '$'},
                        name: tok.v
                    });
                }
            default:
                throw new Error(`unexpected token: ${tok.t}`);
        }
    }

    parsePostFix(base: Ast): Ast {
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