import { ReservedTerms, SchemioScriptParseError, TokenTypes, isReserved, tokenizeExpression } from "./tokenizer";
import { parseStringExpression } from "./strings";
import { ASTExternalObjectLookup, ASTForLoop, ASTIFStatement,  ASTLocalVariable, ASTMultiExpression, ASTReturn, ASTString, ASTStringTemplate, ASTVarRef, ASTWhileStatement } from "./nodes";
import { TokenScanner } from "./scanner";
import { ASTStructNode } from "./struct";
import { normalizeTokens } from "./normalization";
import { ASTValue } from "./ASTValue";
import { ASTAdd, ASTAssign, ASTBitShiftLeft, ASTBitShiftRight, ASTBitwiseAnd, ASTBitwiseNot,
    ASTBitwiseOr, ASTBoolAnd, ASTBoolOr, ASTDecrementWith, ASTDivide, ASTDivideWith, ASTEquals,
    ASTGreaterThan, ASTGreaterThanOrEquals, ASTIncrement, ASTIncrementWith, ASTLessThen, ASTLessThenOrEquals,
    ASTMod, ASTMultiply, ASTMultiplyWith, ASTNegate, ASTNot, ASTNotEqual, ASTPow, ASTSubtract,
} from "./astoperators";
import { ASTObjectFieldAccessor } from "./ASTObjectFieldAccessor";
import { ASTFunctionInvocation } from "./ASTFunctionInvocation";
import { ASTFunctionDeclaration } from "./ASTFunctionDeclaration";


const operatorPrecedences = [
    '^',
    '/',
    '*',
    '%',
    '-',
    '+',
    '<<',
    '>>',
    '&',
    '|',
    '<',
    '>',
    '<=',
    '>=',
    '!=',
    '==',
    '&&',
    '||',
    '++',
    '--',
    '-=',
    '+=',
    '=',
].reverse().reduce((m, o, idx) => {
    m.set(o, idx);
    return m;
}, new Map());

function operatorPrecedence(operator) {
    if (operatorPrecedences.has(operator)) {
        return operatorPrecedences.get(operator);
    }
    return 0;
}

const operatorClasses = new Map(Object.entries({
    '+': ASTAdd,
    '^': ASTPow,
    '-': ASTSubtract,
    '*': ASTMultiply,
    '/': ASTDivide,
    '%': ASTMod,
    '<': ASTLessThen,
    '>': ASTGreaterThan,
    '<=': ASTLessThenOrEquals,
    '>=': ASTGreaterThanOrEquals,
    '==': ASTEquals,
    '!=': ASTNotEqual,
    '&&': ASTBoolAnd,
    '||': ASTBoolOr,
    '&': ASTBitwiseAnd,
    '|': ASTBitwiseOr,
    '<<': ASTBitShiftLeft,
    '>>': ASTBitShiftRight,
    '=': ASTAssign,
    '+=': ASTIncrementWith,
    '-=': ASTDecrementWith,
    '*=': ASTMultiplyWith,
    '/=': ASTDivideWith,
}));

function operatorClass(operator) {
    if (operatorClasses.has(operator)) {
        return operatorClasses.get(operator);
    }

    throw new Error('Unknown operator: ' + operator);
}

function createOpLeftover(a, opClass, precedence) {
    return {
        a, opClass, precedence,
        make: (b) => new opClass(a, b)
    };
}

/**
 *
 * @param {ASTNode} functionProvider
 * @param {Array<ScriptToken>} tokens
 * @returns
 */
function parseFunction(functionProvider, tokens) {
    const args = [];

    /** @type {Array<ScriptToken>} */
    let currentArgTokens = [];
    args.push(currentArgTokens);
    tokens.forEach(token => {
        if (token.t === TokenTypes.COMMA) {
            if (!currentArgTokens) {
                throw new Error(`Invalid arguments declaration in function: "${functionProvider.print()}"`);
            }
            currentArgTokens = [];
            args.push(currentArgTokens);
        } else {
            currentArgTokens.push(token);
        }
    });

    const lastArgTokens = args[args.length - 1];
    if (lastArgTokens.length === 0 || (lastArgTokens.length === 1 && lastArgTokens[0].t === TokenTypes.NEWLINE)) {
        args.pop();
    }

    for (let i = 0; i < args.length; i++) {
        const argTokens = args[i];
        if (argTokens.length === 0 || (argTokens.length === 1 && argTokens[0].t === TokenTypes.NEWLINE)) {
            throw new Error(`Missing argument #${i} in function invocation`);
        }
    }

    return new ASTFunctionInvocation(functionProvider, args.map(parseAST));
}

