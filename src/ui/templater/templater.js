import { ASTNode, parseExpression } from "./ast";
import { List } from "./list";
import { Scope } from './scope';
import { parseStringExpression } from "./strings";


const $_DEF = '$-def:';
const $_REF = '$-ref';
const $_EXPR = '$-expr';
const $_STR = '$-str';
const $_RAWSTR = '$-rawstr';
const $_IF = '$-if';
const $_ELSE_IF = '$-else-if';
const $_ELSE = '$-else';
const $_FOR = '$-for';
const $_FOREACH = '$-foreach';
const $_EXTEND = '$-extend';
const $_RECURSE = '$-recurse';
const $_EVAL = '$-eval';


/**
 * Compiles the specified template and returns a function that will generated the template object
 * @param {Object} obj - template object
 * @returns {function(Object): Object} - function that takes an object as input scope and returns processed object from template
 */
export function compileJSONTemplate(obj) {
    const compiled = compile(obj, new Map());
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
        expressions = [expressions];
    }

    const fullScript = expressions.join('\n');
    const expressionNode = parseExpression(fullScript);

    return (extraData) => {
        const scope = new Scope({...data, ...(extraData || {})});
        expressionNode.evalNode(scope);
        return scope.getData();
    };
}


/**
 * This function is used for processing of template editor panels.
 * It executes the expression and returns its result
 * @param {String} expression
 * @param {Object} data
 * @returns {function(Object|undefined): Object} - a function that takes extra data object as an argument, that should be added to the scope and, when invoked, will execute the expressions and will return the updated data with arguments
 */
