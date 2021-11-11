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
            if (knownFunctions.main.hasOwnProperty(action.method)) {
                if (action.element) {
                    const elements = schemeContainer.findElementsBySelector(action.element, selfItem);
                    if (elements) {
                        forEach(elements, element => {
                            const knownFunc = knownFunctions.main[action.method];
                            funcs.push({
                                func: knownFunc,
                                element,
                                args: enrichFuncArgs(action.args, knownFunc)
                            });
                        });
                    }
                }
            }
        });

        return (userEventBus, revision) => {
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
                    f.func.execute(f.element, f.args, schemeContainer, userEventBus, resultCallback);
                } else {
                }
            };
            if (userEventBus.isActionAllowed(revision)) {
                funcs[0].func.execute(funcs[0].element, funcs[0].args, schemeContainer, userEventBus, resultCallback);
            }
        };
    }
}
