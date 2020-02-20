
import _ from 'lodash';
import knownFunctions from './functions/Functions.js';


export default class Compiler {
    /**
     * 
     * @param {SchemeContainer} schemeContainer 
     * @param {SchemeItem} selfItem 
     * @param {Object} element contains a selector for an elemment (item, connector) e.g. {item: "self", connector: "345et2"}
     */
    findElements(schemeContainer, selfItem, element) {
        if (element.item) {
            if (element.item === 'self') {
                return [selfItem];
            } else {
                return [schemeContainer.findItemById(element.item)];
            }
        }
        if (element.connector) {
            return [schemeContainer.findConnectorById(element.connector)];
        }
        if (element.itemGroup) {
            return schemeContainer.findItemsByGroup(element.itemGroup);
        }
        return null;
    }

    /**
     * 
     * @param {SchemeContainer} schemeContainer 
     * @param {SchemeItem} selfItem 
     * @param {Array} actions 
     */
    compileActions(schemeContainer, selfItem, actions) {
        
        const funcs = [];
        _.forEach(actions, action => {
            let scope = 'page';
            if (action.element && action.element.connector) {
                scope = 'connector';
            } else if (action.element && (action.element.item || action.element.itemGroup)) {
                scope = 'item';
            }

            if (knownFunctions[scope].hasOwnProperty(action.method)) {
                if (action.element) {
                    const elements = this.findElements(schemeContainer, selfItem, action.element);
                    if (elements) {
                        _.forEach(elements, element => {
                            funcs.push({
                                func: knownFunctions[scope][action.method],
                                element,
                                args: action.args
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
