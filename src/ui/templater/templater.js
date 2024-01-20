import { Scope, parseAST } from "./ast";
import { parseStringExpression } from "./strings";
import { tokenizeExpression } from "./tokenizer";


const $_EXPR = '$-expr';
const $_STR = '$-str';
const $_IF = '$-if';
const $_ELSE_IF = '$-else-if';
const $_ELSE = '$-else';
const $_FOR = '$-for';
const $_EVAL = '$-eval';


export function processJSONTemplate(obj, data) {
    if (!obj) {
        throw new Error('template is not defined');
    }

    return process(obj, new Scope(data));
}

/**
 * This function is used when user clicks on template controls.
 * It executes init and control expressions and returns the updated template argument values
 * @param {Array<String>} expressions - an array of strings which represent template expressions
 * @param {Object} data - an object with initial arguments
 * @returns {Object} - mutated arguments that were changed by the executed epxressions
 */
export function processTemplateExpressions(expressions, data) {
    if (!Array.isArray(expressions)) {
        return;
    }
    const scope = new Scope(data);
    expressions.forEach(expr => processExpression(expr, scope));
    return scope.getData();
}

/**
 *
 * @param {*} obj
 * @param {Scope} scope
 * @returns
 */
function process(obj, scope) {
    if (Array.isArray(obj)) {
        return processArray(obj, scope.newScope());
    } else if (typeof obj === 'object') {
        if (obj.hasOwnProperty($_EXPR)) {
            return processExpression(obj[$_EXPR], scope);
        } else if (obj.hasOwnProperty($_STR)) {
            return processStringExpression(obj[$_STR], scope);
        } else if (obj.hasOwnProperty($_EVAL)) {
            const $eval = obj[$_EVAL];
            if (Array.isArray) {
                $eval.forEach(expr => processExpression(expr, scope));
            } else {
                return processExpression($eval, scope)
            }
        }
        return processObject(obj, scope.newScope());
    }

    return obj;
}

function processObject(obj, scope) {
    const result = {};

    for (let field in obj) {
        if (obj.hasOwnProperty(field)) {
            if (!field.startsWith('$-')) {
                result[field] = process(obj[field], scope);
            }
        }
    }
    return result;
}

function processExpression(expr, scope) {
    try {
        return parseAST(tokenizeExpression(expr), expr).evalNode(scope);
    } catch(err) {
        throw new Error(`Failed to process expression. error: ${err}. Expression:\n    ${expr}`);
    }
}

function processStringExpression(text, scope) {
    let t = text;
    if (Array.isArray(text)) {
        t = text.join('\n');
    }
    return parseStringExpression(t).render(scope);
}


class ConditionState {
    constructor() {
        this.ifExecuted = false;
        this.ifDefined = false;
    }

    setPreviousCondition(executed) {
        this.ifExecuted = executed;
        this.ifDefined = true;
    }

    previousConditionDefined() {
        return this.ifDefined;
    }

    previousConditionExecuted() {
        return this.ifExecuted;
    }

    reset() {
        this.ifExecuted = false;
        this.ifDefined = false;
    }
}

function processArray(arr, scope) {
    let result = [];

    const conditionState = new ConditionState();

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];

        if (Array.isArray(item)) {
            result.push(processArray(item, scope.newScope()));
        } else if (typeof item === 'object') {
            result = result.concat(processArrayItem(item, scope, conditionState));
        } else {
            result.push(item);
        }
    }

    return result;
}

/**
 *
 * @param {Object} item
 * @param {Scope} scope
 * @param {ConditionState} conditionState
 * @returns
 */
function processArrayItem(item, scope, conditionState) {
    const result = [];

    if (item.hasOwnProperty($_IF) || item.hasOwnProperty($_ELSE_IF)) {
        let $if = null;
        if (item.hasOwnProperty($_ELSE_IF)) {
            if (!conditionState.previousConditionDefined()) {
                return [];
            }
            if (conditionState.previousConditionExecuted()) {
                return [];
            }
            $if = item[$_ELSE_IF];
        } else {
            $if = item[$_IF];
        }

        const conditionResult = parseAST(tokenizeExpression($if), $if).evalNode(scope);
        if (conditionResult) {
            result.push(processObject(item, scope));
        }
        conditionState.setPreviousCondition(conditionResult);
    } else if (item.hasOwnProperty($_ELSE)) {
        if (conditionState.previousConditionDefined() && !conditionState.previousConditionExecuted()) {
            conditionState.reset();
            return [process(item, scope)];
        }
        conditionState.reset();
    } else if (item.hasOwnProperty($_FOR)) {
        conditionState.reset();
        return processArrayLoop(item, item[$_FOR], scope);
    } else {
        conditionState.reset();
        return [process(item, scope)];
    }
    return result;
}

/**
 *
 * @param {Object} item
 * @param {Object} $for
 * @param {Scope} scope
 * @returns
 */
function processArrayLoop(item, $for, scope) {
    const result = [];
    let start = 0;
    if ($for.hasOwnProperty('start')) {
        start = process($for.start, scope);
    }

    if (!$for.hasOwnProperty('until')) {
        throw new Error('Missing until definition in for loop');
    }
    if (!$for.hasOwnProperty('it')) {
        throw new Error('Missing iterator name definition in for loop');
    }

    let step = 1;
    let until = process($for.until, scope);
    if ($for.hasOwnProperty('step')) {
        step = process($for.step, scope);
    }

    if (step === 0) {
        throw new Error('Cannot iterate for loop with 0 step');
    }

    const exitCondition = (v) => {
        if (step > 0) {
            return v < until;
        }
        return v > until;
    };

    scope = new Scope({}, scope);
    for (let v = start; exitCondition(v); v += step) {
        scope.set($for.it, v);
        result.push(process(item, scope));
    }
    return result;
}