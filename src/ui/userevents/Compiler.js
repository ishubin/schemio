/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import forEach from 'lodash/forEach';
import knownFunctions from './functions/Functions.js';

function enrichFuncArgs(args, funcDef) {
    forEach(funcDef.args, (argDef, argName) => {
        if (!args.hasOwnProperty(argName)) {
            args[argName] = argDef.value;
        }
    });
    return args;
}


export default class Compiler {

    /**
     *
     * @param {SchemeContainer} schemeContainer
     * @param {SchemeItem} selfItem
     * @param {Array} actions
     */
    compileActions(schemeContainer, selfItem, actions) {

        const funcs = [];
        forEach(actions, action => {
            if (!action.on) {
                return;
            }
            if (knownFunctions.main.hasOwnProperty(action.method)) {
                if (action.element) {
                    const elements = schemeContainer.findElementsBySelector(action.element, selfItem);
                    if (elements) {
                        const knownFunc = knownFunctions.main[action.method];
                        if (knownFunc) {
                            const args = enrichFuncArgs(action.args, knownFunc);
                            if (knownFunc.multiItem) {
                                // Means that this function is always expected to get array of items and in cases when it is applied
                                // to a group of items - it will only be invoked once with array of those items as a first argument
                                funcs.push({
                                    func: knownFunc,
                                    element: elements,
                                    args
                                });
                            } else {
                                forEach(elements, element => {
                                    funcs.push({
                                        func: knownFunc,
                                        element,
                                        args
                                    });
                                });
                            }
                        }
                    }
                }
            }
        });

        return (userEventBus, revision, subscribedItemId, eventName) => {
            const subscribedItem = schemeContainer.findItemById(subscribedItemId);
            if (funcs.length < 1) {
                return;
            }

            let index = 0;
            let resultCallback = () => {
                index += 1;
                if (index >= funcs.length) {
                    return;
                }

                let f = funcs[index];
                if (userEventBus.isActionAllowed(revision)) {
                    f.func.execute(f.element, f.args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName);
                } else {
                }
            };
            if (userEventBus.isActionAllowed(revision)) {
                funcs[0].func.execute(funcs[0].element, funcs[0].args, schemeContainer, userEventBus, resultCallback, subscribedItem, eventName);
            }
        };
    }
}
