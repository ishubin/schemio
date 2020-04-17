/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import _ from 'lodash';
import myMath from '../myMath.js';
import utils from '../utils.js';
import shortid from 'shortid';
import Shape from '../components/editor/items/shapes/Shape.js';
import Connector from './Connector.js';
import Item from './Item.js';


const defaultSchemeStyle = {
    backgroundColor:    'rgba(240,240,240,1.0)',
    gridColor:          'rgba(128,128,128,0.2)',
    boundaryBoxColor:   'rgba(36, 182, 255, 0.8)'
};


/*
how to calculate item top-let corner position
i - level of children (i-1 is the parent item)
P[i]' = P[i-1]' + X[i] * K[i-1] + Y[i] * L[i-1]

how to calculate point on item
P(Xp, Yp, P[i]) = P[i]' + Xp * K[i] + Yp * L[i]
*/

const _zeroTransform = {x: 0, y: 0, r: 0};

function visitItems(items, callback, transform, parentItem, ancestorIds) {
    if (!items) {
        return;
    }
    if (!transform) {
        transform = {x: 0, y: 0, r: 0};
    }
    if (!ancestorIds) {
        ancestorIds = [];
    }
    let cosa = Math.cos(transform.r * Math.PI / 180);
    let sina = Math.sin(transform.r * Math.PI / 180);

    for (let i = 0; i < items.length; i++) {
        callback(items[i], transform, parentItem, ancestorIds);
        if (items[i].childItems) {
            visitItems(items[i].childItems, callback, {
                x:      transform.x + items[i].area.x * cosa - items[i].area.y * sina,
                y:      transform.y + items[i].area.x * sina + items[i].area.y * cosa,
                r:  transform.r + items[i].area.r
            }, items[i], ancestorIds.concat([items[i].id]));
        }
    }
}

