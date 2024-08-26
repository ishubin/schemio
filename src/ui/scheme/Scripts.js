import { parseExpression } from "../templater/ast";
import { createMainScriptScope } from "../userevents/functions/ScriptFunction";
import { traverseItems } from "./Item";

/**
 * Takes global scripts (main and functions) and replaces all the function references
 * @param {SchemeContainer} schemeContainer
 * @param {SchemioDoc} scheme
 * @param {Item} componentItem item that the dynamic component was attached to
 * @param {Array<Item>} items
 * @param {*} userEventBus
 */
export function isolateScriptFunctionsForComponent(schemeContainer, scheme, componentItem, items, userEventBus) {
    if (!componentItem.meta) {
        componentItem.meta = {};
    }

    const mainSource = scheme.scripts.main.source;
    if (mainSource) {
        try {
            const astNode = parseExpression(mainSource);
            const scope = createMainScriptScope(schemeContainer, userEventBus);
            astNode.evalNode(scope);
            componentItem.meta.componentScriptScopeData = scope.data;
        } catch (ex) {
            console.error(ex);
        }
    }

    componentItem.meta.componentScriptFunctions = [];
    scheme.scripts.functions.forEach(funcDef => {
        componentItem.meta.componentScriptFunctions.push({
            ...funcDef,
            name: `${componentItem.id}/${funcDef.name}`
        });
    });

    traverseItems(items, item => {
        if (!item.behavior && !Array.isArray(item.behavior.events)) {
            return;
        }
        item.behavior.events.forEach(event => {
            if (Array.isArray(event.actions)) {
                event.actions.forEach(action => {
                    const method = action.method;
                    if (method.startsWith('function:')) {
                        action.method = `function:${componentItem.id}/${method.substring(9)}`;
                    }
                });
            }
        });
    });

}
