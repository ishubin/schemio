import { ASTNode, Scope, parseAST } from "./ast";
import { parseStringExpression } from "./strings";
import { tokenizeExpression } from "./tokenizer";


const $_EXPR = '$-expr';
const $_STR = '$-str';
const $_RAWSTR = '$-rawstr';
const $_IF = '$-if';
const $_ELSE_IF = '$-else-if';
const $_ELSE = '$-else';
const $_FOR = '$-for';
const $_EVAL = '$-eval';


/**
 * Compiles the specified template and returns a function that will generated the template object
 * @param {Object} obj - template object
 * @returns {function(Object): Object} - function that takes an object as input scope and returns processed object from template
 */
export function compileJSONTemplate(obj) {
    const compiled = compile(obj);
    return (data) => {
        return compiled(new Scope(data));
    };
}

export function processJSONTemplate(obj, data) {
    if (!obj) {
        throw new Error('template is not defined');
    }

    return compileJSONTemplate(obj)(data);
}

/**
 * This function is used when user clicks on template controls.
 * It executes init and control expressions and returns the updated template argument values
 * @param {Array<String>} expressions - an array of strings which represent template expressions
 * @param {Object} data - an object with initial arguments
 * @returns {function(Object|undefined): Object} - a function that takes extra data object as an argument, that should be added to the scope and, when invoked, will execute the expressions and will return the updated data with arguments
 */
export function compileTemplateExpressions(expressions, data) {
    if (!Array.isArray(expressions)) {
        return;
    }

    return (extraData) => {
        const scope = new Scope({...data, ...(extraData || {})});
        expressions.forEach(expr => processExpression(expr, scope));
        return scope.getData();
    };
}

function compileRawString(obj) {
    if (Array.isArray(obj)) {
        return (scope) => obj.join('\n');
    }
    return (scope) => obj;
}


/**
 * @param {Array|Object} obj
 * @returns {function(Scope): any}
 */
function compile(obj) {
    if (Array.isArray(obj)) {
        return compileArray(obj);
    } else if (typeof obj === 'object') {
        if (obj.hasOwnProperty($_EXPR)) {
            return compileExpression(obj[$_EXPR])
        } else if (obj.hasOwnProperty($_STR)) {
            return compileStringExpression(obj[$_STR]);
        } else if (obj.hasOwnProperty($_RAWSTR)) {
            return compileRawString(obj[$_RAWSTR]);
        }

        const objectProcessor = compileObjectProcessor(obj);

        /** @type {function(Scope): any} */
        let evalAst = null;
        let evalScript = null;

        if (obj.hasOwnProperty($_EVAL)) {
            evalScript = Array.isArray(obj[$_EVAL]) ? obj[$_EVAL].join('\n') : obj[$_EVAL];
            if (evalScript) {
                evalAst = compileExpression(evalScript);
            }
        }

        /**
         * @property {Scope} scope
         */
        return (scope) => {
            if (evalAst) {
                try {
                    evalAst(scope);
                } catch(ex) {
                    console.error('Failed to evaluate script:\n' + evalScript);
                    console.error(ex);
                }
            }
            return objectProcessor(scope);
        };
    }

    return (scope) => obj;
}

/**
 * @param {Object} obj
 * @returns {function(Scope): Object}
 */
function compileObjectProcessor(obj) {
    const fieldBuilders = [];

    for (let key in obj) {
        if (obj.hasOwnProperty(key) && !key.startsWith('$-')) {
            fieldBuilders.push({
                key: key,
                build: compile(obj[key])
            });
        }
    }
    /** @property {Scope} scope */
    return (scope) => {
        const finalObject = {};
        fieldBuilders.forEach(fieldBuilder => {
            finalObject[fieldBuilder.key] = fieldBuilder.build(scope.newScope());
        });
        return finalObject;
    }
}

/**
 *
 * @param {String} expr
 * @returns {function(Scope): any}
 */
function compileExpression(expr) {
    const ast = parseAST(tokenizeExpression(expr), expr);
    return (scope) => {
        try {
            return ast.evalNode(scope);
        } catch(ex) {
            console.error('Failed to evaluate expression:\n' + expr);
            console.error(ex);
        }
    };
}

function processExpression(expr, scope) {
    try {
        return parseAST(tokenizeExpression(expr), expr).evalNode(scope);
    } catch(err) {
        throw new Error(`Failed to process expression. error: ${err}. Expression:\n    ${expr}`);
    }
}

/**
 *
 * @param {String} text
 * @returns {function(Scope): any}
 */
function compileStringExpression(text) {
    let t = text;
    if (Array.isArray(text)) {
        t = text.join('\n');
    }
    const parsed = parseStringExpression(t);
    return (scope) => parsed.render(scope);
}

/**
 * @param {Array} arr
 * @returns {function(Scope): any}
 */
