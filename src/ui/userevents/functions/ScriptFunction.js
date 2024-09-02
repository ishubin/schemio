/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { playInAnimationRegistry } from "../../animations/AnimationRegistry";
import Animation from '../../animations/Animation';
import ValueAnimation from "../../animations/ValueAnimation";
import EditorEventBus from "../../components/editor/EditorEventBus";
import { parseExpression } from "../../templater/ast";
import { Scope } from "../../templater/scope";
import htmlSanitize, { stripAllHtml } from "../../../htmlSanitize";
import { sendEventToChildren } from "./SendEventToChildrenFunction";
import { sendEventToParent } from "./SendEventToParentFuction";
import SchemeContainer from '../../scheme/SchemeContainer';
import {localPointOnItem, worldPointOnItem} from '../../scheme/ItemMath';
import myMath from "../../myMath";
import { Vector } from "../../templater/vector";
import Events from "../Events";
import Shape from "../../components/editor/items/shapes/Shape";
import ScriptFunctionEditor from '../../components/editor/properties/behavior/ScriptFunctionEditor.vue';
import { List } from "../../templater/list";
import { compileActions } from "../Compiler";
import { traverseItems } from "../../scheme/Item";
import { forEachObject } from "../../collections";

const COMPILED_SCRIPTS = Symbol('compiledScripts');

const IS_SOFT = true;
const INFINITE_LOOP = 'infinite-loop';

const initScriptDescription = `
A script that runs before the start of animation. It is only invoked in animation mode.
`;

const scriptDescription = `A Schemio script expression. In animation mode this script is being executed on every animation frame`;

function precompileItemScript(item, script, editorId) {
    const scriptAST = parseExpression(script);
    if (!scriptAST) {
        return;
    }

    if (!item.args) {
        item.args = {};
    }
    if (!item.args[COMPILED_SCRIPTS]) {
        item.args[COMPILED_SCRIPTS] = {};
    }
    item.args[COMPILED_SCRIPTS][script] = scriptAST;
}

function init(item, args, schemeContainer, userEventBus) {
    precompileItemScript(item, args.script, schemeContainer.editorId);
    if (args.initScript) {
        precompileItemScript(item, args.initScript, schemeContainer.editorId);
    }
    if (args.endScript) {
        precompileItemScript(item, args.endScript, schemeContainer.editorId);
    }
}


function execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, extraScopeData = {}) {
    if (!item.args || !item.args[COMPILED_SCRIPTS]) {
        resultCallback();
        return
    }
    const scriptAST = item.args[COMPILED_SCRIPTS][args.script];
    if (!scriptAST) {
        resultCallback();
        return;
    }

    const initScriptAST = item.args[COMPILED_SCRIPTS][args.initScript];
    const endScriptAST = item.args[COMPILED_SCRIPTS][args.endScript];

    let shouldProceedAnimating = true;
    const scope = createItemBasedScope(item, schemeContainer, userEventBus);
    for (let name in extraScopeData) {
        if (extraScopeData.hasOwnProperty(name)) {
            scope.set(name, extraScopeData[name]);
        }
    }
    scope.set('getEventName', () => eventName);
    scope.set('getEventArg', (i) => Array.isArray(eventArgs) && i < eventArgs.length ? eventArgs[i] : null);
    scope.set('stop', () => {
        shouldProceedAnimating = false;
    });
    if (args.animationType === INFINITE_LOOP) {
        scope.set('deltaTime', 0);
    } else {
        scope.set('t', 0);
    }

    if (initScriptAST) {
        initScriptAST.evalNode(scope);
    }

    const shouldPlayCallback = () => shouldProceedAnimating;

    const execScript = (t) => {
        if (args.animationType === INFINITE_LOOP) {
            // in infinite loop users should use "deltaTime" as time in seconds from last call
            scope.set('deltaTime', Math.min(0.1, t));
        } else {
            // in a regular animation users may rely on "t" which represents the progress of animation from 0 to 1
            scope.set('t', t);
        }

        scriptAST.evalNode(scope);
    };

    const onDestroy = () => {
        if (endScriptAST) {
            endScriptAST.evalNode(scope);
        }
    };

    if (args.animated) {
        if (args.animationType === INFINITE_LOOP) {
            const animation = new ScriptInfiniteLoopAnimation(item, args, schemeContainer, resultCallback, execScript, onDestroy, shouldPlayCallback)
            playInAnimationRegistry(schemeContainer.editorId, animation, item.id, 'script-infinite-loop-' + myMath.stringHash(args.script));
        } else {
            playInAnimationRegistry(schemeContainer.editorId, new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: args.transition,
                init() { },
                update(t) {
                    execScript(t);
                },
                destroy() {
                    try {
                        onDestroy();
                    } catch(err) {
                        console.error(err);
                    }
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            }), item.id, 'script_' + myMath.stringHash(args.script));
        }
        if (args.inBackground) {
            resultCallback();
        }
    } else {
        try {
            execScript(0);
        } catch (err) {
            EditorEventBus.scriptLog.$emit(schemeContainer.editorId, 'error', err.message);
            console.error(`Failed executing item script: ${args.script}`, err);
        }
        resultCallback();
    }
}