export function compileTemplateCall(expression, data) {
    const expr = parseExpression(expression);

    return (extraData) => {
        const scope = new Scope({...data, ...(extraData || {})});
        return expr.evalNode(scope);
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
 * @param {Map<String, any>} customDefinitions contains named fields that were defined using '$-def:' prefix
 * @returns {function(Scope): any}
 */
function compile(obj, customDefinitions) {
    if (obj === null) {
        return () => null;
    }
    if (Array.isArray(obj)) {
        return compileArray(obj, customDefinitions);
    } else if (typeof obj === 'object') {
        if (obj.hasOwnProperty($_EXPR)) {
            return compileExpression(obj[$_EXPR])
        } else if (obj.hasOwnProperty($_STR)) {
            return compileStringExpression(obj[$_STR]);
        } else if (obj.hasOwnProperty($_RAWSTR)) {
            return compileRawString(obj[$_RAWSTR]);
        } else if (obj.hasOwnProperty($_RECURSE)) {
            return compileRecursiveBuilder(obj, obj[$_RECURSE], customDefinitions).build;
        } else if (obj.hasOwnProperty($_REF)) {
            const refName = obj[$_REF];
            if (!customDefinitions.has(refName)) {
                throw new Error('Unknown reference: ' + refName);
            }
            const refValue = customDefinitions.get(refName);
            return compile(refValue, customDefinitions);
        }

        const objectProcessor = compileObjectProcessor(obj, customDefinitions);

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
 * @param {Map<String, any>} customDefinitions
 * @returns {function(Scope): Object}
 */
function compileObjectProcessor(obj, customDefinitions) {
    const fieldBuilders = [];

    let extendBuilder = null;

    if (obj.hasOwnProperty($_EXTEND)) {
        extendBuilder = compile(obj[$_EXTEND], customDefinitions);
    }

    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key.startsWith($_DEF)) {
                customDefinitions.set(key.substring($_DEF.length).trim(), obj[key]);
            }
            if (!key.startsWith('$-')) {
                fieldBuilders.push({
                    key: key,
                    build: compile(obj[key], customDefinitions)
                });
            }
        }
    }
    /** @property {Scope} scope */
    return (scope) => {
        const finalObject = extendBuilder ? extendBuilder(scope.newScope()) : {};
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
    const ast = parseExpression(expr);
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
        return parseExpression(expr).evalNode(scope);
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
 * @param {Map<String, any>} customDefinitions
 * @returns {function(Scope): any}
 */
function compileArray(arr, customDefinitions) {
    const arrayItemBuilders = [];

    const elements = [].concat(arr);

    while(elements.length > 0) {
        const element = elements.shift();

        if (Array.isArray(element)) {
            const subArrayCompiled = compileArray(element, customDefinitions);
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
                arrayItemBuilders.push(compileForLoopArrayItemBuilder(element, element[$_FOR], customDefinitions));
            } else if (element.hasOwnProperty($_FOREACH)) {
                arrayItemBuilders.push(compileForEachLoopArrayItemBuilder(element, element[$_FOREACH], customDefinitions));
            } else if (element.hasOwnProperty($_RECURSE)) {
                arrayItemBuilders.push(compileRecursiveBuilder(element, element[$_RECURSE], customDefinitions));
            } else if (element.hasOwnProperty($_IF)) {
                const ifStatements = [element];
                let elseStatement = null;
                while (elements.length > 0 && !Array.isArray(elements[0]) && typeof elements[0] === 'object' && elements[0].hasOwnProperty($_ELSE_IF)) {
                    ifStatements.push(elements.shift());
                }
                if (elements.length > 0 && !Array.isArray(elements[0]) && typeof elements[0] === 'object' && elements[0].hasOwnProperty($_ELSE)) {
                    elseStatement = elements.shift();
                }

                arrayItemBuilders.push(compileConditionalArrayItemBuilder(ifStatements, elseStatement, customDefinitions));
            } else {
                const objectProcessor = compile(element, customDefinitions);
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
 * @param {Map<String, any>} customDefinitions
 */
function compileConditionalArrayItemBuilder(ifStatements, elseStatement, customDefinitions) {
    const ifExpressions = ifStatements.map((ifObj, i) => {
        const expr = i === 0 ? ifObj[$_IF] : ifObj[$_ELSE_IF];
        return parseTemplateExpression(expr);
    });

    const statementObjectProcessors = ifStatements.map(obj => compileObjectProcessor(obj, customDefinitions));
    const elseObjectProcessor = elseStatement ? compile(elseStatement, customDefinitions) : null;

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
    const convertedExpression = Array.isArray(expr) ? expr.join('\n') : expr;
    return parseExpression(convertedExpression);
}


/**
 * @param {Object} item
 * @param {Object} $recurse - recurse statement
 * @param {Map<String, any>} customDefinitions
 * @returns {function(Scope): Object}
 */
function compileRecursiveBuilder(item, $recurse, customDefinitions) {
    if (!$recurse.hasOwnProperty('object')) {
        throw new Error('Missing "object" definition for $-recurse statement')
    }
    if (!$recurse.hasOwnProperty('it')) {
        throw new Error('Missing "it" definition for $-recurse statement')
    }
    if (!$recurse.hasOwnProperty('children')) {
        throw new Error('Missing "children" definition for $-recurse statement')
    }
    if (!$recurse.hasOwnProperty('dstChildren')) {
        throw new Error('Missing "dstChildren" definition for $-recurse statement')
    }

    const sourceObjectProcessor = compile($recurse.object, customDefinitions);
    const childrenFetcher = parseExpression($recurse.children);
    const iteratorName = $recurse.it;
    const dstChildrenFieldName = $recurse.dstChildren;
    const itemClone = {...item};
    delete itemClone[$_RECURSE];
    const itemProcessor = compileObjectProcessor(itemClone);

    /**
     * @param {Scope} scope
     * @param {Object} sourceObject
     */
    function buildObject(scope, sourceObject) {
        if (!sourceObject) {
            return sourceObject;
        }
        const data = {};
        data[iteratorName] = sourceObject;
        const iteratorScope = scope.newScope(data);

        const processedObj = itemProcessor(iteratorScope);
        const children = childrenFetcher.evalNode(iteratorScope);
        if (children instanceof List || Array.isArray(children)) {
            const processedChildren = [];
            children.forEach(childObj => {
                processedChildren.push(buildObject(scope, childObj));
            });
            if (processedObj.hasOwnProperty(dstChildrenFieldName) && Array.isArray(processedObj[dstChildrenFieldName])) {
                processedObj[dstChildrenFieldName] = processedObj[dstChildrenFieldName].concat(processedChildren);
            } else {
                processedObj[dstChildrenFieldName] = processedChildren;
            }
        }
        return processedObj;
    }

    return {
        build: (scope) => {
            const sourceObject = sourceObjectProcessor(scope);
            return buildObject(scope, sourceObject);
        }
    };
}

/**
 * @param {Object} item
 * @param {Object} $foreach - for loop statement
 * @param {Map<String, any>} customDefinitions
 * @returns {function(Scope): Object}
 */
function compileForEachLoopArrayItemBuilder(item, $foreach, customDefinitions) {
    if (!$foreach.hasOwnProperty('source')) {
        throw new Error('Missing source definition in foreach loop');
    }
    if (!$foreach.hasOwnProperty('it')) {
        throw new Error('Missing iterator (it) name definition in foreach loop');
    }

    const sourceProcessor = compileExpression($foreach.source);

    const objProcessor = compileObjectProcessor(item, customDefinitions);

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
            const source = sourceProcessor(scope);
            let iterator = () => {};


            if (source instanceof List || Array.isArray(source)) {
                iterator = (callback) => {
                    source.forEach((value, idx) => {
                        callback(value, idx);
                    });
                };
            }
            scope = scope.newScope();

            const result = [];
            iterator((value, idx) => {
                scope.set($foreach.it, value);
                const shouldBeAdded = conditionExpression ? conditionExpression.evalNode(scope) : true;
                if (shouldBeAdded) {
                    result.push(objProcessor(scope));
                }
            });
            return result;
        }
    };
}

/**
 * @param {Object} item
 * @param {Object} $for - for loop statement
 * @param {Map<String, any>} customDefinitions
 * @returns {function(Scope): Object}
 */
function compileForLoopArrayItemBuilder(item, $for, customDefinitions) {
    const startProcessor = $for.start ? compile($for.start, customDefinitions) : (scope) => 0;
    const stepProcessor = $for.step ? compile($for.step, customDefinitions) : (scope) => 1;

    if (!$for.hasOwnProperty('until')) {
        throw new Error('Missing until definition in for loop');
    }
    if (!$for.hasOwnProperty('it')) {
        throw new Error('Missing iterator name definition in for loop');
    }

    const untilProcessor = compile($for.until, customDefinitions);

    const objProcessor = compileObjectProcessor(item, customDefinitions);

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