class ASTParser extends TokenScanner {
    constructor(tokens, originalText) {
        super(tokens);
        this.originalText = originalText;
    }

    parse() {
        if (!this.tokens || this.tokens.length === 0) {
            return new ASTValue(null);
        }
        const expressions = [];
        while(this.hasMore()) {
            const expression = this.parseSingleExpression();
            if (expression) {
                expressions.push(expression);
            }
        }
        if (expressions.length > 0) {
            return new ASTMultiExpression(expressions);
        } else {
            return new ASTValue(null);
        }
    }

    /**
     *
     * @param {import("./scanner").ScriptToken} token
     * @returns
     */
    processedTextToToken(token) {
        if (!token) {
            return this.processedText();
        }
        return this.originalText.substring(0, token.idx) + token.text;
    }

    processedText() {
        if (this.tokens.length === 0) {
            return '';
        }

        const lastToken = this.tokens[Math.min(this.idx, this.tokens.length - 1)];
        return this.originalText.substring(0, lastToken.idx) + lastToken.v;
    }

    /**
     * @returns {ASTNode}
     */
    parseSingleExpression() {
        this.skipNewlinesAndDelimeters();

        let a = this.parseTerm();
        if (!a) {
            return null;
        }

        const leftovers = [];

        const processLeftovers = () => {
            while(leftovers.length > 0) {
                const leftover = leftovers.pop();
                a = leftover.make(a);
            }
            return a;
        };

        const isEndToken = (token) => token === null || token.t === TokenTypes.COMMA || token.t === TokenTypes.DELIMITER || token.t === TokenTypes.NEWLINE;

        while(this.hasMore()) {
            let token = this.peekToken();
            if (isEndToken(token)) {
                break;
            }
            this.skipToken();

            if (token.t !== TokenTypes.OPERATOR) {
                throw new SchemioScriptParseError(`Expected operator but got unexpected token (at ${token.idx}, line ${token.line}): (${token.t}) "${token.text}"`,  this.processedTextToToken(token));
            }

            if (token.v === '++' || token.v === '--') {
                if (!(a instanceof ASTVarRef)) {
                    throw new SchemioScriptParseError(`Unexpected ${token.v} operator after ${a.type}`, this.processedTextToToken(token));
                }

                a = new ASTIncrement(a, false, token.v === '++' ? 1: -1);
            } else {
                const precedence = operatorPrecedence(token.v);
                const opClass = operatorClass(token.v);

                const b = this.parseTerm();
                if (b === null) {
                    throw new SchemioScriptParseError(`Missing right term after the "${token.v}" operator at ${token.idx}, line ${token.line}`, this.processedTextToToken(token));
                }

                const nextToken = this.peekToken();
                const nextOperator = nextToken && nextToken.t === TokenTypes.OPERATOR ? nextToken.v : null;
                const nextPrecedence = nextOperator ? operatorPrecedence(nextOperator) : -100;

                if (precedence >= nextPrecedence) {
                    a = new opClass(a, b);
                    while(leftovers.length > 0) {
                        const leftover = leftovers[leftovers.length - 1];
                        if (leftover.precedence < nextPrecedence) {
                            break
                        }
                        a = leftover.make(a);
                        leftovers.pop();
                    }
                } else {
                    leftovers.push(createOpLeftover(a, opClass, precedence));
                    a = b;
                }
            }
        }

        return processLeftovers();
    }

    parseExternalObjectReference() {
        let nextToken = this.scanToken();
        if (!nextToken) {
            throw new SchemioScriptParseError('Missing the name after "@" symbol', this.processedText());
        }
        if (nextToken.t === TokenTypes.TERM) {
            return new ASTExternalObjectLookup(new ASTValue(nextToken.v));
        } else if (nextToken.t === TokenTypes.STRING) {
            return new ASTExternalObjectLookup(new ASTValue(nextToken.v))
        } else if (nextToken.t === TokenTypes.STRING_TEMPLATE) {
            return new ASTExternalObjectLookup(new ASTStringTemplate(parseStringExpression(nextToken.v)));
        } else if (nextToken.t === TokenTypes.NUMBER) {
            return new ASTExternalObjectLookup(new ASTValue('' + nextToken.v))
        } else {
            throw new SchemioScriptParseError('Unsupported token after "@"', this.processedTextToToken(nextToken));
        }
    }

