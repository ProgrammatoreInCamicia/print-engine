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