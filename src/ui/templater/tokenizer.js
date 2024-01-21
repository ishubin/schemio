

export const TokenTypes = {
    START_BRACKET  : 1,
    END_BRACKET    : 2,
    TERM           : 3,
    STRING         : 4,
    STRING_TEMPLATE: 5,
    NUMBER         : 6,
    OPERATOR       : 7,
    WHITESPACE     : 8,
    NEWLINE        : 9,
    DELIMITER      : 10,
    COMMA          : 11,
    NOT            : 12,
    COMMENT        : 13,
    START_CURLY    : 14,
    END_CURLY      : 15,
    RESERVED       : 16
};

export const ReservedTerms = {
    IF: 'if',
    ELSE: 'else'
};

export const ReservedTermsSet = new Set(Object.values(ReservedTerms));

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
    return c === ' ' || c === '\t';
}


const singleCharTokens = new Map(Object.entries({
    ',': {t: TokenTypes.COMMA},
    '(': {t: TokenTypes.START_BRACKET},
    ')': {t: TokenTypes.END_BRACKET},
    '+': {t: TokenTypes.OPERATOR, v: '+'},
    '-': {t: TokenTypes.OPERATOR, v: '-'},
    '*': {t: TokenTypes.OPERATOR, v: '*'},
    '/': {t: TokenTypes.OPERATOR, v: '/'},
    '%': {t: TokenTypes.OPERATOR, v: '%'},
    '<': {t: TokenTypes.OPERATOR, v: '<'},
    '>': {t: TokenTypes.OPERATOR, v: '>'},
    '=': {t: TokenTypes.OPERATOR, v: '='},
    '.': {t: TokenTypes.OPERATOR, v: '.'},
    ';': {t: TokenTypes.DELIMITER, v: ';'},
    '!': {t: TokenTypes.NOT},
    '{': {t: TokenTypes.START_CURLY},
    '}': {t: TokenTypes.END_CURLY},
}));

const doubleCharTokens = new Map(Object.entries({
    '==': {t: TokenTypes.OPERATOR, v: '=='},
    '!=': {t: TokenTypes.OPERATOR, v: '!='},
    '||': {t: TokenTypes.OPERATOR, v: '||'},
    '&&': {t: TokenTypes.OPERATOR, v: '&&'},
    '<=': {t: TokenTypes.OPERATOR, v: '<='},
    '>=': {t: TokenTypes.OPERATOR, v: '>='},
    '+=': {t: TokenTypes.OPERATOR, v: '+='},
    '-=': {t: TokenTypes.OPERATOR, v: '-='},
    '*=': {t: TokenTypes.OPERATOR, v: '*='},
    '/=': {t: TokenTypes.OPERATOR, v: '/='},
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
        this.currentLine = 0;
    }

    scanToken() {
        if (this.idx >= this.text.length) {
            return null;
        }

        const c = this.text[this.idx];

        if (c === '\n') {
            this.idx++;
            this.currentLine++;
            return {t: TokenTypes.NEWLINE, idx: this.idx - 1, line: this.currentLine - 1, text: ''};
        } else if (isLetter(c)) {
            return this.scanTerm();
        } else if (isPartOfNumber(c)) {
            return this.scanNumber();
        } else if (isWhitespace(c)) {
            return this.scanWhitespace();
        } else if (c === '"' || c === '\'') {
            this.idx++;
            return this.scanString(c);
        } else if (c === '`') {
            this.idx++;
            const token = this.scanString(c);
            return {...token, t: TokenTypes.STRING_TEMPLATE};
        } else {
            if (this.idx < this.text.length - 1) {
                const cc = this.text.substring(this.idx, this.idx + 2);
                if (cc === '//') {
                    this.idx += 2;
                    return this.scanComment('\n');
                } else if (cc === '/*') {
                    this.idx += 2;
                    return this.scanComment('*/');
                } else if (doubleCharTokens.has(cc)) {
                    this.idx+=2;
                    return {...doubleCharTokens.get(cc), text: cc, idx: this.idx - 2, line: this.currentLine};
                }
            }

            if (singleCharTokens.has(c)) {
                this.idx++;
                return {...singleCharTokens.get(c), text: c, idx: this.idx - 1, line: this.currentLine};
            }
            throw new Error('Invalid symbol: ' + c);
        }
    }

    scanComment(endTerm) {
        let commentText = '';
        const startIdx = this.idx;
        while(this.idx <= this.text.length) {
            if (this.text.substring(this.idx, this.idx + endTerm.length) === endTerm) {
                this.idx += endTerm.length;
                break;
            }
            commentText += this.text[this.idx];
            this.idx++;
        }

        return {
            t: TokenTypes.COMMENT,
            text: commentText,
            idx: startIdx,
            line: this.currentLine
        };
    }


    scanTerm() {
        let term = '';
        let startIdx = this.idx;
        for (let i = this.idx; i < this.text.length; i++) {
            const c = this.text[i];
            if (isLetter(c) || isDigit(c)) {
                term += c;
                this.idx = i+1;
            } else {
                break;
            }
        }

        if (ReservedTermsSet.has(term)) {
            return {
                t: TokenTypes.RESERVED,
                v: term,
                text: term,
                idx: startIdx,
                line: this.currentLine
            };
        };

        return {
            t: TokenTypes.TERM,
            v: term,
            text: term,
            idx: startIdx,
            line: this.currentLine
        };
    }

    scanNumber() {
        let numberText = '';
        let hasDotAlready = false;
        const startIdx = this.idx;

        if (this.text[this.idx] === '.' && this.idx < this.text.length - 1 && !isDigit(this.text[this.idx+1])) {
            this.idx++;
            return {
                t: TokenTypes.OPERATOR,
                v: '.',
                text: '.'
            };
        }

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
            v: parseFloat(numberText),
            text: numberText,
            idx: startIdx,
            line: this.currentLine
        };
    }

    scanWhitespace() {
        const startIdx = this.idx;
        for (let i = this.idx; i < this.text.length; i++) {
            const c = this.text[i];
            if (isWhitespace(c)) {
                this.idx = i + 1;
            } else {
                break;
            }
        }
        return {t: TokenTypes.WHITESPACE, text: ' ', idx: startIdx, line: this.currentLine};
    }

    scanString(breakChar) {
        let str = '';
        const startIdx = this.idx;
        while(this.idx < this.text.length) {
            const c = this.text[this.idx];

            if (c === breakChar) {
                this.idx++;
                return {t: TokenTypes.STRING, v: str, text: str, idx: startIdx, line: this.currentLine};
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