/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    /**
     * 
     * @param {Scheme} scheme 
     * @param {EventBus} eventBus 
     */
    constructor(scheme, eventBus) {
        if (!eventBus) {
            throw new Error('Missing eventBus');
        }
        this.scheme = scheme;
        this.screenTransform = {x: 0, y: 0, scale: 1.0};
        this.screenSettings = {width: 700, height: 400, x1: -1000000, y1: -1000000, x2: 1000000, y2: 1000000};
        this.eventBus = eventBus;
        this.selectedItems = [];
        this.selectedConnectors = [];
        this.activeBoundaryBox = null;
        this.itemMap = {};
        this._itemArray = []; // stores all flatten items (all sub-items are stored as well)
        this._destinationToSourceLookup = {}; //a lookup map for discovering source items. id -> id[]
        this.copyBuffer = [];
        this.connectorsMap  = {}; //used for quick access to connector by id
        this.revision = 0;
        this.viewportItems = []; // used for storing top-level items that are supposed to be located within viewport (ignore offset and zoom)
        this.worldItems = []; // used for storing top-level items with default area
        this.connectionItemMap = {}; // used for looking up items that should be re-adjusted once the item area is changed (e.g. curve item can be attached to other items)

        this._itemGroupsToIds = {}; // used for quick access to item ids via item groups
        this.itemGroups = []; // stores groups from all items

        // Used for calculating closest point to svg path
        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

        this.enrichSchemeWithDefaults(this.scheme);
        this.reindexItems();
    }
    
    enrichSchemeWithDefaults(scheme) {
        if (!scheme.style) {
            scheme.style = {};
        }

        _.forEach(defaultSchemeStyle, (value, name) => {
            if (!scheme.style[name]) {
                scheme.style[name] = value;
            }
        });
    }

    /**
     * Recalculates transform for each child item of specified item.
     * It is needed when user drags an item that has sub-items.
     * Since connectors need to be rebuilt with the correct transform this needs to adjusted each time the item position is changed
     * @param {Item} mainItem 
     */
    updateChildTransforms(mainItem) {
        if (mainItem.childItems && mainItem.meta && mainItem.meta.transform) {
            let cosa = Math.cos(mainItem.meta.transform.r * Math.PI / 180);
            let sina = Math.sin(mainItem.meta.transform.r * Math.PI / 180);
            const recalculatedTransform  = {
                x:      mainItem.meta.transform.x + mainItem.area.x * cosa - mainItem.area.y * sina,
                y:      mainItem.meta.transform.y + mainItem.area.x * sina + mainItem.area.y * cosa,
                r:  mainItem.meta.transform.r + mainItem.area.r
            };
            visitItems(mainItem.childItems, (item, transform, parentItem, ancestorIds) => {
                if (!item.meta) {
                    item.meta = {};
                }
                item.meta.transform = transform;
            }, recalculatedTransform, mainItem.meta.ancestorIds);
        }
    }

    reindexItems() {
        //TODO optimize itemMap to not reconstruct it with every change (e.g. reindex and rebuild connectors only for effected items. This obviously needs to be specified from the caller)
        this.itemMap = {};
        this._destinationToSourceLookup = {};
        this._itemArray = [];
        this.connectorsMap = {};
        this.viewportItems = [];
        this.worldItems = [];
        this._itemGroupsToIds = {};

        // stores element selectors with their dependants
        // this will be used once it has visited all items
        // so that it can finally start puting ids of existing items into connectionItemMap
        const connectionElementSelectorMap = {};
        const registerDependant = (elementSelector, itemId) => {
            let dependants = connectionElementSelectorMap[elementSelector] || [];
            dependants.push(itemId);
            connectionElementSelectorMap[elementSelector] = dependants;
        };

        const itemsWithConnectors = [];
        if (!this.scheme.items) {
            return;
        }
        visitItems(this.scheme.items, (item, transform, parentItem, ancestorIds) => {
            this._itemArray.push(item);
            this.enrichItemWithDefaults(item);
            this.enrichItemMeta(item, transform, parentItem, ancestorIds);
            if (item.groups) {
                this.indexItemGroups(item.id, item.groups);
            }

            // only storing top-level items 
            if (!parentItem) {
                if (item.area.type === 'viewport') {
                    this.viewportItems.push(item);
                } else {
                    this.worldItems.push(item);
                }
            }

            if (item.id) {
                this.itemMap[item.id] = item;
            }

            if (item.shape === 'curve') {
                if (item.shapeProps.sourceItem) {
                    registerDependant(item.shapeProps.sourceItem, item.id);
                }
                if (item.shapeProps.destinationItem) {
                    registerDependant(item.shapeProps.destinationItem, item.id);
                }
            }

            if (item.connectors && item.connectors.length > 0) {
                itemsWithConnectors.push(item);
            }
        });

        this.itemGroups = _.keys(this._itemGroupsToIds);
        this.itemGroups.sort();

        _.forEach(itemsWithConnectors, item => {
            this.buildItemConnectors(item);
        });

        this.connectionItemMap = this.buildConnectionItemMapFromElementSelectors(connectionElementSelectorMap);
        this.revision += 1;
    }

    buildConnectionItemMapFromElementSelectors(connectionElementSelectorMap) {
        const connectionItemMap = {};
        const registerDependants = (itemId, newDependants) => {
            let dependants = connectionItemMap[itemId] || [];
            dependants = dependants.concat(newDependants);
            connectionItemMap[itemId] = dependants;
        };

        _.forEach(connectionElementSelectorMap, (dependants, elementSelector) => {
            const mainItem = this.findFirstElementBySelector(elementSelector);
            if (mainItem) {
                registerDependants(mainItem.id, dependants);
            }
        });
        return connectionItemMap;
    }

    /**
     * Used in case an item was moved. This is needed so that we only update transforms (in meta) for objects that are children of this item
     * @param {Item} item - item that was moved or rotated
     */
    reindexItemTransforms(item) {
        if (!item.childItems) {
            return;
        }
        const callback = (childItem, transform, parentItem, ancestorIds) => {
            childItem.meta.transform = transform;
        };
        const parentItem = this.findItemById(item.meta.parentId);
        visitItems(item.childItems, callback, item.meta.transform, parentItem, item.meta.ancestorIds);
    }

    indexItemGroups(itemId, groups) {
        _.forEach(groups, group => {
            if (!this._itemGroupsToIds.hasOwnProperty(group)) {
                this._itemGroupsToIds[group] = [];
            }
            this._itemGroupsToIds[group].push(itemId);
        })
    }

    enrichItemMeta(item, transform, parentItem, ancestorIds) {
        if (!item.meta) {
            item.meta = {
                collapsed: false, // used only for item tree selector
                collapseBitMask: 0 // used in item tree selector and stores information about parent items collapse state
            };
        }

        item.meta.transform = transform;
        item.meta.ancestorIds = ancestorIds;
        if (!parentItem) {
            item.meta.collapseBitMask = 0;
        } else {
            item.meta.collapseBitMask = (parentItem.meta.collapseBitMask << ancestorIds.length) | (parentItem.meta.collapsed ? 1: 0)
        }

        if (parentItem) {
            item.meta.parentId = parentItem.id;
        } else {
            item.meta.parentId = null;
        }

        const shape = Shape.find(item.shape);
        if (shape && shape.controlPoints) {
            item.meta.controlPoints = shape.controlPoints.make(item);
        }
    }

    /**
     * This function should only be called after indexing of items is finished
     * because it relies on item having its transformationAreas assigned in its 'meta' object
     * It converts the point inside the item from its local coords to world coords
     * 
     * @param {Number} x local position x
     * @param {Number} y local position y
     * @param {Item} item 
     */
    worldPointOnItem(x, y, item) {
        return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
    }

    /**
     * Converts world point to local item coords
     * @param {Number} x world position x
     * @param {Number} y world position y
     * @param {Item} item 
     */
    localPointOnItem(x, y, item) {
        return myMath.localPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
    }
    
    /**
     * Finds first item that is within specified distance to path
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} d - maximum distance to items path
     * @param {String} excludedId - item that should be excluded
     */
    findClosestPointToItems(x, y, d, excludedId) {
        let globalPoint = {x, y};
        let item = null;
        for (let i = 0; i < this._itemArray.length; i++) {
            item = this._itemArray[i];
            if (item.id !== excludedId) {
                const shape = Shape.find(item.shape);
                if (shape) {
                    const path = shape.computePath(item, this);
                    if (path) {
                        const closestPoint = this.closestPointToSvgPath(item, path, globalPoint);
                        const squaredDistance = (closestPoint.x - globalPoint.x) * (closestPoint.x - globalPoint.x) + (closestPoint.y - globalPoint.y) * (closestPoint.y - globalPoint.y);
                        if (squaredDistance < d * d) {
                            return {
                                x                 : closestPoint.x,
                                y                 : closestPoint.y,
                                distanceOnPath    : closestPoint.distanceOnPath,
                                itemId            : item.id
                            };
                        }
                    }
                }
            }
        }
        return null;
    }

    getBoundingBoxOfItems(items) {
        if (!items || items.length === 0) {
            return {x: 0, y: 0, w: 0, h: 0};
        }

        let range = null;

        _.forEach(items, item => {
            const points = [
                this.worldPointOnItem(0, 0, item),
                this.worldPointOnItem(item.area.w, 0, item),
                this.worldPointOnItem(item.area.w, item.area.h, item),
                this.worldPointOnItem(0, item.area.h, item),
            ];

            _.forEach(points, point => {
                if (!range) {
                    range = {
                        x1: point.x,
                        x2: point.x,
                        y1: point.y,
                        y2: point.y,
                    }
                } else {
                    if (range.x1 > point.x) {
                        range.x1 = point.x;
                    }
                    if (range.x2 < point.x) {
                        range.x2 = point.x;
                    }
                    if (range.y1 > point.y) {
                        range.y1 = point.y;
                    }
                    if (range.y2 < point.y) {
                        range.y2 = point.y;
                    }
                }
            });
        }) ;

        const schemeBoundaryBox = {
            x: range.x1,
            y: range.y1,
            w: range.x2 - range.x1,
            h: range.y2 - range.y1,
        };

        return schemeBoundaryBox;
    }

    /**
     * Should be invoked each time an area or path of item changes
     * @param {String} changedItemId
     */
    readjustDependantItems(changedItemId) {
        this._readjustDependantItems(changedItemId, {});
    }

    /**
     * 
     * @param {*} changedItem 
     * @param {*} visitedItems - tracks all items that were already visited. Need in order to exclude eternal loops
     */
    _readjustDependantItems(changedItemId, visitedItems) {
        if (this.connectionItemMap[changedItemId]) {
            _.forEach(this.connectionItemMap[changedItemId], dependantItemId => {
                if (!visitedItems[dependantItemId]) {
                    visitedItems[dependantItemId] = true;
                    const dependantItem = this.itemMap[dependantItemId];
                    if (dependantItem) {
                        const shape = Shape.find(dependantItem.shape);
                        if (shape && shape.readjustItem) {
                            shape.readjustItem(dependantItem, this);
                            this._readjustDependantItems(dependantItemId, visitItems);
                            this.eventBus.emitItemChanged(dependantItemId);
                        }
                    }
                }
            });
        }
    }

    remountItemInsideOtherItem(itemId, otherItemId, position) {
        if (!position) {
            position = 0;
        }
        const item = this.findItemById(itemId);
        if (!item) {
            return;
        }

        let otherItem = null;
        if (otherItemId) {
            otherItem = this.findItemById(otherItemId);
            if (!otherItem) {
                return;
            }
        }

        //checking if item is moved into its own child items. It should be protected from such move, otherwise it is going to be an eternal loop
        if (otherItem && _.indexOf(otherItem.meta.ancestorIds, item.id) >= 0) {
            return;
        }

        // Recalculating item area so that its world coords would match under new transform
        const worldPoint = this.worldPointOnItem(0, 0, item);
        let newLocalPoint = {
            x: worldPoint.x, y: worldPoint.y
        }
        if (otherItem) {
            newLocalPoint = this.localPointOnItem(worldPoint.x, worldPoint.y, otherItem);
        }

        let parentItem = null;
        let angleCorrection = 0;
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            parentItem = this.findItemById(item.meta.parentId);
            if (!parentItem) {
                return;
            }
            angleCorrection += parentItem.meta.transform.r + parentItem.area.r;
            itemsArray = parentItem.childItems;
        }
        if (otherItem && otherItem.meta && otherItem.meta.transform) {
            angleCorrection -= otherItem.meta.transform.r + otherItem.area.r;
        }

        const index = _.findIndex(itemsArray, it => it.id === itemId);
        if (index < 0) {
            return;
        }

        // removing item from its original position in array
        itemsArray.splice(index, 1);

        let newItemsArray = this.scheme.items;
        if (otherItem) {
            if (!otherItem.childItems) {
                otherItem.childItems = [];
            }
            newItemsArray = otherItem.childItems;
        }
        newItemsArray.splice(position, 0, item);

        item.area.x = newLocalPoint.x;
        item.area.y = newLocalPoint.y;
        item.area.r += angleCorrection;

        this.reindexItems();
    }

    remountItemAfterOtherItem(itemId, otherItemId) {
        const otherItem = this.findItemById(otherItemId);
        if (!otherItem) {
            return;
        }
        let itemsArray = this.scheme.items;
        let parent = null;
        if (otherItem.meta.parentId) {
            parent = this.findItemById(otherItem.meta.parentId);
            if (!parent) {
                return;
            }
            if (!parent.childItems) {
                parent.childItems = [];
            }

            itemsArray = parent.childItems;
        }

        const index = _.findIndex(itemsArray, it => it.id === otherItemId);
        if (index < 0) {
            return;
        }

        let parentId = null;
        if (parent) {
            parentId = parent.id;
        }
        this.remountItemInsideOtherItem(itemId, parentId, index + 1);
    }

    enrichItemWithDefaults(item, shape) {
        const props = {
            area: {x:0, y: 0, w: 0, h: 0, r: 0, type: 'relative'},
            groups: [],
            opacity: 100.0,
            selfOpacity: 100.0,
            visible: true,
            blendMode: 'normal',
            text: '',
            description: '',
            
            interactionMode: Item.InteractionMode.SIDE_PANEL,
            shapeProps: {},
            behavior: {
                events: []
            }
        };
        if (item.shape) {
            const shape = Shape.find(item.shape);
            if (shape) {
                _.forEach(shape.args, (arg, argName) => {
                    props.shapeProps[argName] = arg.value;
                });
            }
        }
        utils.extendObject(item, props);
    }

    buildItemConnectors(item) {
        if (item.connectors) {
            _.forEach(item.connectors, connector => {
                this.buildConnector(item, connector);
            });
        }
    }

    /**
     * Used in order to later discover all items that were connecting to specific item
     * @param {string} sourceId 
     * @param {string} destinationId 
     */
    indexDestinationToSource(sourceId, destinationId) {
        if(!this._destinationToSourceLookup[destinationId]) {
            this._destinationToSourceLookup[destinationId] = [];
        }
        if (_.indexOf(this._destinationToSourceLookup[destinationId], sourceId) < 0) {
            this._destinationToSourceLookup[destinationId].push(sourceId);
        }
    }

    buildConnector(sourceItem, connector) {
        if (!sourceItem) {
            return;
        }
        if (!connector.meta) {
            connector.meta = {};
        }
        if (!connector.id || connector.id.length === 0) {
            connector.id = shortid.generate();
        }

        connector.meta.sourceItemId = sourceItem.id;
        const points = [];

        this.enrichConnectorWithDefaultStyle(connector);

        const destinationItem = this.itemMap[connector.itemId];
        if (destinationItem) {
            this.indexDestinationToSource(sourceItem.id, destinationItem.id);
        }

        if (connector.reroutes && connector.reroutes.length > 0) {
            const sourcePoint = this.findEdgePoint(sourceItem, connector.reroutes[0]);
            points.push(this.localPointOnItem(sourcePoint.x, sourcePoint.y, sourceItem));

            for (let i = 0; i < connector.reroutes.length; i++) {
                if (!connector.reroutes[i].disabled) {
                    const x = connector.reroutes[i].x;
                    const y = connector.reroutes[i].y;
                    points.push(this.localPointOnItem(x, y, sourceItem));
                }
            }
            if (destinationItem) {
                const point = this.findEdgePoint(destinationItem, connector.reroutes[connector.reroutes.length - 1]);
                points.push(this.localPointOnItem(point.x, point.y, sourceItem));
            }
        } else {
            if (destinationItem) {
                let point = this.findEdgePoint(sourceItem, {
                    x: destinationItem.area.x + destinationItem.area.w /2,
                    y: destinationItem.area.y + destinationItem.area.h /2,
                });
                points.push(this.localPointOnItem(point.x, point.y, sourceItem));

                point = this.findEdgePoint(destinationItem, {
                    x: sourceItem.area.x + sourceItem.area.w /2,
                    y: sourceItem.area.y + sourceItem.area.h /2,
                });
                points.push(this.localPointOnItem(point.x, point.y, sourceItem));
            }
        }

        if (!connector.meta) {
            connector.meta = {};
        }
        connector.meta.points = points;
        this.connectorsMap[connector.id] = connector;
    }

    findEdgePoint(item, nextPoint) {
        if (item.shape) {
            const shape = Shape.find(item.shape);
            if (shape) {
                if (shape.computePath) {
                    const path = shape.computePath(item, this);
                    if (path) {
                        return this.closestPointToSvgPath(item, path, nextPoint);
                    }
                }
            }
        }
        
        return {
            x: item.area.x + item.area.w / 2,
            y: item.area.y + item.area.h / 2
        };
    }

    closestPointToSvgPath(item, path, globalPoint) {
        // in order to include all parent items transform into closest point finding we need to first bring the global point into local transform
        const localPoint = this.localPointOnItem(globalPoint.x, globalPoint.y, item);

        if (!this.shadowSvgPath) {
            this.shadowSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        }
        this.shadowSvgPath.setAttribute('d', path);
        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, this.shadowSvgPath);
        const worldPoint = this.worldPointOnItem(closestPoint.x, closestPoint.y, item);
        worldPoint.distanceOnPath = closestPoint.distance;
        return worldPoint;
    }

    enrichConnectorWithDefaultStyle(connector) {
        utils.extendObject(connector, {
            name: '',
            opacity: 100.0,
            visible: true,
            color: '#333',
            width: 1,
            pattern: Connector.Pattern.LINE,
            connectorType: Connector.Type.STRAIGHT,
            destination: {
                type: Connector.CapType.ARROW,
                size: 5
            },
            source: {
                type: Connector.CapType.EMPTY,
                size: 5
            },
            meta: {
                animations: {}
            }
        });
    }

    connectItems(sourceItem, destinationItem) {
        if (sourceItem !== destinationItem && sourceItem.id && destinationItem.id) {
            if (!sourceItem.connectors) {
                sourceItem.connectors = [];
            }

            var alreadyExistingConnection = _.find(sourceItem.connectors, c => {
                return (c.itemId === destinationItem.id);
            });

            if (!alreadyExistingConnection) {
                var connector = {
                    id: shortid.generate(),
                    itemId: destinationItem.id,
                    reroutes: [],
                    style: {
                        color: '#333',
                        width: 1,
                        pattern: 'line',
                        source: {
                            type: 'empty',
                            size: 5
                        },
                        destination: {
                            type: 'arrow',
                            size: 5
                        }
                    }
                };
                sourceItem.connectors.push(connector);
                this.buildConnector(sourceItem, connector);
            }
        }
    }

    getSelectedItems() {
        return this.selectedItems;
    }


    _deleteItem(item) {
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            const parentItem = this.findItemById(item.meta.parentId);
            if (!parentItem || !parentItem.childItems) {
                return;
            }
            itemsArray = parentItem.childItems;
        }

        const index = _.findIndex(itemsArray, it => it.id === item.id);
        if (index < 0) {
            return;
        }

        itemsArray.splice(index, 1);

        this.removeConnectorsForItem(item);
        if (item.childItems) {
            this._removeConnectorsForAllSubItems(item.childItems);
        }
    }

    _removeConnectorsForAllSubItems(items) {
        _.forEach(items, item => {
            this.removeConnectorsForItem(item);
            if (item.childItems) {
                this._removeConnectorsForAllSubItems(item.childItems);
            }
        });
    }

    deleteSelectedItemsAndConnectors() {
        let removed = 0;
        if (this.selectedItems && this.selectedItems.length > 0) {
            _.forEach(this.selectedItems, item => {
                this._deleteItem(item);
            });

            this.selectedItems = [];
            removed += 1;
        }
        if (this.selectedConnectors) {
            _.forEach(this.selectedConnectors, connector => {
                const sourceItem = this.findItemById(connector.meta.sourceItemId);
                if (sourceItem && sourceItem.connectors) {
                    const connectorIndex = _.findIndex(sourceItem.connectors, c => c.id === connector.id);
                    if (connectorIndex >= 0) {
                        sourceItem.connectors.splice(connectorIndex, 1);
                    }
                }
            });
            removed += 1;
        }
        if (removed > 0) {
            this.reindexItems();
        }
    }

    removeConnectorsForItem(item) {
        var sourceIds = this._destinationToSourceLookup[item.id];
        if (sourceIds) {
            _.forEach(sourceIds, sourceId => {
                var sourceItem = this.findItemById(sourceId);
                if (sourceItem && sourceItem.connectors && sourceItem.connectors.length) {
                    sourceItem.connectors = _.filter(sourceItem.connectors, connector => connector.itemId !== item.id);
                }
            });
        }
    }

    addItem(item) {
        if (!item.hasOwnProperty('meta')) {
            item.meta = {}
        }
        item.meta.hovered = false;
        item.meta.selected = false;
        item.meta.controlPoints = [];
        if (!item.id) {
            item.id = shortid.generate();
        }
        this.scheme.items.push(item);
        this.reindexItems();
        return item;
    }

    getItems() {
        return this._itemArray;
    }

    setActiveBoundaryBox(area) {
        this.activeBoundaryBox = area;
    }

    selectConnector(connector, inclusive) {
        // only select connector that do have meta, otherwise it would be imposible to click them
        if (inclusive) {
            throw new Error('not supported yet');
        } else {
            this.deselectAllConnectors();

            if (connector.meta && !connector.meta.selected) {
                connector.meta.selected = true;
                this.selectedConnectors.push(connector);
            }
        }
    }

    deselectAllConnectors() {
        _.forEach(this.selectedConnectors, connector => {
            if (connector.meta) {
                connector.meta.selected = false;
            }
            this.eventBus.emitConnectorDeselected(connector.id, connector);
        });
        this.selectedConnectors = [];
    }

    isItemSelected(item) {
        return item.meta.selected || false;
    }

    /**
     * Selects a specified item and deselects any other items that were selected previously
     * @param {SchemeItem} item 
     * @param {boolean} inclusive Flag that specifies whether it should deselect other items
     */
    selectItem(item, inclusive) {
        if (inclusive) {
            this.selectItemInclusive(item);
            this.eventBus.emitItemSelected(item.id);
        } else {
            _.forEach(this.selectedItems, selectedItem => {
                if (selectedItem.id !== item.id) {
                    selectedItem.meta.selected = false;
                    this.eventBus.emitItemDeselected(selectedItem.id);
                }
            });
            item.meta.selected = true;
            this.selectedItems = [];

            this.selectItemInclusive(item);
            this.eventBus.emitItemSelected(item.id);
        }
    }

    selectItemInclusive(item) {
        var isAlreadyIn = false;
        var i = 0;
        for (; i < this.selectedItems.length; i++) {
            if (this.selectedItems[i] === item) {
                isAlreadyIn = true;
                break;
            }
        }

        if (!isAlreadyIn) {
            this.selectedItems.push(item);
            item.meta.selected = true;
        }

        this.sortSelectedItemsByAncestors();
    }

    sortSelectedItemsByAncestors() {
        if (this.selectedItems) {
            this.selectedItems = this.selectedItems.sort((a, b) => {
                let la = 0;
                let lb = 0;
                if (a.meta.ancestorIds) {
                    la = a.meta.ancestorIds.length;
                }
                if (b.meta.ancestorIds) {
                    lb = b.meta.ancestorIds.length;
                }
                return la - lb;
            });
        }
    }

    /**
     * Deselect all previously selected items
     */
    deselectAllItems() {
        _.forEach(this.selectedItems, item => {
            item.meta.selected = false;
            this.eventBus.emitItemDeselected(item.id);
        });
        this.selectedItems = [];
    }

    selectByBoundaryBox(box) {
        _.forEach(this.getItems(), item => {
            const points = [ 
                {x: 0, y: 0}, 
                {x: item.area.w, y: 0},
                {x: item.area.w, y: item.area.h},
                {x: 0, y: item.area.h},
            ];

            let isInArea = true;

            for(let i = 0; i < points.length && isInArea; i++) {
                const wolrdPoint = this.worldPointOnItem(points[i].x, points[i].y, item);
                isInArea = myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box);
            }

            if (isInArea) {
                this.selectedItems.push(item);
                item.meta.selected = true;
            }
        });
    }

    /**
     * This is a recursive functions that goes through all sub-items
     * @param {Array} itemArray 
     */
    bringSelectedItemsToBack(itemArray) {
        // let i = 0;
        // let lastItems = [];
        // while (i < this.scheme.items.length) {
        //     if (this.scheme.items[i].meta.selected) {
        //         lastItems.push(this.scheme.items[i]);
        //         this.scheme.items.splice(i, 1);
        //     } else {
        //         i++;
        //     }
        // }

        if (!itemArray) {
            itemArray = this.scheme.items;
        }
        let i = 0;
        let lastItems = [];
        while (i < itemArray.length) {
            if (itemArray[i].childItems) {
                this.bringSelectedItemsToFront(itemArray[i].childItems);
            }

            if (itemArray[i].meta.selected) {
                lastItems.push(itemArray[i]);
                itemArray.splice(i, 1);
            } else {
                i++;
            }
        }

        _.forEach(lastItems, item => {
            itemArray.splice(0, 0, item);
        });
       // this.scheme.items = lastItems.concat(this.scheme.items);
    }

    /**
     * This is a recursive functions that goes through all sub-items
     * @param {Array} itemArray 
     */
    bringSelectedItemsToFront(itemArray) {
        if (!itemArray) {
            itemArray = this.scheme.items;
        }
        let i = 0;
        let topItems = [];
        while (i < itemArray.length) {
            if (itemArray[i].childItems) {
                this.bringSelectedItemsToFront(itemArray[i].childItems);
            }

            if (itemArray[i].meta.selected) {
                topItems.push(itemArray[i]);
                itemArray.splice(i, 1);
            } else {
                i++;
            }
        }

        _.forEach(topItems, item => {
            itemArray.push(item);
        });
    }

    /**
    Adds a reroute in specified connector and returns an index (in the reroutes array)
    */
    addReroute(x, y, connector) {
        if (!connector.reroutes) {
            connector.reroutes = [];
        }

        var id = connector.reroutes.length;
        if (connector.reroutes.length > 0) {
            const item = this.findItemById(connector.meta.sourceItemId);
            if (item) {
                const localPoint = this.localPointOnItem(x, y, item);
                id = this.findMatchingRerouteSegment(localPoint.x, localPoint.y, connector);
            }
        }

        connector.reroutes.splice(id, 0, {
            x: x,
            y: y
        });
        const sourceItem = this.findItemById(connector.meta.sourceItemId);
        if (sourceItem) {
            this.buildConnector(sourceItem, connector);
        }
        return id;
    }

    findMatchingRerouteSegment(x, y, connector) {
        var point = {x, y};
        var candidates = [];
        for (var i = 0; i < connector.meta.points.length - 1; i++) {
            candidates.push({
                index: i,
                distance: myMath.distanceToLineSegment(point, connector.meta.points[i], connector.meta.points[i + 1], 10.0),
                point1: connector.meta.points[i],
                point2: connector.meta.points[i + 1]
            });
        }

         var segment = _.chain(candidates).sortBy('distance').find(c => {
             return myMath.isPointWithinLineSegment(point, c.point1, c.point2);
         }).value();
         if (segment) {
             return segment.index;
         } else {
             return 0;
         }
    }

    findItemById(itemId) {
        return this.itemMap[itemId];
    }

    findItemsByGroup(group) {
        const itemIds = this._itemGroupsToIds[group];
        const items = [];
        if (itemIds) {
            _.forEach(itemIds, id => {
                const item = this.findItemById(id);
                if (item) {
                    items.push(item);
                }
            })
        }
        return items;
    }

    findConnectorById(connectorId) {
        return this.connectorsMap[connectorId];
    }

    findFirstElementBySelector(selector, selfItem) {
        const elements = this.findElementsBySelector(selector, selfItem);
        if (elements.length > 0) {
            return elements[0];
        }
        return null;
    }

    /**
     * Finds items and connectors that match specified selector
     * @param {String} selector contains a selector for an element
     * @param {SchemeItem} selfItem 
     */
    findElementsBySelector(selector, selfItem) {
        if (selector === 'self') {
            return [selfItem];
        }

        if (selector.charAt(0) === '#') {
            const id = selector.substr(1);
            const item = this.findItemById(id);
            if (item) {
                return [item];
            }

            const connector = this.findConnectorById(id);
            if (connector) {
                return [connector];
            }
        } else {
            const colonIndex = selector.indexOf(':');
            if (colonIndex > 0) {
                const expression = selector.substring(0, colonIndex);
                if (expression === 'group') {
                    return this.findItemsByGroup(selector.substr(colonIndex + 1).trim());
                }
            }
        }
        return null;
    }

    getConnectingSourceItemIds(destinationId) {
        return this._destinationToSourceLookup[destinationId];
    }

    copySelectedItems() {
        this.copyBuffer = [].concat(this.selectedItems);
        this.copyBuffer = [];
        _.forEach(this.selectedItems, item => {
            this.copyBuffer.push(utils.clone(item));
        });
    }

    pasteSelectedItems() {
        if (!this.copyBuffer || this.copyBuffer.length === 0) {
            return;
        }
        this.deselectAllItems();

        let preserveParent = true;
        let i = 1;
        while(i < this.copyBuffer.length && preserveParent) {
            if (this.copyBuffer[i].id !== this.copyBuffer[0].id) {
                preserveParent = false;
            }
            i += 1;
        }

        const copiedItemIds = {};
        _.forEach(this.copyBuffer, item => {
            // checking whether any of ancestors were already copied for this item
            // as we don't need to copy it twice
            if (!_.find(item.meta.ancestorIds, ancestorId => copiedItemIds[ancestorId] === 1)) {
                copiedItemIds[item.id] = 1;
                const worldPoint = this.worldPointOnItem(0, 0, item);

                const newItem = this.copyItem(item);
                newItem.name = item.name + ' copy';
                newItem.area.x = worldPoint.x;
                newItem.area.y = worldPoint.y;
                if (item.meta.transform) {
                    newItem.area.r += item.meta.transform.r;
                }

                let parentItems = this.scheme.items;
                if (preserveParent) {
                    if (item.meta && item.meta.parentId) {
                        const parentItem = this.findItemById(item.meta.parentId);
                        if (parentItem) {
                            parentItems = parentItem.childItems;
                            // modifying area back since we keep the same parent
                            newItem.area = utils.clone(item.area);
                        }
                    }
                }

                parentItems.push(newItem);
                this.selectItem(newItem, true);
            }
        });

        this.reindexItems();
    }

    copyItem(oldItem) {
        const newItem = {
            id: shortid.generate(),
            meta: {
                hovered: false,
                selected: false
            }
        };

        _.forEach(oldItem, (value, field) => {
            if (field === 'childItems') {
                newItem[field] = _.map(value, childItem => this.copyItem(childItem));
            } else if (field !== 'connectors' && field !== 'id' && field !== 'meta') {
                newItem[field] = utils.clone(value);
            }
        });

        return newItem;
    }
}


export default SchemeContainer;
