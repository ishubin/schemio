

export const TokenTypes = {
    START_BRACKET: 'start_bracket',
    END_BRACKET: 'end_bracket',
    TERM: 'term',
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
        } else {
            if (singleCharTokens.has(c)) {
                this.idx++;
                return singleCharTokens.get(c);
            }
            return null;
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
