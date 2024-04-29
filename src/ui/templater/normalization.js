import { TokenScanner } from "./scanner";
import { ReservedTerms, TokenTypes } from "./tokenizer";

/**
 *
 * @param {Array<import("./scanner").ScriptToken>} tokens
 * @returns {Array<import("./scanner").ScriptToken>}
 */
export function normalizeTokens(tokens) {
    const result = [];
    const scanner = new TokenScanner(tokens);

    while(scanner.hasMore()) {
        const token = scanner.scanToken();
        if (token.t === TokenTypes.TOKEN_GROUP) {
            result.push({
                groupCode: token.groupCode,
                t: token.t,
                v: token.v,
                text: token.text,
                groupTokens: normalizeTokens(token.groupTokens)
            });
        } else {
            if (isNormalizingToken(token)) {
                const nextToken = scanner.peekToken();
                if (nextToken && nextToken.t === TokenTypes.NEWLINE) {
                    scanner.skipNewlines();
                }
                result.push(token);
            } else if (token.t === TokenTypes.NEWLINE) {
                const nextToken = scanner.peekAfterNewlineToken();
                if (nextToken && isNormalizingToken(nextToken)) {
                    scanner.skipNewlines();
                } else {
                    result.push(token);
                }
            } else {
                result.push(token);
            }
        }
    }
    return result;
}

/**
 * @param {import("./scanner").ScriptToken} token
 */
function isNormalizingToken(token) {
    return token && (
        (token.t === TokenTypes.OPERATOR && token.v !== '++' && token.v !== '--')
        || token.t === TokenTypes.FIELD_ACCESSOR
        || token.t === TokenTypes.RESERVED && token.v === ReservedTerms.ELSE
    );
}