    /**
     * @param {ASTNode} expression
     */
    parseTermGroup(expression) {
        let nextToken = this.peekToken();
        if (!nextToken) {
            return expression;
        }
        while (nextToken) {
            if (nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET) {
                expression = parseFunction(expression, nextToken.groupTokens);
                this.skipToken();
                nextToken = this.peekToken();
            } else if (nextToken.t === TokenTypes.FIELD_ACCESSOR) {
                this.skipToken();
                nextToken = this.peekToken();
                if (!nextToken) {
                    throw new SchemioScriptParseError(`Missing field name definition after '.'`, this.processedTextToToken(nextToken));
                }
                if (nextToken.t !== TokenTypes.TERM) {
                    throw new SchemioScriptParseError(`Expected field name after '.', but got: ${nextToken.text}`, this.processedTextToToken(nextToken));
                }
                const termToken = nextToken;
                this.skipToken();
                nextToken = this.peekToken();

                let fieldTerm = null;

                if (nextToken && nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET) {
                    fieldTerm = parseFunction(new ASTVarRef(termToken.v), nextToken.groupTokens);
                    this.skipToken();
                    nextToken = this.peekToken();
                } else {
                    fieldTerm = new ASTVarRef(termToken.v);
                }

                expression = new ASTObjectFieldAccessor(expression, fieldTerm);
            } else {
                break;
            }
        }
        return expression;
    }

