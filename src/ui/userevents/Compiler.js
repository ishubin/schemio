/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import forEach from 'lodash/forEach';
import { Logger } from '../logger.js';
import knownFunctions from './functions/Functions.js';

const log = new Logger('Compiler');

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
        log.info('Compiling functions for item', selfItem? `${selfItem.id}/${selfItem.name}` : '');

        return (userEventBus, revision, subscribedItemId, eventName) => {
            const subscribedItem = schemeContainer.findItemById(subscribedItemId);
            if (funcs.length < 1) {
                return;
            }

            const it = {
                idx: 0,
                next() {
                    if (this.idx >= funcs.length) {
                        return null;
                    }

                    const f = funcs[this.idx];
                    this.idx++;
                    return f;
                },

                skip() {
                    this.idx++;
                }
            };


            const execNext = () => {
                const f = it.next();
                if (!f) {
                    return;
                }

                log.info('Executing', f.func.name, 'function');

                if (f.func.execute) {
                    f.func.execute(f.element, f.args, schemeContainer, userEventBus, execNext, subscribedItem, eventName);
                } else if (f.func.executeWithBranching) {
                    const branchingCallback = (result) => {
                        log.info('Branch result', result);
                        if (result.break) {
                            return;
                        }

                        let skip = result.skip;
                        while(skip > 0) {
                            skip--;
                            it.skip();
                        }
                        execNext();
                    };
                    f.func.executeWithBranching(f.element, f.args, schemeContainer, userEventBus, branchingCallback, subscribedItem, eventName);
                } else {
                    execNext();
                }
            };

            execNext();
        };
    }
}