function compileArray(arr) {
    const arrayItemBuilders = [];

    const elements = [].concat(arr);

    while(elements.length > 0) {
        const element = elements.shift();

        if (Array.isArray(element)) {
            const subArrayCompiled = compileArray(element);
            arrayItemBuilders.push({
                build: (scope) => [subArrayCompiled(scope.newScope())]
            });
        } else if (typeof element === 'object') {
            if (element.hasOwnProperty($_ELSE)) {
                throw new Error(`"${$_ELSE}" block does not follow "${$_IF}"`);
            }
            if (element.hasOwnProperty($_ELSE_IF)) {
                throw new Error(`"${$_ELSE_IF}" block does not follow "${$_IF}"`);
            }

            if (element.hasOwnProperty($_FOR)) {
                arrayItemBuilders.push(compileForLoopArrayItemBuilder(element, element[$_FOR]));
            } else if (element.hasOwnProperty($_IF)) {
                const ifStatements = [element];
                let elseStatement = null;
                while (elements.length > 0 && !Array.isArray(elements[0]) && typeof elements[0] === 'object' && elements[0].hasOwnProperty($_ELSE_IF)) {
                    ifStatements.push(elements.shift());
                }
                if (elements.length > 0 && !Array.isArray(elements[0]) && typeof elements[0] === 'object' && elements[0].hasOwnProperty($_ELSE)) {
                    elseStatement = elements.shift();
                }

                arrayItemBuilders.push(compileConditionalArrayItemBuilder(ifStatements, elseStatement));
            } else {
                const objectProcessor = compile(element);
                arrayItemBuilders.push({
                    build: (scope) => objectProcessor(scope.newScope())
                });
            }
        } else {
            arrayItemBuilders.push({
                build: (scope) => [element]
            });
        }
    }

    return (scope) => {
        return arrayItemBuilders.flatMap(builder => builder.build(scope.newScope()));
    };
}

/**
 * @param {Array<Object>} ifStatements
 * @param {Object|null} elseStatement
 */
function compileConditionalArrayItemBuilder(ifStatements, elseStatement) {
    const ifExpressions = ifStatements.map((ifObj, i) => {
        const expr = i === 0 ? ifObj[$_IF] : ifObj[$_ELSE_IF];
        return parseTemplateExpression(expr);
    });

    const statementObjectProcessors = ifStatements.map(obj => compileObjectProcessor(obj));
    const elseObjectProcessor = elseStatement ? compile(elseStatement) : null;

    return {
        build: (scope) => {
            const idx = ifExpressions.findIndex(ast => ast.evalNode(scope.newScope()));
            if (idx >= 0) {
                return [statementObjectProcessors[idx](scope.newScope())];
            }
            if (elseObjectProcessor) {
                return [elseObjectProcessor(scope.newScope())];
            }
            return [];
        }
    };
}

/**
 * @param {Array<String>|String} expr either array of string or a string containing the SchemioScript expression
 * @returns {ASTNode} compiled SchemioScript expression
 */
function parseTemplateExpression(expr) {
    const contertedExpression = Array.isArray(expr) ? expr.join('\n') : expr;
    return parseAST(tokenizeExpression(contertedExpression), contertedExpression);
}

/**
 * @param {Object} item
 * @param {Object} $for - for loop statement
 * @returns {function(Scope): Object}
 */
function compileForLoopArrayItemBuilder(item, $for) {
    const startProcessor = $for.start ? compile($for.start) : (scope) => 0;
    const stepProcessor = $for.step ? compile($for.step) : (scope) => 1;

    if (!$for.hasOwnProperty('until')) {
        throw new Error('Missing until definition in for loop');
    }
    if (!$for.hasOwnProperty('it')) {
        throw new Error('Missing iterator name definition in for loop');
    }

    const untilProcessor = compile($for.until);

    const objProcessor = compileObjectProcessor(item);

    /** @type {ASTNode} */
    let conditionExpression = null;
    if (item.hasOwnProperty($_IF)) {
        conditionExpression = parseTemplateExpression(item[$_IF]);
    }

    /**
     * @param {Scope} scope
     */
    return {
        build: (scope) => {
            const start = startProcessor(scope.newScope());
            const step = stepProcessor(scope.newScope());
            const until = untilProcessor(scope.newScope());

            const exitCondition = (v) => {
                if (step > 0) {
                    return v < until;
                }
                return v > until;
            };

            scope = scope.newScope();

            const result = [];
            for (let v = start; exitCondition(v); v += step) {
                scope.set($for.it, v);
                const shouldBeAdded = conditionExpression ? conditionExpression.evalNode(scope) : true;
                if (shouldBeAdded) {
                    result.push(objProcessor(scope));
                }
            }
            return result;
        }
    };
}