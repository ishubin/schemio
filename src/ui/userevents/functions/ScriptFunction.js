/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { playInAnimationRegistry } from "../../animations/AnimationRegistry";
import Animation from '../../animations/Animation';
import ValueAnimation from "../../animations/ValueAnimation";
import EditorEventBus from "../../components/editor/EditorEventBus";
import { Scope, parseAST } from "../../templater/ast";
import { tokenizeExpression } from "../../templater/tokenizer";
import htmlSanitize, { stripAllHtml } from "../../../htmlSanitize";
import { sendEventToChildren } from "./SendEventToChildrenFunction";
import { sendEventToParent } from "./SendEventToParentFuction";
import SchemeContainer, {localPointOnItem, worldPointOnItem} from '../../scheme/SchemeContainer';
import myMath from "../../myMath";
import { Vector } from "../../templater/vector";
import Events from "../Events";
import shortid from "shortid";
import utils from "../../utils";


const INFINITE_LOOP = 'inifinite-loop';

const initScriptDescription = `
A script that runs before the start of animation. It is only invoked in animation mode.
`;

const scriptDescription = `A Schemio script expression. In animation mode this script is being executed on every animation frame`;


export default {
    name: 'Script',

    description: 'Runs user defined script using SchemioScript language.',

    args: {
        initScript          : {name: 'Init script', type: 'script', value: '', description: initScriptDescription, depends: {animated: true}},
        script              : {name: 'Script', type: 'script', value: '', description: scriptDescription},
        animated            : {name: 'Animated', type: 'boolean', value: false, description: 'Script is called multiple times for the duration of the animation. It has access to "t" variable (start from 0, ends at 1) which represents the relative animation time'},
        animationType       : {name: 'Animation type', type: 'choice', value: 'animation', options: ['animation', INFINITE_LOOP], depends: {animated: true}},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true, animationType: 'animation'}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true, animationType: 'animation'}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    argsToShortString(args) {
        const s1 = args.initScript || '';
        const s2 = args.script || '';
        const script = (s1 + s2).trim();
        if (!script) {
            return 'edit script...'
        }
        return script;
    },

    precompileItemScript(item, script) {
        const scriptAST = parseItemScript(script);
        if (!scriptAST) {
            return;
        }

        if (!item.args) {
            item.args = {};
        }
        if (!item.args.compiledScripts) {
            item.args.compiledScripts = {};
        }
        item.args.compiledScripts[script] = scriptAST;
    },

    // init function is called on compile phase
    // this is used to optimize parsing of the script
    init(item, args, schemeContainer, userEventBus) {
        this.precompileItemScript(item, args.script);
        this.precompileItemScript(item, args.initScript);
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs) {
        if (!item.args || !item.args.compiledScripts) {
            resultCallback();
            return
        }
        const scriptAST = item.args.compiledScripts[args.script];
        if (!scriptAST) {
            resultCallback();
            return;
        }

        const initScriptAST = item.args.compiledScripts[args.initScript];

        const scope = createItemBasedScope(item, schemeContainer, userEventBus);

        if (initScriptAST) {
            initScriptAST.evalNode(scope);
        }

        let shouldProceedAnimating = true;
        const shouldPlayCallback = () => shouldProceedAnimating;

        const execScript = (t) => {
            if (args.animationType === INFINITE_LOOP) {
                // in infinite loop users should "deltaTime" as time in seconds from last call
                scope.set('deltaTime', t);
            } else {
                // in a regular animation users may rely on "t" which represents the progress of animation from 0 to 1
                scope.set('t', t);
            }

            scope.set('getEventName', () => eventName);
            scope.set('getEventArg', (i) => Array.isArray(eventArgs) && i < eventArgs.length ? eventArgs[i] : null);
            scope.set('stop', () => {
                shouldProceedAnimating = false;
            });
            scriptAST.evalNode(scope);
        };

        if (args.animated) {
            if (args.animationType === INFINITE_LOOP) {
                const animation = new ScriptInfiniteLoopAnimation(item, args, schemeContainer, resultCallback, execScript, shouldPlayCallback)
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
                        if (!args.inBackground) {
                            resultCallback();
                        }
                    }
                }), item.id, this.name + myMath.stringHash(args.script));
            }
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

    const withTextSlot = (name, callback) => {
        if (!item || !item.textSlots || !item.textSlots.hasOwnProperty(name)) {
            return;
        }
        callback(item.textSlots[name]);
        emitItemChanged();
    };

    const itemScope = {
        getId() {
            return item.id;
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
        },

        getWorldPos: () => Vector.fromPoint(worldPointOnItem(item.area.px * item.area.w, item.area.py * item.area.h, item)),
        setWorldPos: (x, y) => {
            const p = myMath.findTranslationMatchingWorldPoint(x, y, item.area.px * item.area.w, item.area.py * item.area.h, item.area, item.meta.transformMatrix);
            if (!p) {
                return;
            }
            item.area.x = p.x;
            item.area.y = p.y;
            emitItemChanged();
            schemeContainer.readjustItemAndDescendants(item.id, false);
        },

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

        findChildItemByName: (name) => {
            return createItemScriptWrapper(findChildItemByName(item, name), schemeContainer, userEventBus);
        },

        distanceToItem: (anotherItem) => {
            return distanceBetweenItems(item, anotherItem);
        },
        getValue: () => {
            if (item.args && item.args.hasOwnProperty('value')) {
                return item.args.value;
            }
            return 0;
        },
        setValue: (value) => {
            if (!item.args) {
                item.args = {};
            }
            item.args.value = value;
            EditorEventBus.item.userEvent.$emit(schemeContainer.editorId, item.id, Events.standardEvents.valueChange.id, value);
            emitItemChanged();
        },

        // remounts item to another item
        mount: (otherItem) => {
            if (!otherItem) {
                schemeContainer.remountItemToRoot(item.id)
            } else {
                schemeContainer.remountItemInsideOtherItemAtTheBottom(item.id, otherItem.getId());
            }
        },
        mountRoot: () => schemeContainer.remountItemToRoot(item.id)
    };


    return itemScope;
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

class ScriptInfiniteLoopAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback, scriptExecutor, shouldPlayCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.scriptExecutor = scriptExecutor;

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
            this.scriptExecutor(dt/1000);
        } catch(err) {
            console.error(err);
            return false;
        }
        return this.shouldPlayCallback();
    }

    destroy() {
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