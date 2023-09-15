import { Scope, parseAST } from "./ast";
import { parseStringExpression } from "./strings";
import { tokenizeExpression } from "./tokenizer";


const $_EXPR = '$-expr';
const $_STR = '$-str';
const $_IF = '$-if';
const $_ELSE_IF = '$-else-if';
const $_ELSE = '$-else';
const $_FOR = '$-for';


export function processJSONTemplate(obj, data) {
    if (!obj) {
        throw new Error('template is not defined');
    }

    return process(obj, new Scope(data));
}

function process(obj, scope) {
    if (Array.isArray(obj)) {
        return processArray(obj, scope);
    } else if (typeof obj === 'object') {
        if (obj.hasOwnProperty($_EXPR)) {
            return processExpression(obj[$_EXPR], scope);
        } else if (obj.hasOwnProperty($_STR)) {
            return processStringExpression(obj[$_STR], scope);
        }
        return processObject(obj, scope);
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
    return parseAST(tokenizeExpression(expr)).evalNode(scope);
}

function processStringExpression(text, scope) {
    return parseStringExpression(text).render(scope);
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
            result.push(processArray(item, scope));
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

        const value = scope.get($if.arg);
        const expected = $if.hasOwnProperty('values') ? process($if.values, scope) : process($if.value, scope);
        if (conditionMatches(value, $if.op, expected)) {
            conditionState.setPreviousCondition(true);
            result.push(processObject(item, scope));
        } else {
            conditionState.setPreviousCondition(false);
        }
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


const conditionOperators = {
    '=': (value, expected) => {
        if (Array.isArray(expected)) {
            for (let i = 0; i < expected.length; i++) {
                if (expected[i] === value) {
                    return true;
                }
            }
            return false;
        }
        return value === expected;
    },
    '!=': (value, expected) => {
        if (Array.isArray(expected)) {
            for (let i = 0; i < expected.length; i++) {
                if (expected[i] === value) {
                    return false;
                }
            }
            return true;
        }
        return value !== expected;
    },
}

function conditionMatches(value, op, expected) {
    if (!conditionOperators.hasOwnProperty(op)) {
        throw new Error(`Unknown condition operator: ${op}`);
    }
    return conditionOperators[op](value, expected);
}