/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { playInAnimationRegistry } from "../../animations/AnimationRegistry";
import Animation from '../../animations/Animation';
import ValueAnimation from "../../animations/ValueAnimation";
import EditorEventBus from "../../components/editor/EditorEventBus";
import { parseExpression } from "../../templater/ast";
import SchemeContainer from '../../scheme/SchemeContainer';
import myMath from "../../myMath";
import ScriptFunctionEditor from '../../components/editor/properties/behavior/ScriptFunctionEditor.vue';
import { List } from "../../templater/list";
import { createItemScriptWrapper } from "../../scripting/item";
import { createItemBasedScope } from "../../scripting/main";

const COMPILED_SCRIPTS = Symbol('compiledScripts');

const INFINITE_LOOP = 'infinite-loop';

const initScriptDescription = `
A script that runs before the start of animation. It is only invoked in animation mode.
`;

const scriptDescription = `A Schemio script expression. In animation mode this script is being executed on every animation frame`;

function precompileItemScript(item, script) {
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
    precompileItemScript(item, args.script);
    if (args.initScript) {
        precompileItemScript(item, args.initScript);
    }
    if (args.endScript) {
        precompileItemScript(item, args.endScript);
    }
}


function execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, extraScopeData = {}, classArgs = {}, classArgDefs = {}) {
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
    if (classArgs) {
        for (let name in classArgs) {
            if (classArgs.hasOwnProperty(name)) {
                let argValue = classArgs[name];
                if (classArgDefs.hasOwnProperty(name) && classArgDefs[name].type === 'element' && typeof argValue === 'string') {
                    const items = schemeContainer.findElementsBySelector(argValue, item).map(foundItem => {
                        return createItemScriptWrapper(foundItem, schemeContainer, userEventBus);
                    });
                    argValue = new List(...items);
                }
                scope.set(name, argValue);
            }
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
 * @param {Array} functions
 * @param {Item} funcName
 * @returns {Object}
 */
export function findCustomItemFunction(functions, funcName) {
    let funcDef = null;
    if (!funcDef) {
        funcDef = functions.find(f => f.name === funcName);
    }
    if (!funcDef) {
        return null;
    }
    return {
        init(item, args, schemeContainer, userEventBus) {
            init(item, funcDef.props, schemeContainer, userEventBus);
        },

        execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, classArgs = {}, classArgDefs = {}) {
            const finalArgs = {...args};

            // making sure that 'element' type arguments get converted from string to items
            // so that it makes it usable in the user script
            funcDef.args.forEach(argDef => {
                if (argDef.type === 'element' && finalArgs.hasOwnProperty(argDef.name) && typeof finalArgs[argDef.name] === 'string') {
                    const selector = finalArgs[argDef.name];
                    const items = schemeContainer.findElementsBySelector(selector, item).map(foundItem => {
                        return createItemScriptWrapper(foundItem, schemeContainer, userEventBus);
                    });
                    finalArgs[argDef.name] = new List(...items);
                }
            });
            execute(item, funcDef.props, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, finalArgs, classArgs, classArgDefs);
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

    execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, extraScopeData = {}, classArgs = {}, classArgDefs = {}) {
        execute(item, args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName, eventArgs, extraScopeData, classArgs, classArgDefs);
    }
};


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
