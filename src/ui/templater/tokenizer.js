

export const TokenTypes = {
    START_BRACKET: 'start_bracket',
    END_BRACKET: 'end_bracket',
    TERM: 'term',
    STRING: 'string',
    NUMBER: 'number',
    OPERATOR: 'operator',
    WHITESPACE: 'whitespace',
};

function isLetter(c) {
    return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || c === '_';
}

function isDigit(c) {
    return '0' <= c && c <= '9';
}

function isPartOfNumber(c) {
    return isDigit(c) || c === '.';
}

function isWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n';
}


const singleCharTokens = new Map(Object.entries({
    '(': {t: TokenTypes.START_BRACKET},
    ')': {t: TokenTypes.END_BRACKET},
    '+': {t: TokenTypes.OPERATOR, v: '+'},
    '-': {t: TokenTypes.OPERATOR, v: '-'},
    '*': {t: TokenTypes.OPERATOR, v: '*'},
    '/': {t: TokenTypes.OPERATOR, v: '/'},
    '%': {t: TokenTypes.OPERATOR, v: '%'},
    '<': {t: TokenTypes.OPERATOR, v: '<'},
    '>': {t: TokenTypes.OPERATOR, v: '>'},
}));

const doubleCharTokens = new Map(Object.entries({
    '==': {t: TokenTypes.OPERATOR, v: '=='},
    '!=': {t: TokenTypes.OPERATOR, v: '!='},
    '||': {t: TokenTypes.OPERATOR, v: '||'},
    '&&': {t: TokenTypes.OPERATOR, v: '&&'},
    '<=': {t: TokenTypes.OPERATOR, v: '<='},
    '>=': {t: TokenTypes.OPERATOR, v: '>='},
}));


const stringEscapeSymbols = new Map(Object.entries({
    '\\': '\\',
    't': '\t',
    'n': '\n',
    '"': '"',
    '\'': '\''
}));

class Scanner {
    constructor(text) {
        this.idx = 0;
        this.text = text;
    }

    scanToken() {
        if (this.idx >= this.text.length) {
            return null;
        }

        const c = this.text[this.idx];

        if (isLetter(c)) {
            return this.scanTerm();
        } else if (isPartOfNumber(c)) {
            return this.scanNumber();
        } else if (isWhitespace(c)) {
            return this.scanWhitespace();
        } else if (c === '"' || c === '\'') {
            this.idx++;
            return this.scanString(c);
        } else {
            if (this.idx < this.text.length - 1) {
                const cc = this.text.substring(this.idx, this.idx + 2);
                if (doubleCharTokens.has(cc)) {
                    this.idx+=2;
                    return doubleCharTokens.get(cc);
                }
            }

            if (singleCharTokens.has(c)) {
                this.idx++;
                return singleCharTokens.get(c);
            }
            throw new Error('Invalid symbol: ' + c);
        }
    }


    scanTerm() {
        let term = '';
        for (let i = this.idx; i < this.text.length; i++) {
            const c = this.text[i];
            if (isLetter(c) || isDigit(c)) {
                term += c;
                this.idx = i+1;
            } else {
                break;
            }
        }
        return {
            t: TokenTypes.TERM,
            v: term
        };
    }

    scanNumber() {
        let numberText = '';
        let hasDotAlready = false;

        for (let i = this.idx; i < this.text.length; i++) {
            const c = this.text[i];
            if (isDigit(c)) {
                numberText += c;
                this.idx = i + 1;
            } else if (c === '.') {
                if (hasDotAlready) {
                    break;
                }

                hasDotAlready = true;
                numberText += c;
                this.idx = i + 1;
            } else {
                break;
            }
        }

        return {
            t: TokenTypes.NUMBER,
            v: parseFloat(numberText)
        };
    }

    scanWhitespace() {
        for (let i = this.idx; i < this.text.length; i++) {
            const c = this.text[i];
            if (isWhitespace(c)) {
                this.idx = i + 1;
            } else {
                break;
            }
        }
        return {t: TokenTypes.WHITESPACE};
    }

    scanString(breakChar) {
        let str = '';
        while(this.idx < this.text.length) {
            const c = this.text[this.idx];

            if (c === breakChar) {
                this.idx++;
                return {t: 'string', v: str};
            }

            if (c === '\\') {
                if (this.idx < this.text.length - 1) {
                    const n = this.text[this.idx+1];
                    if (stringEscapeSymbols.has(n)) {
                        str += stringEscapeSymbols.get(n);
                    } else {
                        throw new Error(`Unknown escape symbol: ${n}`);
                    }
                    this.idx++
                } else {
                    throw new Error('Invalid use of escape symbol in string');
                }
            } else {
                str += c;
            }
            this.idx++;
        }

        throw new Error('Unterminated string: ' + str);
    }
}


export function tokenizeExpression(text) {
    const scanner = new Scanner(text);

    const tokens = [];
    let token = scanner.scanToken();
    while(token) {
        tokens.push(token);
        token = scanner.scanToken();
    }

    return tokens.filter(token => token.t !== TokenTypes.WHITESPACE);
}