    /**
     * @returns {ASTNode}
     */
    parseTerm() {
        this.skipNewlines();
        const token = this.peekToken();
        if (token === null) {
            return null;
        }
        this.skipToken();

        if (token.t === TokenTypes.TOKEN_GROUP) {
            if (token.groupCode === TokenTypes.START_BRACKET) {
                const nextToken = this.peekToken();
                if (nextToken && nextToken.t === TokenTypes.OPERATOR && nextToken.v === '=>') {
                    this.skipToken();
                    this.skipNewlines();
                    return parseFunctionDeclarationUsing(token, this.scanToken(), this.originalText);
                }
                const expression = parseAST(token.groupTokens, this.originalText);
                return this.parseTermGroup(expression);
            } else {
                throw new SchemioScriptParseError(`Unexpected token group "${token.v}"`, this.processedTextToToken(token));
            }
        } else if (token.t === TokenTypes.NUMBER) {
            return new ASTValue(token.v);
        } else if (token.t === TokenTypes.RESERVED) {
            if (token.v === ReservedTerms.IF) {
                return this.parseIfExpression();
            } else if (token.v === ReservedTerms.WHILE) {
                return this.parseWhileExpression();
            } else if (token.v === ReservedTerms.FOR) {
                return this.parseForLoop();
            } else if (token.v === ReservedTerms.TRUE) {
                return new ASTValue(true);
            } else if (token.v === ReservedTerms.FALSE) {
                return new ASTValue(false);
            } else if (token.v === ReservedTerms.NULL) {
                return new ASTValue(null);
            } else if (token.v === ReservedTerms.STRUCT) {
                return this.parseStruct();
            } else if (token.v === ReservedTerms.FUNC) {
                return this.parseFunctionDeclaration();
            } else if (token.v === ReservedTerms.LOCAL || token.v === ReservedTerms.LET) {
                return this.parseLocalVarDeclaration(token);
            } else if (token.v === ReservedTerms.RETURN) {
                const expr = this.parseSingleExpression();
                return new ASTReturn(expr);
            }
        } else if (token.t === TokenTypes.TERM) {
            const nextToken = this.peekToken();
            if (nextToken && nextToken.t === TokenTypes.OPERATOR && nextToken.v === '=>') {
                this.skipToken();
                this.skipNewlines();
                const argWrapper = {
                    t: TokenTypes.TOKEN_GROUP,
                    groupCode: TokenTypes.START_BRACKET,
                    groupTokens: [token]
                };
                return parseFunctionDeclarationUsing(argWrapper, this.scanToken(), this.originalText);
            }
            return this.parseTermGroup(new ASTVarRef(token.v));
        } else if (token.t === TokenTypes.AT_SYMBOL) {
            const extVarRef = this.parseExternalObjectReference();
            return this.parseTermGroup(extVarRef);
        } else if (token.t === TokenTypes.STRING) {
            return this.parseTermGroup(new ASTString(token.v));
        } else if (token.t === TokenTypes.OPERATOR && token.v === '~') {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new SchemioScriptParseError('Expected term token after "~"', this.processedText());
            }
            return new ASTBitwiseNot(nextTerm);
        } else if (token.t === TokenTypes.OPERATOR && token.v === '-') {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new SchemioScriptParseError('Expected term token after "-"', this.processedText());
            }
            return new ASTNegate(nextTerm);
        } else if (token.t === TokenTypes.OPERATOR && (token.v === '++' || token.v === '--')) {
            const nextToken = this.scanToken();
            if (!nextToken) {
                throw new SchemioScriptParseError(`Missing term after ${token.v} operator`, this.processedText());
            }
            if (nextToken.t !== TokenTypes.TERM || isReserved(nextToken.v)) {
                throw new SchemioScriptParseError(`Unexpected token after ${token.v} operator: ${nextToken.text}`, this.processedTextToToken(nextToken));
            }
            return new ASTIncrement(new ASTVarRef(nextToken.v), true, token.v === '++' ? 1 : -1);
        } else if (token.t === TokenTypes.NOT) {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new SchemioScriptParseError('Expected term token after "!"', this.processedText());
            }
            return new ASTNot(nextTerm);
        } else if (token.t === TokenTypes.STRING_TEMPLATE) {
            return new ASTStringTemplate(parseStringExpression(token.v));
        }
        throw new SchemioScriptParseError(`Unexpected token: ${token.t} "${token.text}"`, this.processedTextToToken(token));
    }

    parseWhileExpression() {
        this.skipNewlines();
        let token = this.scanToken();
        if (!token) {
            throw new SchemioScriptParseError(`Expected "(" symbol after "while"`, this.processedText());
        }
        if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_BRACKET) {
            throw new SchemioScriptParseError(`Expected "(" symbol after "while" (at ${token.idx}, line ${token.line})`, this.processedTextToToken(token));
        }

        const whileExpression = parseAST(token.groupTokens, this.originalText);
        if (!whileExpression) {
            throw new SchemioScriptParseError(`Missing condition expression for while statement (at ${token.idx}, line ${token.line})`, this.processedTextToToken(token));
        }

        this.skipNewlines();
        token = this.scanToken();
        if (!token) {
            throw new SchemioScriptParseError(`Missing "{" symbol after "while" expression`, this.processedText());
        }
        if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
            throw new SchemioScriptParseError(`Missing "{" symbol after "while" expression (at ${token.idx}, line ${token.line})`, this.processedTextToToken(token));
        }

        const whileBlock = parseAST(token.groupTokens, this.originalText);
        return new ASTWhileStatement(whileExpression, whileBlock);
    }

    parseLocalVarDeclaration(definitionToken) {
        const node = this.parseSingleExpression();
        if (!node) {
            throw new SchemioScriptParseError(`Expected variable declaration after "${definitionToken.v}"`, this.processedText());
        }
        if (node instanceof ASTVarRef) {
            return new ASTLocalVariable(node.varName, null);
        } else if (node instanceof ASTAssign && node.a instanceof ASTVarRef) {
            return new ASTLocalVariable(node.a.varName, node);
        } else {
            throw new SchemioScriptParseError('Invalid variable declaration', this.processedText());
        }
    }

    parseFunctionDeclaration() {
        this.skipNewlines();
        const funcNameToken = this.scanToken();
        if (!funcNameToken) {
            throw new SchemioScriptParseError(`Missing function name after "func"`, this.processedText());
        }
        if (funcNameToken.t !== TokenTypes.TERM) {
            throw new SchemioScriptParseError(`Unexpected token after "func": "${funcNameToken.text}"`, this.processedTextToToken(funcNameToken));
        }
        this.skipNewlines();
        const funcArgsToken = this.scanToken();
        if (!funcArgsToken) {
            throw new SchemioScriptParseError(`Missing function args declaration for "${funcNameToken.v}" function`, this.processedText());
        }
        if (!(funcArgsToken.t === TokenTypes.TOKEN_GROUP && funcArgsToken.groupCode === TokenTypes.START_BRACKET)) {
            throw new SchemioScriptParseError(`Expected function args declaration for "${funcNameToken.v}" function, got: "${funcArgsToken.text}"`, this.processedTextToToken(funcArgsToken));
        }
        this.skipNewlines();
        const funcBodyToken = this.scanToken();
        if (!funcBodyToken) {
            throw new SchemioScriptParseError(`Missing function body declaration for "${funcNameToken.v}" function`, this.processedText());
        }
        if (!(funcBodyToken.t === TokenTypes.TOKEN_GROUP && funcBodyToken.groupCode === TokenTypes.START_CURLY)) {
            throw new SchemioScriptParseError(`Expected function body declaration for "${funcNameToken.v}" function, got: "${funcBodyToken.text}"`, this.processedTextToToken(funcBodyToken));
        }

        const functionAST = parseFunctionDeclarationUsing(funcArgsToken, funcBodyToken, this.originalText, funcNameToken.v);
        return new ASTAssign(new ASTVarRef(funcNameToken.v), functionAST);
    }

    parseStruct() {
        this.skipNewlines();
        const structNameToken = this.scanToken();
        if (!structNameToken) {
            throw new SchemioScriptParseError(`Missing struct name after "struct"`, this.processedText());
        }
        if (structNameToken.t !== TokenTypes.TERM) {
            throw new SchemioScriptParseError(`Invalid token after "struct" (at ${structNameToken.idx}, line ${structNameToken.line})`, this.processedTextToToken(structNameToken));
        }
        this.skipNewlines();
        const structGroupToken = this.scanToken();
        if (!structGroupToken) {
            throw new SchemioScriptParseError(`Missing "{" symbol for struct`, this.processedText());
        }
        if (structGroupToken.t !== TokenTypes.TOKEN_GROUP || structGroupToken.groupCode !== TokenTypes.START_CURLY) {
            throw new SchemioScriptParseError(`Missing "{" symbol for struct (at ${structGroupToken.idx}, line ${structGroupToken.line})`, this.processedTextToToken(structGroupToken));
        }
        return parseStruct(structNameToken.v, structGroupToken.groupTokens, this.originalText);
    }

    parseForLoop() {
        this.skipNewlines();
        let nextToken = this.scanToken();
        if (!nextToken) {
            throw new SchemioScriptParseError(`Expected "(" symbol after for`, this.processedText());
        }
        if (nextToken.t !== TokenTypes.TOKEN_GROUP || nextToken.groupCode !== TokenTypes.START_BRACKET) {
            throw new SchemioScriptParseError(`Expected "(" symbol after for (at ${nextToken.idx}, line ${nextToken.line})`, this.processedTextToToken(nextToken));
        }

        const forLoopTokenGroups = [[]];

        nextToken.groupTokens.forEach(token => {
            if (token.t === TokenTypes.DELIMITER) {
                forLoopTokenGroups.push([]);
                return;
            }
            forLoopTokenGroups[forLoopTokenGroups.length - 1].push(token);
        });

        if (forLoopTokenGroups.length !== 3) {
            throw new SchemioScriptParseError(`Invalid for loop declaration. Expected exactly two ";" (at ${nextToken.idx}, line ${nextToken.line})`, this.processedTextToToken(nextToken));
        }

        this.skipNewlines();
        nextToken = this.scanToken();
        if (!nextToken) {
            throw new SchemioScriptParseError(`Missing "{" symbol after "for" expression`, this.processedText());
        }
        if (nextToken.t !== TokenTypes.TOKEN_GROUP || nextToken.groupCode !== TokenTypes.START_CURLY) {
            throw new SchemioScriptParseError(`Missing "{" symbol after "for" expression (at ${nextToken.idx}, line ${nextToken.line})`, this.processedTextToToken(nextToken));
        }

        const forLoopBlock = parseAST(nextToken.groupTokens, this.originalText);

        const init = parseAST(forLoopTokenGroups[0], this.originalText);
        const condition = parseAST(forLoopTokenGroups[1], this.originalText);
        const postLoop = parseAST(forLoopTokenGroups[2], this.originalText);

        return new ASTForLoop(init, condition, postLoop, forLoopBlock);
    }

    parseIfExpression() {
        this.skipNewlines();
        let token = this.scanToken();

        if (!token) {
            throw new SchemioScriptParseError(`Missing "(" symbol after "if"`, this.processedText());
        }
        if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_BRACKET) {
            throw new SchemioScriptParseError(`Missing "(" symbol after "if" (at ${token.idx}, line ${token.line})`, this.processedTextToToken(token));
        }

        const ifExpression = parseAST(token.groupTokens, this.originalText);

        this.skipNewlines();

        token = this.scanToken();
        if (!token) {
            throw new SchemioScriptParseError(`Missing "{" for if statement`, this.processedText());
        }
        if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
            throw new SchemioScriptParseError(`Missing "{" for if statement`, this.processedTextToToken(token));
        }

        const trueBlock = parseAST(token.groupTokens, this.originalText);

        token = this.peekToken();

        let falseBlock = null;

        if (token && token.t === TokenTypes.RESERVED && token.v === ReservedTerms.ELSE) {
            this.skipToken();
            this.skipNewlines();

            token = this.scanToken();
            if (!token) {
                throw new SchemioScriptParseError('Missing expression after "else"', this.processedText());
            }

            if (token.t === TokenTypes.RESERVED && token.v === ReservedTerms.IF) {
                falseBlock = this.parseIfExpression();
            } else {
                if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
                    throw new SchemioScriptParseError('Expected "{" after "else"', this.processedTextToToken(token));
                }
                falseBlock = parseAST(token.groupTokens, this.originalText);
            }
        }
        return new ASTIFStatement(ifExpression, trueBlock, falseBlock);
    }
}