/**
 * @param {SchemeContainer} schemeContainer
 * @param {Item} componentRootItem item that represents the component root. Only used in dynamic components and is needed for isolating the script functions
 * @param {Item} funcName
 * @returns {Object}
 */
export function findSchemeDefinedScriptFunction(schemeContainer, componentRootItem, funcName) {
    let funcDef = null;
    if (componentRootItem && componentRootItem.meta && Array.isArray(componentRootItem.meta.componentScriptFunctions)) {
        funcDef = componentRootItem.meta.componentScriptFunctions.find(f => f.name === funcName);
    }
    if (!funcDef) {
        funcDef = schemeContainer.scheme.scripts.functions.find(f => f.name === funcName);
    }
    if (!funcDef) {
        return null;
    }
    return {
        init(item, args, schemeContainer, userEventBus) {
            init(item, funcDef.props, schemeContainer, userEventBus);
        },

        execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs) {
            let componentScopeData = {};
            if (componentRootItem && componentRootItem.meta && componentRootItem.meta.componentScriptScopeData) {
                componentScopeData = componentRootItem.meta.componentScriptScopeData;
            }
            const finalArgs = {...args, ...componentScopeData};

            // making sure that 'element' type arguments get converted from string to items
            // so that it makes it usable in the user script
            funcDef.args.forEach(argDef => {
                if (argDef.type === 'element' && finalArgs.hasOwnProperty(argDef.name)) {
                    const selector = finalArgs[argDef.name];
                    const items = schemeContainer.findElementsBySelector(selector, item).map(foundItem => {
                        return createItemScriptWrapper(foundItem, schemeContainer, userEventBus);
                    });
                    finalArgs[argDef.name] = new List(...items);
                }
            });
            // console.log('Executing script function with args', args);
            execute(item, funcDef.props, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, finalArgs);
        }
    };
}


export const ScriptFunction = {
    name: 'Script',

    description: 'Runs user defined script using SchemioScript language.',

    args: {
        initScript          : {name: 'Init script', type: 'script', value: '', description: initScriptDescription, depends: {animated: true}},
        script              : {name: 'Script', type: 'script', value: '', description: scriptDescription},
        endScript           : {name: 'End Script', type: 'script', value: '', description: scriptDescription, depends: {animated: true}},
        animated            : {name: 'Animated', type: 'boolean', value: false, description: 'Script is called multiple times for the duration of the animation. It has access to "t" variable (start from 0, ends at 1) which represents the relative animation time'},
        animationType       : {name: 'Animation type', type: 'choice', value: 'animation', options: ['animation', INFINITE_LOOP], depends: {animated: true}},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true, animationType: 'animation'}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true, animationType: 'animation'}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invocation of other actions'}
    },

    editorComponent: ScriptFunctionEditor,

    argsToShortString(args) {
        const s1 = args.initScript || '';
        const s2 = args.script || '';
        const script = (s1 + s2).trim();
        if (!script) {
            return 'edit script...'
        }
        return script;
    },


    // init function is called on compile phase
    // this is used to optimize parsing of the script
    init(item, args, schemeContainer, userEventBus) {
        init(item, args, schemeContainer, userEventBus);
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs) {
        execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs);
    }
};

