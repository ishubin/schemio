import { ReservedTerms, TokenTypes, isReserved, tokenizeExpression } from "./tokenizer";
import { parseStringExpression } from "./strings";
import { ASTAdd, ASTAssign, ASTBoolAnd, ASTBoolOr, ASTDecrementWith, ASTDivide, ASTDivideWith, ASTEquals, ASTForLoop, ASTFunctionDeclaration, ASTFunctionInvocation, ASTGreaterThan, ASTGreaterThanOrEquals, ASTIFStatement, ASTIncrement, ASTIncrementWith, ASTLessThen, ASTLessThenOrEquals, ASTMod, ASTMultiExpression, ASTMultiply, ASTMultiplyWith, ASTNegate, ASTNot, ASTNotEqual, ASTObjectFieldAccesser, ASTString, ASTStringTemplate, ASTSubtract, ASTValue, ASTVarRef, ASTWhileStatement } from "./nodes";
import { TokenScanner } from "./scanner";
import { ASTStructNode } from "./struct";


const operatorPrecedences = new Map(Object.entries({
    '.': 6,
    '*': 5,
    '/': 5,
    '%': 5,
    '+': 4,
    '-': 4,
    '<': 3,
    '>': 3,
    '<=': 3,
    '>=': 3,
    '!=': 2,
    '==': 2,
    '&&': 1,
    '||': 0,
    '=': -1,
}));

function operatorPrecedence(operator) {
    if (operatorPrecedences.has(operator)) {
        return operatorPrecedences.get(operator);
    }
    return 0;
}