/**
 * @param {ScriptToken} argsToken
 * @param {ScriptToken} bodyToken
 * @param {string} originalText
 * @param {string} funcName
 */
function parseFunctionDeclarationUsing(argsToken, bodyToken, originalText, funcName = '< anonymous >') {
    if (!argsToken) {
        throw new Error('Cannot parse function declaration. Missing arguments definition');
    }
    if (!bodyToken) {
        throw new SchemioScriptParseError('Cannot parse function declaration. Missing "{"', originalText.substring(0, argsToken.idx));
    }
    if (argsToken.t !== TokenTypes.TOKEN_GROUP || argsToken.groupCode !== TokenTypes.START_BRACKET ) {
        throw new SchemioScriptParseError(`Cannot parse function arguments definition. Expected "(", got: "${argsToken.text}"`, originalText.substring(0, argsToken.idx));
    }
    if (bodyToken.t !== TokenTypes.TOKEN_GROUP || bodyToken.groupCode !== TokenTypes.START_CURLY ) {
        throw new SchemioScriptParseError(`Cannot parse function definition. Expected "{", got: "${bodyToken.text}"`, originalText.substring(0, bodyToken.idx));
    }

    const argNames = [];
    let expectComma = false;
    argsToken.groupTokens.forEach(token => {
        if (token.t === TokenTypes.TERM) {
            if (expectComma) {
                throw new SchemioScriptParseError(`Cannot parse function arguments. Expected ",", got: "${token.text}"'`, originalText.substring(0, token.idx) + token.text);
            }
            argNames.push(token.v);
            expectComma = true;
        } else {
            if (expectComma && token.t === TokenTypes.COMMA) {
                expectComma = false;
            } else {
                throw new SchemioScriptParseError(`Cannot parse function arguments. Unexpected token "${token.text}"'`, originalText.substring(0, token.idx) + token.text);
            }
        }
    });

    const funcBody = parseAST(bodyToken.groupTokens, originalText);

    return new ASTFunctionDeclaration(argNames, funcBody, funcName);
}