/**
 * @param {Item} item
 * @param {SchemeContainer} schemeContainer
 */
function getItemOutlineFunction(item, schemeContainer) {
    const svgPath = schemeContainer.getSvgOutlineOfItem(item);
    if (!svgPath) {
        return null;
    }

    return {
        getLength() {
            return svgPath.getTotalLength();
        },

        /**
         * @param {Number} length - length of the path
         */
        getWorldPointAtLength(length) {
            const p = svgPath.getPointAtLength(length);
            return Vector.fromPoint(worldPointOnItem(p.x, p.y, item));
        }
    };
}

/**
 *
 * @param {Item} item
 * @param {SchemeContainer} schemeContainer
 * @param {Object} userEventBus
 * @returns {Object|null}
 */
function createItemScriptWrapper(item, schemeContainer, userEventBus) {
    if (!item) {
        return null;
    }
    const emitItemChanged = () => {
        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
    };

    const withFloatValue = (callback) => {
        return (value) => {
            const fValue = parseFloat(value);
            if (isNaN(fValue)) {
                return;
            }
            callback(fValue);
            emitItemChanged();
        };
    };

    const withTransformUpdate = (callback) => {
        return (value) => {
            const fValue = parseFloat(value);
            if (isNaN(fValue)) {
                return;
            }
            callback(fValue);
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        };
    };

    const withTextSlot = (name, callback) => {
        if (!item || !item.textSlots || !item.textSlots.hasOwnProperty(name)) {
            return;
        }
        callback(item.textSlots[name]);
        emitItemChanged();
    };

    const shape = Shape.find(item.shape);

    const itemScope = {
        findParent: () => {
            let parentId = null;
            if (item && item.meta) {
                parentId = item.meta.parentId
            }
            return createItemScriptWrapper(schemeContainer.findItemById(parentId), schemeContainer, userEventBus);
        },

        getId() {
            return item.id;
        },

        getName() {
            return item.name;
        },

        getTags() {
            const tags = Array.isArray(item.tags) ? item.tags : [];
            return new List(...tags);
        },

        setVar(name, value) {
            if (!item.args) {
                item.args = {};
            }
            if (!item.args.customVars) {
                item.args.customVars = {};
            }

            item.args.customVars[name] = value;
        },

        getVar(name, defaultValue) {
            if (!item.args || !item.args.customVars || !item.args.customVars.hasOwnProperty(name)) {
                return defaultValue;
            }
            return item.args.customVars[name];
        },

        getPosX: () => item.area.x,
        getPosY: () => item.area.y,
        getPos: () => new Vector(item.area.x, item.area.y),
        getWidth: () => item.area.w,
        getHeight: () => item.area.h,
        getAngle: () => item.area.r,
        getScaleX: () => item.area.sx,
        getScaleY: () => item.area.sy,

        /**
         * Converts local point to world
         * @param {Number} x
         * @param {Number} y
         */
        worldPoint: (x, y) => Vector.fromPoint(worldPointOnItem(x, y, item)),

        /**
         * Converts world point to local
         * @param {Number} x
         * @param {Number} y
         */
        localPoint: (x, y) => Vector.fromPoint(localPointOnItem(x, y, item)),

        getArg: (argName, defaultValue) => {
            if (item.args && item.args.hasOwnProperty(argName)) {
                return item.args[argName];
            }
            return defaultValue;
        },
        setArg: (argName, value) => {
            if (!item.args) {
                item.args = {};
            }
            item.args[argName] = value;
        },

        /**
         * Changes item translation so that its specified local point matches world point
         * @param {Number} x - x axis in local coordinates
         * @param {Number} y - y axis in local coordinates
         * @param {Number} wx - x axis in world coordinates
         * @param {Number} wy - y axis in world coordinates
         */
        matchWorld: (x, y, wx, wy) => {
            const translation = myMath.findTranslationMatchingWorldPoint( wx, wy, x, y, item.area, item.meta.transformMatrix);
            if (!translation) {
                return;
            }
            item.area.x = translation.x;
            item.area.y = translation.y;
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        },

        getWorldPos: () => Vector.fromPoint(worldPointOnItem(item.area.px * item.area.w, item.area.py * item.area.h, item)),
        setWorldPos: (x, y) => {
            let dstX = x, dstY = y;
            if (x instanceof Vector) {
                const v = x;
                dstX = v.x;
                dstY = v.y;
            }
            const p = myMath.findTranslationMatchingWorldPoint(dstX, dstY, item.area.px * item.area.w, item.area.py * item.area.h, item.area, item.meta.transformMatrix);
            if (!p) {
                return;
            }
            item.area.x = p.x;
            item.area.y = p.y;
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        },

        setAngle: withTransformUpdate(r => item.area.r = r),

        setPosX: withTransformUpdate(x => item.area.x = x),
        setPosY: withTransformUpdate(y => item.area.y = y),
        setPos: (x, y) => {
            let dstX = x, dstY = y;
            if (x instanceof Vector) {
                const v = x;
                dstX = v.x;
                dstY = v.y;
            }

            item.area.x = dstX;
            item.area.y = dstY;
            emitItemChanged();
            schemeContainer.updateChildTransforms(item);
            schemeContainer.readjustItemAndDescendants(item.id, IS_SOFT);
        },
        setWidth: withTransformUpdate(w => item.area.w = w),
        setHeight: withTransformUpdate(h => item.area.h = h),
        setScaleX: withTransformUpdate(sx => item.area.sx = sx),
        setScaleY: withTransformUpdate(sy => item.area.sy = sy),

        getOpacity: () => item.opacity,
        getSelfOpacity: () => item.selfOpacity,
        isVisible: () => item.visible && item.opacity !== 0,

        setOpacity: withFloatValue(opacity => item.opacity = opacity),
        setSelfOpacity: withFloatValue(opacity => item.SelfOpacity = opacity),

        getText: (slotName) => {
            if (!item.textSlots || !item.textSlots[slotName]) {
                return '';
            }
            const text = item.textSlots[slotName].text || '';
            return stripAllHtml(text.trim());
        },
        setText: (slotName, text) => withTextSlot(slotName, slot => slot.text = htmlSanitize('' + text)),
        setTextColor: (slotName, color) => withTextSlot(slotName, slot => slot.color = '' + color),
        setTextSize: (slotName, size) => {
            if (!isNaN(size)) {
                withTextSlot(slotName, slot => slot.fontSize = size);
            }
        },

        show() {
            item.visible = true;
            emitItemChanged();
        },

        hide() {
            item.visible = false;
            emitItemChanged();
        },

        sendEvent(eventName, ...args) {
            userEventBus.emitItemEvent(item.id, eventName, ...args);
        },

        sendEventToChildren(eventName, ...args) {
            sendEventToChildren(item, eventName, userEventBus, args);
        },

        sendEventToParent(eventName, ...args) {
            sendEventToParent(item, eventName, userEventBus, schemeContainer, args);
        },

        findChildItemByName(name) {
            return createItemScriptWrapper(findChildItemByName(item, name), schemeContainer, userEventBus);
        },

        findChildItemsByTag(tag) {
            const items = findChildItemsByTag(item, tag);
            return new List(...items.map(item => createItemScriptWrapper(item, schemeContainer, userEventBus)));
        },

        distanceToItem(anotherItem) {
            return distanceBetweenItems(item, anotherItem);
        },
        getValue() {
            if (item.args && item.args.hasOwnProperty('value')) {
                return item.args.value;
            }
            return 0;
        },
        setValue(value) {
            if (!item.args) {
                item.args = {};
            }
            item.args.value = value;
            EditorEventBus.item.userEvent.$emit(schemeContainer.editorId, item.id, Events.standardEvents.valueChange.id, value);
            emitItemChanged();
        },

        duplicate(newName) {
            const clonedItems = schemeContainer.cloneItems([item]);
            const clonedItem = clonedItems[0];
            if (newName) {
                clonedItem.name = newName;
            }
            const parentItem = item.meta.parentId ? schemeContainer.findItemById(item.meta.parentId) : null;
            schemeContainer.addItem(clonedItem, parentItem);

            traverseItems([clonedItem], cItem => {
                if (cItem.behavior && Array.isArray(cItem.behavior.events)) {
                    cItem.behavior.events.forEach(event => {
                        const eventCallback = compileActions(schemeContainer, null, cItem, event.actions);
                        if (event.event === Events.standardEvents.init.id) {
                            eventCallback(userEventBus, userEventBus.revision, cItem.id, Events.standardEvents.init.id);
                        } else {
                            userEventBus.subscribeItemEvent(cItem.id, event.event, eventCallback);
                        }
                    });
                }
            });
            return createItemScriptWrapper(clonedItem, schemeContainer, userEventBus);
        },


        remove() {
            schemeContainer.deleteItem(item);
            userEventBus.clearEventsForItem(item.id);
        },

        // remounts item to another item
        mount(otherItem) {
            if (!otherItem) {
                schemeContainer.remountItemToRoot(item.id)
            } else {
                schemeContainer.remountItemInsideOtherItemAtTheBottom(item.id, otherItem.getId());
            }
        },
        mountRoot: () => schemeContainer.remountItemToRoot(item.id),

        getOutline: () => getItemOutlineFunction(item, schemeContainer),

        ...generateGettersAndSettersForShapeProps(item, shape, schemeContainer)
    };

    if (shape && shape.scriptFunctions) {
        const updatedScope = {
            ...itemScope,
            ...shape.scriptFunctions(schemeContainer.editorId, schemeContainer, item),
        };

        updatedScope.debugItem = createDebugItemFunc(updatedScope, item, schemeContainer.editorId);
        return updatedScope;
    }

    itemScope.debugItem = createDebugItemFunc(itemScope, item, schemeContainer.editorId);

    return itemScope;
}


