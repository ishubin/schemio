
import _ from 'lodash';
import knownFunctions from './functions/Functions.js';

function createCallable(knownFunction, item, args) {
    return () => {
        knownFunction.execute(item, args);
    };
}


export default class Compiler {
    /**
     * 
     * @param {SchemeItem} item 
     * @param {String} connectorId 
     */
    findItemConnector(item, connectorId) {
        if (item && item.connectors) {
            return _.find(item.connectors, c => c.id === connectorId);
        }
        return null;
    }

    /**
     * 
     * @param {SchemeContainer} schemeContainer 
     * @param {SchemeItem} selfItem 
     * @param {Object} entity contains a selector for an elemment (item, connector) e.g. {item: "self", connector: "345et2"}
     */
    findEntity(schemeContainer, selfItem, entity) {
        if (entity.item) {
            let item = null;
            if (entity.item === 'self') {
                item = selfItem;
            } else {
                item = schemeContainer.findItemById(entity.item);
            }

            if (item) {
                if (entity.connector) {
                    return this.findItemConnector(item, entity.connector);
                } else {
                    return item;
                }
            }
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
            if (knownFunctions.hasOwnProperty(action.method)) {
                if (action.entity) {
                    const entity = this.findEntity(schemeContainer, selfItem, action.entity);
                    if (entity) {
                        funcs.push(createCallable(knownFunctions[action.method], entity, action.args));
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