const operatorClasses = new Map(Object.entries({
    '.': ASTObjectFieldAccesser,
    '+': ASTAdd,
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

    if (args[args.length - 1].length === 0) {
        args.pop();
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
            return new ASTString("");
        }
        const node = this.parseExpression();
        if (!node) {
            throw new Error('Failed parsing expression: \n' + this.originalText);
        }
        if (this.idx < this.tokens.length) {
            const token = this.scanToken();
            throw new Error(`Failed to parse entire expression. `
                + `Unexpected token in expression (at ${token.idx}, line ${token.line}): ${token.t} "${token.text}"`);
        }
        return node;
    }

    parseExpression() {
        if (this.idx >= this.tokens.length) {
            return null;
        }

        const expressions = [];

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
        };

        const isEndToken = (token) => token === null || token.t === TokenTypes.COMMA;

        const startNewExpression = () => {
            processLeftovers();
            expressions.push(a);
            this.skipNewlinesAndDelimeters();

            a = this.parseTerm();
            this.skipNewlines();

            const nextToken = this.peekToken();
            if (nextToken && nextToken.t !== TokenTypes.OPERATOR && !isEndToken(nextToken)) {
                return startNewExpression();
            }
            return a ? true : false;
        };


        while(this.idx < this.tokens.length) {
            let token = this.peekToken();
            if (isEndToken(token)) {
                break;
            }
            this.skipToken();

            if (token.t === TokenTypes.DELIMITER) {
                if (!startNewExpression()) {
                    break;
                }
                token = this.peekToken();
                if (isEndToken(token)) {
                    break;
                }
                this.skipToken();
            }

            if (token.t === TokenTypes.NEWLINE) {
                this.skipNewlines();
                token = this.peekToken();
                if (isEndToken(token)) {
                    break;
                } else if (token.t === TokenTypes.OPERATOR) {
                    this.skipToken();
                } else {
                    if (!startNewExpression()) {
                        break;
                    }
                    token = this.peekToken();
                    if (isEndToken(token)) {
                        break;
                    }
                    this.skipToken();
                }
            }

            if (token.t !== TokenTypes.OPERATOR) {
                throw new Error(`Unexpected token in expression (at ${token.idx}, line ${token.line}): (${token.t}) "${token.text}"`);
            }

            if (token.v === '++' || token.v === '--') {
                if (!(a instanceof ASTVarRef)) {
                    throw new Error(`Unexpected ${token.v} operator`);
                }

                a = new ASTIncrement(a, false, token.v === '++' ? 1: -1);
            } else {
                this.skipNewlines();
                const precedence = operatorPrecedence(token.v);
                const opClass = operatorClass(token.v);

                const b = this.parseTerm();
                if (b === null) {
                    throw new Error(`Missing right term after the "${token.v}" operator at ${token.idx}, line ${token.line}`);
                }

                let nextToken = this.peekToken();
                if (nextToken && nextToken.t === TokenTypes.NEWLINE) {
                    const nextValidToken = this.peekAfterNewlineToken();
                    if (nextValidToken && nextValidToken.t === TokenTypes.OPERATOR) {
                        this.skipNewlines();
                        nextToken = nextValidToken;
                    }
                }
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

        processLeftovers();

        if (expressions.length > 0) {
            if (a) {
                expressions.push(a);
            }
            return new ASTMultiExpression(expressions);
        }
        return a;
    }

    /**
     * @param {ASTNode} expression
     */
    parseGroup(expression) {
        let nextToken = this.peekToken();
        while (nextToken && nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET) {
            this.skipToken();
            expression = parseFunction(expression, nextToken.groupTokens);
            nextToken = this.peekToken();
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
                    return parseFunctionDeclaration(token, this.scanToken());
                }
                const expression = parseAST(token.groupTokens);
                return this.parseGroup(expression);
            } else {
                throw new Error(`Unexpected token group "${token.v}"`);
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
            }
        } else if (token.t === TokenTypes.TERM) {
            return this.parseGroup(new ASTVarRef(token.v));
        } else if (token.t === TokenTypes.STRING) {
            return new ASTString(token.v);
        } else if (token.t === TokenTypes.OPERATOR && token.v === '-') {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "-"');
            }
            return new ASTNegate(nextTerm);
        } else if (token.t === TokenTypes.OPERATOR && (token.v === '++' || token.v === '--')) {
            const nextToken = this.scanToken();
            if (!nextToken) {
                throw new Error(`Missing term after ${token.v} operator`);
            }
            if (nextToken.t !== TokenTypes.TERM || isReserved(nextToken.v)) {
                throw new Error(`Unexpected token after ${token.v} operator: ${nextToken.text}`);
            }
            return new ASTIncrement(new ASTVarRef(nextToken.v), true, token.v === '++' ? 1 : -1);
        } else if (token.t === TokenTypes.NOT) {
            const nextTerm = this.parseTerm();
            if (!nextTerm) {
                throw new Error('Expected term token after "!"');
            }
            return new ASTNot(nextTerm);
        } else if (token.t === TokenTypes.STRING_TEMPLATE) {
            return new ASTStringTemplate(parseStringExpression(token.v));
        }
        throw new Error(`Unexpected token: ${token.t} "${token.text}"`);
    }

    parseWhileExpression() {
        this.skipNewlines();
        let token = this.scanToken();
        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_BRACKET) {
            throw new Error(`Expected "(" symbol after while (at ${token.idx}, line ${token.line})`);
        }

        const whileExpression = parseAST(token.groupTokens);
        if (!whileExpression) {
            throw new Error(`Missing condition expression for while statement (at ${token.idx}, line ${token.line})`);
        }

        this.skipNewlines();
        token = this.scanToken();
        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" symbol after "while" expression (at ${token.idx}, line ${token.line})`);
        }

        const whileBlock = parseAST(token.groupTokens);
        return new ASTWhileStatement(whileExpression, whileBlock);
    }

    parseStruct() {
        this.skipNewlines();
        const structNameToken = this.scanToken();
        if (!structNameToken || structNameToken.t !== TokenTypes.TERM) {
            throw new Error(`Missing struct name after "struct" (at ${structNameToken.idx}, line ${structNameToken.line})`);
        }
        this.skipNewlines();
        const structGroupToken = this.scanToken();
        if (!structGroupToken || structGroupToken.t !== TokenTypes.TOKEN_GROUP || structGroupToken.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" symbol for struct (at ${structGroupToken.idx}, line ${structGroupToken.line})`);
        }
        return parseStruct(structNameToken.v, structGroupToken.groupTokens);
    }

    parseForLoop() {
        this.skipNewlines();
        let nextToken = this.scanToken();
        if (!nextToken || nextToken.t !== TokenTypes.TOKEN_GROUP || nextToken.groupCode !== TokenTypes.START_BRACKET) {
            throw new Error(`Expected "(" symbol after for (at ${nextToken.idx}, line ${nextToken.line})`);
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
            throw new Error(`Invalid for loop declaration. Expected exactly two ";" (at ${nextToken.idx}, line ${nextToken.line})`);
        }

        this.skipNewlines();
        nextToken = this.scanToken();
        if (!nextToken || nextToken.t !== TokenTypes.TOKEN_GROUP || nextToken.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" symbol after "for" expression (at ${nextToken.idx}, line ${nextToken.line})`);
        }

        const forLoopBlock = parseAST(nextToken.groupTokens);

        const init = parseAST(forLoopTokenGroups[0]);
        const condition = parseAST(forLoopTokenGroups[1]);
        const postLoop = parseAST(forLoopTokenGroups[2]);

        return new ASTForLoop(init, condition, postLoop, forLoopBlock);
    }

    parseIfExpression() {
        this.skipNewlines();
        let token = this.scanToken();

        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_BRACKET) {
            throw new Error(`Missing "(" symbol after "if" (at ${token.idx}, line ${token.line})`);
        }

        const ifExpression = parseAST(token.groupTokens);

        this.skipNewlines();

        token = this.scanToken();
        if (!token || token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
            throw new Error(`Missing "{" for if statement`);
        }

        const trueBlock = parseAST(token.groupTokens);

        this.skipNewlines();

        token = this.peekToken();

        let falseBlock = null;

        if (token && token.t === TokenTypes.RESERVED && token.v === ReservedTerms.ELSE) {
            this.skipToken();
            this.skipNewlines();

            token = this.scanToken();
            if (!token) {
                throw new Error('Missing expression after "else"');
            }

            if (token.t === TokenTypes.RESERVED && token.v === ReservedTerms.IF) {
                falseBlock = this.parseIfExpression();
            } else {
                if (token.t !== TokenTypes.TOKEN_GROUP || token.groupCode !== TokenTypes.START_CURLY) {
                    throw new Error('Expected "{" after "else"');
                }
                falseBlock = parseAST(token.groupTokens);
            }
        }
        return new ASTIFStatement(ifExpression, trueBlock, falseBlock);
    }
}