/**
 * @param {Item} item
 * @param {*} shape
 * @param {SchemeContainer} schemeContainer
 */
function generateGettersAndSettersForShapeProps(item, shape, schemeContainer) {
    if (!shape) {
        return {};
    }
    const shapeArgs = Shape.getShapeArgs(shape);

    const methods = {};

    forEachObject(shapeArgs, (arg, name) => {
        const upperName = name.substring(0, 1).toUpperCase() + name.substring(1);
        methods['set' + upperName] = createShapePropSetter(item, name, arg, schemeContainer);
        methods['get' + upperName] = createShapePropGetter(item, name);
    });
    return methods;
}

/**
 *
 * @param {Item} item
 * @param {String} name
 * @param {*} argDef
 * @param {SchemeContainer} schemeContainer
 * @returns
 */
function createShapePropSetter(item, name, argDef, schemeContainer) {
    return (value) => {
        item.shapeProps[name] = value;
        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id, 'shapeProps.' +  name);
    };
}

function createShapePropGetter(item, name) {
    return () => {
        return item.shapeProps[name];
    };
}

function findChildItemByName(item, name) {
    if (!item || !Array.isArray(item.childItems)) {
        return null;
    }

    let searchedItems = [].concat(item.childItems);

    // doing breadth search first
    while(searchedItems.length > 0) {
        const childItem = searchedItems.shift();
        if (!childItem) {
            return null;
        }
        if (childItem.name === name) {
            return childItem;
        }

        if (Array.isArray(childItem.childItems)) {
            searchedItems = searchedItems.concat(childItem.childItems);
        }
    }

    return null;
}

