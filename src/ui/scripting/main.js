import shortid from "shortid";
import EditorEventBus from "../components/editor/EditorEventBus";
import { Scope } from "../templater/scope";
import { createConnectionsFunctions } from "./connections";
import { createItemScriptWrapper } from "./item";

export function createMainScriptScope(schemeContainer, userEventBus) {
    const mainScopeData = schemeContainer.mainScopeData || {};
    return new Scope({
        ...mainScopeData,
        ...buildMainScopeFunctions(schemeContainer, userEventBus)
    }, null, createItemByNameProvider(schemeContainer, userEventBus));
}

/**
 *
 * @param {Item} item
 * @param {SchemeContainer} schemeContainer
 * @param {*} userEventBus
 * @returns {Scope}
 */
export function createItemBasedScope(item, schemeContainer, userEventBus) {
    const itemInterface = createItemScriptWrapper(item, schemeContainer, userEventBus);
    const mainScopeData = schemeContainer.mainScopeData || {};
    return new Scope({
        ...mainScopeData,
        ...itemInterface,
        this: itemInterface,
        ...buildMainScopeFunctions(schemeContainer, userEventBus)
    }, null, createItemByNameProvider(schemeContainer, userEventBus));
}


export function buildMainScopeFunctions(schemeContainer, userEventBus) {
    return {
        findItemById: (id) => {
            return createItemScriptWrapper(schemeContainer.findItemById(id), schemeContainer, userEventBus);
        },
        findItemByName: (name) => {
            return createItemScriptWrapper(schemeContainer.findItemByName(name), schemeContainer, userEventBus);
        },
        buildItem: (shape = 'rect', name = '', x = 0, y = 0, w = 100, h = 100) => {
            const item = schemeContainer.addItem({
                it: shortid.generate(),
                shape, name,
                area: {x, y, w, h, r: 0, px: 0.5, py: 0.5, sx: 1, sy: 1},
                shapeProps: {}
            });
            return createItemScriptWrapper(item, schemeContainer, userEventBus);
        },
        log: createLogFunction(schemeContainer.editorId),
        Connections: createConnectionsFunctions(schemeContainer, userEventBus)
    };
}

/**
 * @param {SchemeContainer} schemeContainer
 * @param {*} userEventBus
 */
export function createItemByNameProvider(schemeContainer, userEventBus) {
    return (name) => {
        const item = schemeContainer.findItemByName(name);
        if (!item) {
            return null;
        }

        return createItemScriptWrapper(item, schemeContainer, userEventBus);
    };
}

function createLogFunction(editorId) {
    return (...args) => {
        EditorEventBus.scriptLog.$emit(editorId, 'info', args.join(' '))
        console.log(...args);
    }
}