import { List } from "../templater/list";
import { createItemScriptWrapper } from "./item";


export function createConnectionsFunctions(schemeContainer, userEventBus) {
    return {
        findAllConnectors() {
            return schemeContainer.getConnectors().map(connector => createItemScriptWrapper(connector, schemeContainer, userEventBus));
        },

        /**
         * Finds and returns a list of connectors that connect two items together (order of connection does not matter).
         * If itemB is not specified then it find all connectors that connect to or from item1
         * @param {ItemScriptWrapper|String} item1 - either a reference to an item script wrapper or an item id
         * @param {ItemScriptWrapper|String|undefined} item2 - optional
         * @returns {List} a list of connector items that connect the specified items
         */
        findConnections(item1, item2) {
            const connectors = new List();
            if (!item1) {
                return connectors;
            }
            const item1Id = typeof item1 === 'string' ? item1 : item1.getId();
            const selector1 = '#' + item1Id;

            let selector2 = null;
            if (item2) {
                const item2Id = typeof item2 === 'string' ? item2 : item2.getId();
                selector2 = '#' + item2Id;
            }

            const allConnectors = schemeContainer.getConnectors();
            for (let i = 0; i < allConnectors.length; i++) {
                let shouldAdd = true;
                if (allConnectors[i].shape !== 'connector') {
                    shouldAdd = false;
                }
                if (shouldAdd && allConnectors[i].shapeProps.sourceItem !== selector1 && allConnectors[i].shapeProps.destinationItem !== selector1) {
                    shouldAdd = false;
                }
                if (shouldAdd && selector2 && allConnectors[i].shapeProps.sourceItem !== selector2 && allConnectors[i].shapeProps.destinationItem !== selector2) {
                    shouldAdd = false;
                }
                if (shouldAdd) {
                    connectors.add(createItemScriptWrapper(allConnectors[i], schemeContainer, userEventBus));
                }
            }
            return connectors;
        },

        /**
         * Finds items that connect to it via a connector
         * @param {ItemScriptWrapper} item
         * @returns {ItemScriptWrapper|null} another item that is connected via a connector
         */
        findConnectionsTo(item) {
            const result = new List();
            if (!item) {
                return result;
            }
            const itemId = typeof item === 'string' ? item : item.getId();
            const selector = '#' + itemId;

            const allConnectors = schemeContainer.getConnectors();
            for (let i = 0; i < allConnectors.length; i++) {
                if (allConnectors[i].shape === 'connector'
                    && allConnectors[i].shapeProps.destinationItem === selector
                    && allConnectors[i].shapeProps.sourceItem
                ) {
                    const otherItem = schemeContainer.findFirstElementBySelector(allConnectors[i].shapeProps.sourceItem);
                    if (otherItem) {
                        result.add(createItemScriptWrapper(otherItem, schemeContainer, userEventBus));
                    }
                }
            }
            return result;
        },

        /**
         * Finds items that connect from it via a connector
         * @param {ItemScriptWrapper} item
         * @returns {ItemScriptWrapper|null} another item that is connected via a connector
         */
        findConnectionsFrom(item) {
            const result = new List();
            if (!item) {
                return result;
            }
            const itemId = typeof item === 'string' ? item : item.getId();
            const selector = '#' + itemId;

            const allConnectors = schemeContainer.getConnectors();
            for (let i = 0; i < allConnectors.length; i++) {
                if (allConnectors[i].shape === 'connector'
                    && allConnectors[i].shapeProps.sourceItem === selector
                    && allConnectors[i].shapeProps.destinationItem
                ) {
                    const otherItem = schemeContainer.findFirstElementBySelector(allConnectors[i].shapeProps.destinationItem);
                    if (otherItem) {
                        result.add(createItemScriptWrapper(otherItem, schemeContainer, userEventBus));
                    }
                }
            }
            return result;
        },

        /**
         * Finds items that connect from or to it via a connector
         * @param {ItemScriptWrapper} item
         * @returns {ItemScriptWrapper|null} another item that is connected via a connector
         */
        findConnectionsWith(item) {
            const result = new List();
            if (!item) {
                return result;
            }
            const itemId = typeof item === 'string' ? item : item.getId();
            const selector = '#' + itemId;

            const allConnectors = schemeContainer.getConnectors();
            for (let i = 0; i < allConnectors.length; i++) {
                if (allConnectors[i].shape === 'connector'
                    && allConnectors[i].shapeProps.sourceItem === selector
                    && allConnectors[i].shapeProps.destinationItem
                ) {
                    const otherItem = schemeContainer.findFirstElementBySelector(allConnectors[i].shapeProps.destinationItem);
                    if (otherItem) {
                        result.add(createItemScriptWrapper(otherItem, schemeContainer, userEventBus));
                    }
                } else if (allConnectors[i].shape === 'connector'
                    && allConnectors[i].shapeProps.destinationItem === selector
                    && allConnectors[i].shapeProps.sourceItem
                ) {
                    const otherItem = schemeContainer.findFirstElementBySelector(allConnectors[i].shapeProps.sourceItem);
                    if (otherItem) {
                        result.add(createItemScriptWrapper(otherItem, schemeContainer, userEventBus));
                    }
                }
            }
            return result;

        }
    };
}