/**
 * @param {Item} item
 * @param {String} tag
 * @returns {Array<Item>}
 */
function findChildItemsByTag(item, tag) {
    if (!item || !Array.isArray(item.childItems)) {
        return [];
    }

    /** @type {Array<Item>} */
    let searchedItems = [].concat(item.childItems);

    const results = [];

    // doing breadth search first
    while(searchedItems.length > 0) {
        const childItem = searchedItems.shift();
        if (!childItem) {
            return results;
        }
        if (Array.isArray(childItem.tags) && childItem.tags.findIndex(itemTag => itemTag === tag) >= 0) {
            results.push(childItem);
        }

        if (Array.isArray(childItem.childItems)) {
            searchedItems = searchedItems.concat(childItem.childItems);
        }
    }

    return results;
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
    const cache = new Map();
    const mainScopeData = schemeContainer.mainScopeData || {};
    return new Scope({
        ...mainScopeData,
        ...itemInterface,
        findItemById: (id) => {
            return createItemScriptWrapper(schemeContainer.findItemById(id), schemeContainer, userEventBus);
        },
        findItemByName: (name) => {
            return createItemScriptWrapper(schemeContainer.findItemByName(name), schemeContainer, userEventBus);
        },
        log: createLogFunction(schemeContainer.editorId),
    }, null, createItemByNameProvider(schemeContainer, userEventBus, cache));
}


