
/**
 * @typedef {Object} ScriptToken
 * @property {Number} t - token code that is defined in {@link TokenTypes}
 * @property {String} v - token raw text
 * @property {Number|undefined} groupCode the token group code (defined in {@link TokenTypes})
 * @property {Array<ScriptToken>|undefined} groupTokens tokens sub array that represents token group (e.g. tokens inside round/curly brackets)
 */

import { TokenTypes } from "./tokenizer";


export class TokenScanner {
    /**
     * @param {Array<Object>} tokens
     */
    constructor(tokens) {
        this.tokens = tokens;
        this.idx = 0;
        this.line = 0;
    }

    hasMore() {
        return this.idx < this.tokens.length;
    }

    /**
     * @returns {ScriptToken}
     */
    scanToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        const token = this.tokens[this.idx];
        this.idx++;
        if (token.t === TokenTypes.NEWLINE) {
            this.line++;
        }
        return token;
    }

    /**
     * @returns {ScriptToken}
     */
    peekToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }
        return this.tokens[this.idx];
    }

    peekAfterNewlineToken() {
        if (this.idx >= this.tokens.length) {
            return null;
        }
        for (let i = this.idx; i < this.tokens.length; i++) {
            if (this.tokens[i].t !== TokenTypes.NEWLINE) {
                return this.tokens[i];
            }
        }
        return null;
    }

    scanUntilNewLine() {
        const lineTokens = [];
        while(this.hasMore()) {
            const token = this.scanToken();
            if (!token || token.t === TokenTypes.NEWLINE) {
                break;
            }
            lineTokens.push(token);
        }

        return lineTokens;
    }

    skipToken() {
        this.idx++;
    }

    skipNewlines() {
        while(true) {
            const token = this.peekToken();
            if (!token || (token.t !== TokenTypes.NEWLINE)) {
                return;
            }
            this.line++;
            this.skipToken();
        }
    }


    skipNewlinesAndDelimeters() {
        while(true) {
            const token = this.peekToken();
            if (!token || (token.t !== TokenTypes.NEWLINE && token.t !== TokenTypes.DELIMITER)) {
                return;
            }
            if (token.t === TokenTypes.NEWLINE) {
                this.line++;
            }
            this.skipToken();
        }
    }
}