/**
 * @param {ScriptToken} argsToken
 * @param {ScriptToken} bodyToken
 */
function parseFunctionDeclaration(argsToken, bodyToken) {
    if (!argsToken) {
        throw new Error('Cannot parse function declaration. Missing arguments definition');
    }
    if (!bodyToken) {
        throw new Error('Cannot parse function declaration. Missing "{"');
    }
    if (argsToken.t !== TokenTypes.TOKEN_GROUP || argsToken.groupCode !== TokenTypes.START_BRACKET ) {
        throw new Error('Cannot parse function arguments definition. Expected "(", got: ', argsToken.v);
    }
    if (bodyToken.t !== TokenTypes.TOKEN_GROUP || bodyToken.groupCode !== TokenTypes.START_CURLY ) {
        throw new Error('Cannot parse function definition. Expected "{", got: ', argsToken.v);
    }

    const argNames = [];
    let expectComma = false;
    argsToken.groupTokens.forEach(token => {
        if (token.t === TokenTypes.TERM) {
            if (expectComma) {
                throw new Error('Cannot parse function arguments. Expected ",", got: ', token.v);
            }
            argNames.push(token.v);
            expectComma = true;
        } else {
            if (expectComma && token.t === TokenTypes.COMMA) {
                expectComma = false;
            } else {
                throw new Error('Cannot parse function arguments. Unexpected token: ', token.v);
            }
        }
    });

    const funcBody = parseAST(bodyToken.groupTokens);

    return new ASTFunctionDeclaration(argNames, funcBody);
}

/**
 * @param {String} name
 * @param {Array<*>} tokens
 * @returns {ASTNode}
 */
function parseStruct(name, tokens) {
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
            throw new Error(`Cannot parse struct "${name}". Expected struct field name definition, got: ${fieldNameToken.t} "${fieldNameToken.text}"`);
        }

        let nextToken = scanner.peekToken();
        if (!nextToken) {
            fieldDefinitions.push({name: fieldNameToken.v, value: new ASTValue(null)});
            break;
        } else if (nextToken.t === TokenTypes.COLON) {
            scanner.skipNewlines();
            nextToken = scanner.scanToken();
            if (!nextToken) {
                throw new Error(`Missing value definition for struct field "${fieldNameToken.v}"`)
            }
            const peekedToken = scanner.peekToken();
            if (nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET
                && peekedToken && peekedToken.t === TokenTypes.OPERATOR && peekedToken.v === '=>') {
                scanner.skipToken();
                scanner.skipNewlines();
                const argsToken = nextToken;

                const functionBlockToken = scanner.scanToken();
                if (!functionBlockToken || functionBlockToken.t !== TokenTypes.TOKEN_GROUP || functionBlockToken.groupCode !== TokenTypes.START_CURLY) {
                    throw new Error(`Expected function definition for struct field "${fieldNameToken.v}", get: ${functionBlockToken.t} ${functionBlockToken.v}`);
                }

                const astFunc = parseFunctionDeclaration(argsToken, functionBlockToken);
                fieldDefinitions.push({name: fieldNameToken.v, value: astFunc});
            } else {
                const fieldTokens = scanner.scanUntilNewLine();
                const expression = parseAST(fieldTokens);
                fieldDefinitions.push({name: fieldNameToken.v, value: expression});
            }
        } else if (nextToken.t === TokenTypes.TOKEN_GROUP && nextToken.groupCode === TokenTypes.START_BRACKET) {
            scanner.skipToken();
            scanner.skipNewlines();
            const peekedToken = scanner.peekToken();
            if (!peekedToken) {
                throw new Error(`Missing function body for "${fieldNameToken.v}" struct function`);
            }
            const funcToken = scanner.scanToken();
            if (funcToken.t !== TokenTypes.TOKEN_GROUP || funcToken.groupCode !== TokenTypes.START_CURLY) {
                throw new Error(`Unexpected token for function body of "${fieldNameToken.v}" struct function: ${funcToken.t} ${funcToken.text}`);
            }
            const argsToken = nextToken;
            const astFunc = parseFunctionDeclaration(argsToken, funcToken);
            functionDefinitions.push({name: fieldNameToken.v, body: astFunc});
        } else {
            fieldDefinitions.push({name: fieldNameToken.v, value: new ASTValue(null)});
            if (nextToken.t === TokenTypes.COMMA) {
                scanner.skipToken();
            } else {
                throw new Error(`Unxpected token after "${fieldNameToken.v}" struct field definition: ${nextToken.t} ${nextToken.text}`)
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
    return parseAST(tokenizeExpression(expression), expression);
}


export function testAST(expression) {
    return parseExpression(expression);
}
