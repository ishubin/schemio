/**
 * @typedef TextToken
 * @property {number} idx - original index in original text
 * @property {string} text - text content of the token
 */


const HTMLTAG    = 1; // <p>
const HTMLSYMBOL = 2; // &gt;
const WORD       = 3;
const SYMBOL     = 4;

const letterRegex = RegExp(/^\p{L}/,'u');

class TokenProcessor {
    constructor(tokens, tokenType, token) {
        this.currentType = tokenType || 0;
        this.currentToken = token || null;
        this.tokens = tokens || [];
        if (token) {
            this.tokens.push(token);
        }
    }

    process(idx, symbol, charCode) {
        if (this.currentType === HTMLTAG) {
            return this.processUntil(idx, symbol, charCode, '>')
        } else if (this.currentType === HTMLSYMBOL) {
            return this.processUntil(idx, symbol, charCode, ';')
        } else if (this.currentType === WORD) {
            return this.processWord(idx, symbol, charCode);
        } else {
            return this.processSymbol(idx, symbol, charCode);
        }
    }

    processSymbol(idx, symbol, charCode) {
        if (symbol === '<') {
            return new TokenProcessor(this.tokens, HTMLTAG, {idx, text: symbol});
        } else if (symbol === '&') {
            return new TokenProcessor(this.tokens, HTMLSYMBOL, {idx, text: symbol});
        } else if (this.isPartOfWord(symbol, charCode)) {
            return new TokenProcessor(this.tokens, WORD, {idx, text: symbol});
        } else {
            this.tokens.push({idx, text: symbol});
        }
        return this;
    }

    processUntil(idx, symbol, charCode, exitSymbol) {
        this.currentToken.text += symbol;
        if (symbol === exitSymbol) {
            return new TokenProcessor(this.tokens, SYMBOL);
        }
        return this;
    }

    processWord(idx, symbol, charCode) {
        if (this.isPartOfWord(symbol, charCode)) {
            this.currentToken.text += symbol;
            return this;
        }
        return new TokenProcessor(this.tokens, SYMBOL).process(idx, symbol, charCode);
    }

    isPartOfWord(symbol, charCode) {
        return (charCode >= 48 && charCode <= 57) || letterRegex.test(symbol);
    }

    getTokens() {
        return this.tokens;
    }
}

/**
 *
 * @param {string} text
 * @returns {Array<TextToken>}
 */
export function tokenizeText(text) {
    let tokenProcessor = new TokenProcessor([], SYMBOL);
    for (let i = 0; i < text.length; i++) {
        tokenProcessor = tokenProcessor.process(i, text.charAt(i), text.charCodeAt(i));
    }
    return tokenProcessor.getTokens();
}