export function createMainScriptScope(schemeContainer, userEventBus) {
    const cache = new Map();
    const mainScopeData = schemeContainer.mainScopeData || {};
    return new Scope({
        ...mainScopeData,
        findItemById: (id) => {
            return createItemScriptWrapper(schemeContainer.findItemById(id), schemeContainer, userEventBus);
        },
        findItemByName: (name) => {
            return createItemScriptWrapper(schemeContainer.findItemByName(name), schemeContainer, userEventBus);
        },
        log: createLogFunction(schemeContainer.editorId)
    }, null, createItemByNameProvider(schemeContainer, userEventBus, cache));
}


/**
 * @param {SchemeContainer} schemeContainer
 * @param {*} userEventBus
 * @param {Map} cache
 */
function createItemByNameProvider(schemeContainer, userEventBus, cache) {
    return (name) => {
        const cachedItem = cache.get(name);
        if (cachedItem) {
            return cachedItem;
        }
        const item = schemeContainer.findItemByName(name);
        if (!item) {
            const errMsg = `Could not refer to item by name "${name}"`;
            EditorEventBus.scriptLog.$emit(schemeContainer.editorId, 'error', errMsg)
            console.error(errMsg);
            return null;
        }

        const itemWrapper = createItemScriptWrapper(item, schemeContainer, userEventBus);
        cache.set(name, itemWrapper);
        return itemWrapper;
    };
}

class ScriptInfiniteLoopAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback, scriptExecutor, onDestroy, shouldPlayCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.scriptExecutor = scriptExecutor;
        this.onDestroy = onDestroy;

        /**
         * Callback that is used by animation to detect whether it should keep playing
         * @type {function:() Boolean} */
        this.shouldPlayCallback = shouldPlayCallback;
    }

    init() {
        return this.shouldPlayCallback();
    }

    play(dt) {
        try {
            this.scriptExecutor(Math.min(100.0, dt) / 1000);
        } catch(err) {
            console.error(err);
            return false;
        }
        return this.shouldPlayCallback();
    }

    destroy() {
        if (this.onDestroy) {
            try {
                this.onDestroy();
            } catch(err) {
                console.error(err);
            }
        }
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

function distanceBetweenItems(item1, item2) {
    const p1 = worldPointOnItem(item1.area.px * item1.area.w, item1.area.py * item1.area.h, item1);
    const p2 = worldPointOnItem(item2.area.px * item2.area.w, item2.area.py * item2.area.h, item2);

    return myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y)
}


function createDebugItemFunc(itemScope, item, editorId) {
    return () => {
        let text = `Item "${item.name}"\nx = ${item.area.x} y = ${item.area.y} width = ${item.area.w} height = ${item.area.h}`;
        const wp = worldPointOnItem(0, 0, item);
        text += `\nWorld: x = ${wp.x} y = ${wp.x}`;
        text += `\nRotation: ${item.area.r}`;
        text += `\nShape: ${item.shape}`;
        text += '\nFunctions:';
        for (let key in itemScope) {
            text += `\n    - ${key}`;
        }

        EditorEventBus.scriptLog.$emit(editorId, 'info', text);
        console.log(text);
    }
}

function createLogFunction(editorId) {
    return (...args) => {
        EditorEventBus.scriptLog.$emit(editorId, 'info', args.join(' '))
        console.log(...args);
    }
}