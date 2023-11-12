/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { playInAnimationRegistry } from "../../animations/AnimationRegistry";
import ValueAnimation from "../../animations/ValueAnimation";
import EditorEventBus from "../../components/editor/EditorEventBus";
import { Scope, parseAST } from "../../templater/ast";
import { tokenizeExpression } from "../../templater/tokenizer";
import htmlSanitize from "../../../htmlSanitize";
import { sendEventToChildren } from "./SendEventToChildrenFunction";
import { sendEventToParent } from "./SendEventToParentFuction";

export default {
    name: 'Script',

    description: 'Runs user defined script using Schemio expression language.',

    args: {
        script              : {name: 'Script', type: 'script', value: '', description: 'A Schemio script expression'},
        animated            : {name: 'Animated', type: 'boolean', value: false, description: 'Script is called multiple times for the duration of the animation. It has access to "t" variable (start from 0, ends at 1) which represents the relative animation time'},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    argsToShortString(args) {
        const script = args.script.trim();
        if (!script) {
            return '(...)';
        }
        return script;
    },

    // init function is called on compile phase
    // this is used to optimize parsing of the script
    init(item, args, schemeContainer, userEventBus) {
        console.log('init script');
        const scriptAST = parseItemScript(args.script);
        if (!scriptAST) {
            return;
        }

        if (!item.args) {
            item.args = {};
        }
        if (!item.args.compiledScripts) {
            item.args.compiledScripts = {};
        }
        item.args.compiledScripts[args.script] = scriptAST;
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs) {
        console.log('execute script');
        if (!item.args || !item.args.compiledScripts) {
            resultCallback();
            return
        }
        const scriptAST = item.args.compiledScripts[args.script];
        if (!scriptAST) {
            resultCallback();
            return;
        }

        const scope = createItemBasedScope(item, schemeContainer, userEventBus);

        const execScript = (t) => {
            scope.set('t', t);
            scope.set('getEventName', () => eventName);
            scope.set('getEventArg', (i) => Array.isArray(eventArgs) && i < eventArgs.length ? eventArgs[i] : null);
            scriptAST.evalNode(scope);
        };

        if (args.animated) {
            playInAnimationRegistry(schemeContainer.editorId, new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: args.transition,
                init() { },
                update(t) {
                    execScript(t);
                },
                destroy() {
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            }), item.id, this.name + args.script);
            if (args.inBackground) {
                resultCallback();
            }
        } else {
            try {
                execScript(0);
            } catch (err) {
                console.error(`Failed executing item script: ${args.script}`, err);
            }
            resultCallback();
        }
    }
}

function createItemScriptWrapper(item, schemeContainer, userEventBus) {
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

    const withTextSlot = (name, callback) => {
        if (!item || !item.textSlots || !item.textSlots.hasOwnProperty(name)) {
            return;
        }
        callback(item.textSlots[name]);
        emitItemChanged();
    };

    return {
        exists() {
            return item !== null;
        },

        getId() {
            if (!item) {
                return item.id;
            }
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
        getWidth: () => item.area.w,
        getHeight: () => item.area.h,
        getAngle: () => item.area.r,
        getScaleX: () => item.area.sx,
        getScaleY: () => item.area.sy,

        setPosX: withFloatValue(x => item.area.x = x),
        setPosY: withFloatValue(y => item.area.y = y),
        setWidth: withFloatValue(w => item.area.w = w),
        setHeight: withFloatValue(h => item.area.h = h),
        setScaleX: withFloatValue(sx => item.area.sx = sx),
        setScaleY: withFloatValue(sy => item.area.sy = sy),

        getOpacity: () => item.opacity,
        getSelfOpacity: () => item.selfOpacity,
        isVisible: () => item.visible && item.opacity !== 0,

        setOpacity: withFloatValue(opacity => item.opacity = opacity),
        setSelfOpacity: withFloatValue(opacity => item.SelfOpacity = opacity),

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

        findChildItemByName: (name) => {
            return createItemScriptWrapper(findChildItemByName(item, name), schemeContainer, userEventBus);
        },
    }
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

export function createItemBasedScope(item, schemeContainer, userEventBus) {
    const itemInterface = createItemScriptWrapper(item, schemeContainer, userEventBus);
    return new Scope({
        findParent: () => {
            let parentId = null;
            if (item && item.meta) {
                parentId = item.meta.parentId
            }
            return createItemScriptWrapper(schemeContainer.findItemById(parentId), schemeContainer, userEventBus);
        },
        findItemById: (id) => {
            return createItemScriptWrapper(schemeContainer.findItemById(id), schemeContainer, userEventBus);
        },
        findItemByName: (name) => {
            return createItemScriptWrapper(schemeContainer.findItemByName(name), schemeContainer, userEventBus);
        },
        ...itemInterface
    });
}

export function parseItemScript(text) {
    try {
        return parseAST(tokenizeExpression(text), text);
    } catch (err) {
        console.error('Failed to parse item script: ' + text, err);
        return null;
    }
}