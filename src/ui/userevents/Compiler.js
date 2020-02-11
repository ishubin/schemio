
import _ from 'lodash';
import knownFunctions from './functions/Functions.js';

function createCallable(knownFunction, item, args, schemeContainer) {
    return () => {
        knownFunction.execute(item, args, schemeContainer);
    };
}


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
                            funcs.push(createCallable(knownFunctions[scope][action.method], element, action.args, schemeContainer));
                        });
                    }
                }
            }
        });

        return () => {
            _.forEach(funcs, func => {
                func();
            })
        };
    }
}