/**
 * @param {String} name
 * @param {Array<*>} tokens
 * @param {String} originalText
 * @returns {ASTNode}
 */
function parseStruct(name, tokens, originalText) {
    const fieldDefinitions = [];
    const functionDefinitions = [];

    const scanner = new TokenScanner(tokens);

    while(scanner.hasMore()) {
        scanner.skipNewlines();
        const fieldNameToken = scanner.scanToken();
        if (!fieldNameToken) {
            break;
        }
        if (fieldNameToken.t !== TokenTypes.TERM) {
            throw new SchemioScriptParseError(`Cannot parse struct "${name}". Expected struct field name definition, got: ${fieldNameToken.t} "${fieldNameToken.text}"`, originalText.substring(0, fieldNameToken.idx) + fieldNameToken.text);
        }

        let nextToken = scanner.peekToken();
        if (!nextToken) {
            fieldDefinitions.push({name: fieldNameToken.v, value: new ASTValue(null)});
            break;
        } else if (nextToken.t === TokenTypes.COLON) {
            scanner.skipNewlines();
            const pnt = nextToken;
            nextToken = scanner.scanToken();
            if (!nextToken) {
                throw new SchemioScriptParseError(`Missing value definition for struct field "${fieldNameToken.v}"`, originalText.substring(0, pnt.idx) + pnt.text)
            }
            const peekedToken = scanner.peekToken();
            if (nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET
                && peekedToken && peekedToken.t === TokenTypes.OPERATOR && peekedToken.v === '=>') {
                scanner.skipToken();
                scanner.skipNewlines();
                const argsToken = nextToken;

                const functionBlockToken = scanner.scanToken();
                if (!functionBlockToken) {
                    throw new SchemioScriptParseError(`Expected function definition for struct field "${fieldNameToken.v}"`, originalText.substring(0, peekedToken.idx) + peekedToken.text);
                }
                if (functionBlockToken.t !== TokenTypes.TOKEN_GROUP || functionBlockToken.groupCode !== TokenTypes.START_CURLY) {
                    throw new SchemioScriptParseError(`Expected function definition for struct field "${fieldNameToken.v}", got: ${functionBlockToken.t} ${functionBlockToken.v}`, originalText.substring(0, functionBlockToken.idx) + functionBlockToken.text);
                }

                const astFunc = parseFunctionDeclarationUsing(argsToken, functionBlockToken, originalText);
                fieldDefinitions.push({name: fieldNameToken.v, value: astFunc});
            } else {
                const fieldTokens = scanner.scanUntilNewLine();
                const expression = parseAST(fieldTokens, originalText);
                fieldDefinitions.push({name: fieldNameToken.v, value: expression});
            }
        } else if (nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET) {
            scanner.skipToken();
            scanner.skipNewlines();
            const funcToken = scanner.scanToken();
            if (!funcToken) {
                throw new SchemioScriptParseError(`Missing function body for "${fieldNameToken.v}" struct function`, originalText.substring(0, nextToken.idx) + nextToken.text);
            }
            if (funcToken.t !== TokenTypes.TOKEN_GROUP || funcToken.groupCode !== TokenTypes.START_CURLY) {
                throw new SchemioScriptParseError(`Unexpected token for function body of "${fieldNameToken.v}" struct function: ${funcToken.t} ${funcToken.text}`, originalText.substring(0, funcToken.idx) + funcToken.text);
            }
            const argsToken = nextToken;
            if (!argsToken) {
                throw new SchemioScriptParseError(`Missing function arguments declaration`, originalText.substring(0, funcToken.idx) + funcToken.text);
            }
            const astFunc = parseFunctionDeclarationUsing(argsToken, funcToken, originalText);
            functionDefinitions.push({name: fieldNameToken.v, body: astFunc});
        } else {
            fieldDefinitions.push({name: fieldNameToken.v, value: new ASTValue(null)});
            if (nextToken.t === TokenTypes.COMMA) {
                scanner.skipToken();
            } else {
                throw new SchemioScriptParseError(`Unxpected token after "${fieldNameToken.v}" struct field definition: ${nextToken.t} "${nextToken.text}"`, originalText.substring(0, nextToken.idx) + nextToken.text)
            }
        }
    }

    return new ASTStructNode(name, fieldDefinitions, functionDefinitions);
}

/**
 *
 * @param {Array} tokens
 * @returns {ASTNode}
 */
export function parseAST(tokens, originalText) {
    const parser = new ASTParser(tokens, originalText);
    return parser.parse();
}

/**
 *
 * @param {String} expression
 * @returns {ASTNode}
 */
export function parseExpression(expression) {
    const tokens = normalizeTokens(tokenizeExpression(expression));
    return parseAST(tokens, expression);
}


export function testAST(expression) {
    return parseExpression(expression);
}
