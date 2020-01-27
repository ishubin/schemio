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

const _zeroTransform = {x: 0, y: 0, angle: 0};

function visitItems(items, callback, transform, parentItem, ancestorIds) {
    if (!items) {
        return;
    }
    if (!transform) {
        transform = _zeroTransform;
    }
    if (!ancestorIds) {
        ancestorIds = [];
    }
    let cosa = Math.cos(transform.angle * Math.PI / 180);
    let sina = Math.sin(transform.angle * Math.PI / 180);

    for (let i = 0; i < items.length; i++) {
        callback(items[i], transform, parentItem, ancestorIds);
        if (items[i].childItems) {
            visitItems(items[i].childItems, callback, {
                x:      transform.x + items[i].area.x * cosa - items[i].area.y * sina,
                y:      transform.y + items[i].area.x * sina + items[i].area.y * cosa,
                angle:  transform.angle + items[i].area.r
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
        this.eventBus = eventBus;
        this.selectedItems = [];
        this.selectedConnectorWrappers = [];
        this.activeBoundaryBox = null;
        this.itemMap = {};
        this._itemArray = []; // stores all flatten items (all sub-items are stored as well)
        this._destinationToSourceLookup = {}; //a lookup map for discovering source items. id -> id[]
        this.copyBuffer = [];
        this.enrichSchemeWithDefaults(this.scheme);
        this.reindexItems();

        // Used for calculating closest point to svg path
        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
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

    reindexItems() {
        //TODO optimize itemMap to not reconstruct it with every change (e.g. reindex and rebuild connectors only for effected items. This obviously needs to be specified from the caller)
        this.itemMap = {};
        this._destinationToSourceLookup = {};
        this._itemArray = [];

        const itemsWithConnectors = [];
        if (!this.scheme.items) {
            return;
        }
        visitItems(this.scheme.items, (item, transform, parentItem, ancestorIds) => {
            this._itemArray.push(item);
            this.enrichItemWithDefaults(item);
            if (!item.meta) {
                item.meta = {};
            }
            item.meta.transform = transform;
            item.meta.ancestorIds = ancestorIds;
            if (parentItem) {
                item.meta.parentId = parentItem.id;
            }

            if (item.id) {
                this.itemMap[item.id] = item;
            }

            if (item.connectors) {
                itemsWithConnectors.push(item);
            }
        });

        _.forEach(itemsWithConnectors, item => {
            this.buildItemConnectors(item);
        });
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
        if (!item.area) {
            return {x: 0, y: 0};
        }
        
        let transform = _zeroTransform;
        if (item.meta && item.meta.transform) {
            transform = item.meta.transform;
        }

        let tAngle = transform.angle * Math.PI/180,
            cosTA = Math.cos(tAngle),
            sinTA = Math.sin(tAngle),
            angle = (transform.angle + item.area.r) * Math.PI/180,
            cosa = Math.cos(angle),
            sina = Math.sin(angle);

        return {
            x: transform.x + item.area.x * cosTA - item.area.y * sinTA  + x * cosa - y * sina,
            y: transform.y + item.area.x * sinTA + item.area.y * cosTA  + x * sina + y * cosa,
        };
    }

    /**
     * Converts world point to local item coords
     * @param {Number} x world position x
     * @param {Number} y world position y
     * @param {Item} item 
     */
    localPointOnItem(x, y, item) {
        if (!item.area) {
            return {x: 0, y: 0};
        }
        
        let transform = _zeroTransform;
        if (item.meta && item.meta.transform) {
            transform = item.meta.transform;
        }

        let tAngle = transform.angle * Math.PI/180,
            cosTA = Math.cos(tAngle),
            sinTA = Math.sin(tAngle),
            angle = (transform.angle + item.area.r) * Math.PI/180,
            cosa = Math.cos(angle),
            sina = Math.sin(angle),
            tx = transform.x + item.area.x * cosTA - item.area.y * sinTA,
            ty = transform.y + item.area.x * sinTA + item.area.y * cosTA;


        return {
            x: (y - ty)*sina + (x - tx)*cosa,
            y: (y - ty)*cosa - (x - tx)*sina
        };
    }

    getBoundingBoxOfItems(items) {
        if (!items || items.length === 0) {
            return {x: 0, y: 0, w: 0, h: 0};
        }

        let schemeBoundaryBox = null;
        _.forEach(items, item => {
            const points = [
                this.worldPointOnItem(0, 0, item),
                this.worldPointOnItem(item.area.w, 0, item),
                this.worldPointOnItem(item.area.w, item.area.h, item),
                this.worldPointOnItem(0, item.area.h, item),
            ];

            _.forEach(points, point => {
                if (!schemeBoundaryBox) {
                    schemeBoundaryBox = {
                        x: point.x,
                        y: point.y,
                        w: 0,
                        h: 0,
                    }
                } else {
                    if (schemeBoundaryBox.x > point.x) {
                        schemeBoundaryBox.x = point.x;
                    }
                    if (schemeBoundaryBox.x + schemeBoundaryBox.w < point.x) {
                        schemeBoundaryBox.w = point.x - schemeBoundaryBox.x;
                    }
                    if (schemeBoundaryBox.y > point.y) {
                        schemeBoundaryBox.y = point.y;
                    }
                    if (schemeBoundaryBox.y + schemeBoundaryBox.h < point.y) {
                        schemeBoundaryBox.h = point.y + - schemeBoundaryBox.y;
                    }
                }
            });
        }) ;

        return schemeBoundaryBox;
    }

    enrichItemWithDefaults(item, shape) {
        const props = {
            area: {x:0, y: 0, w: 0, h: 0, r: 0},
            opacity: 100.0,
            visible: true,
            blendMode: 'normal',
            text: '',
            description: '',
            
            interactionMode: Item.InteractionMode.SIDE_PANEL,
            shapeProps: {},
            behavior: []
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
        if (!connector.meta) {
            connector.meta = {};
        }
        if (!connector.id || connector.id.length === 0) {
            connector.id = shortid.generate();
        }
        const points = [];

        this.enrichConnectorWithDefaultStyle(connector);

        const destinationItem = this.itemMap[connector.itemId];
        if (destinationItem) {
            this.indexDestinationToSource(sourceItem.id, destinationItem.id);
        }

        if (connector.reroutes && connector.reroutes.length > 0) {
            const sourcePoint = this.findEdgePoint(sourceItem, connector.reroutes[0]);
            points.push(sourcePoint);

            for (let i = 0; i < connector.reroutes.length; i++) {
                if (!connector.reroutes[i].disabled) {
                    const x = connector.reroutes[i].x;
                    const y = connector.reroutes[i].y;
                    points.push({ x, y });
                }
            }
            if (destinationItem) {
                points.push(this.findEdgePoint(destinationItem, connector.reroutes[connector.reroutes.length - 1]));
            }
        } else {
            if (destinationItem) {
                points.push(this.findEdgePoint(sourceItem, {
                    x: destinationItem.area.x + destinationItem.area.w /2,
                    y: destinationItem.area.y + destinationItem.area.h /2,
                }));

                points.push(this.findEdgePoint(destinationItem, {
                    x: sourceItem.area.x + sourceItem.area.w /2,
                    y: sourceItem.area.y + sourceItem.area.h /2,
                }));
            }
        }

        if (!connector.meta) {
            connector.meta = {};
        }
        connector.meta.points = points;
    }

    findEdgePoint(item, nextPoint) {
        if (item.shape) {
            const shape = Shape.find(item.shape);
            if (shape) {
                if (shape.computePath) {
                    const path = shape.computePath(item);
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
        const pathLength = this.shadowSvgPath.getTotalLength();

        const leftSegment = [0, pathLength / 2];
        const rightSegment = [pathLength / 2, pathLength]
        let segmentWidth = pathLength / 2;

        let closestPoint = this.shadowSvgPath.getPointAtLength(0);

        while(segmentWidth > 1) {
            const middle = segmentWidth / 2;
            let pointLeft = this.shadowSvgPath.getPointAtLength(leftSegment[0] + middle);
            let pointRight = this.shadowSvgPath.getPointAtLength(rightSegment[0] + middle);
            let distanceLeft = (localPoint.x - pointLeft.x)*(localPoint.x - pointLeft.x) + (localPoint.y - pointLeft.y) * (localPoint.y - pointLeft.y);
            let distanceRight = (localPoint.x - pointRight.x)*(localPoint.x - pointRight.x) + (localPoint.y - pointRight.y) * (localPoint.y - pointRight.y);

            segmentWidth = middle;
            if (distanceLeft < distanceRight) {
                closestPoint = pointLeft;
                leftSegment[1] = leftSegment[0] + segmentWidth;
            } else {
                closestPoint = pointRight;
                leftSegment[0] = rightSegment[0];
                leftSegment[1] = leftSegment[0] + segmentWidth;
            }
            rightSegment[0] = leftSegment[1];
            rightSegment[1] = rightSegment[0] + segmentWidth;
        }
        
        return this.worldPointOnItem(closestPoint.x, closestPoint.y, item);
    }

    enrichConnectorWithDefaultStyle(connector) {
        utils.extendObject(connector, {
            name: '',
            opacity: 100.0,
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

    deleteSelectedItemsAndConnectors() {
        var removed = 0;
        if (this.selectedItems && this.selectedItems.length > 0) {
            _.forEach(this.selectedItems, item => {
                this.removeConnectorsForItem(item);
            });

            _.remove(this.scheme.items, item => _.includes(this.selectedItems, item));
            this.selectedItems = [];
            removed += 1;
        }
        if (this.selectedConnectorWrappers && this.selectedConnectorWrappers.length > 0) {
            _.forEach(this.selectedConnectorWrappers, cw => {
                if (cw.sourceItem.connectors && cw.sourceItem.connectors.length > cw.connectorIndex) {
                    cw.sourceItem.connectors.splice(cw.connectorIndex, 1);
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
            item.meta = {
                hovered: false,
                selected: false
            };
        }
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

    selectConnector(sourceItem, connectorIndex, inclusive) {
        // only select connector that do have meta, otherwise it would be imposible to click them
        if (inclusive) {
            throw new Error('not supported yet');
        } else {
            this.deselectAllConnectors();

            if (sourceItem.connectors && sourceItem.connectors.length > connectorIndex) {
                var connector = sourceItem.connectors[connectorIndex];
                if (connector.meta && !connector.meta.selected) {
                    connector.meta.selected = true;
                    this.selectedConnectorWrappers.push({ sourceItem, connectorIndex });
                }
            }
        }
    }

    deselectAllConnectors() {
        _.forEach(this.selectedConnectorWrappers, cw => {
            if (cw.sourceItem.connectors && cw.sourceItem.connectors.length > cw.connectorIndex) {
                const connector = cw.sourceItem.connectors[cw.connectorIndex];
                if (connector.meta) {
                    connector.meta.selected = false;
                }
                this.eventBus.emitConnectorDeselected(connector.id, connector);
            }
        });
        this.selectedConnectorWrappers = [];
    }

    isItemSelected(item) {
        return item.meta.selected || false;
    }

    /**
     * Selects a specifies item and deselects any other items that were selected previously
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
            this.selectedItems = [item];

            this.eventBus.emitItemSelected(item.id);
        }

        if (item.group && item.group.length > 0) {
            _.forEach(this.scheme.items, otherItem => {
                if (otherItem.group === item.group && otherItem.id !== item.id) {
                    this.selectItemInclusive(otherItem);
                    this.eventBus.emitItemSelected(otherItem.id);
                }
            });
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

    bringSelectedItemsToBack() {
        let i = 0;
        let lastItems = [];
        while (i < this.scheme.items.length) {
            if (this.scheme.items[i].meta.selected) {
                lastItems.push(this.scheme.items[i]);
                this.scheme.items.splice(i, 1);
            } else {
                i++;
            }
        }

        this.scheme.items = lastItems.concat(this.scheme.items);
    }

    bringSelectedItemsToFront() {
        let i = 0;
        let topItems = [];
        while (i < this.scheme.items.length) {
            if (this.scheme.items[i].meta.selected) {
                topItems.push(this.scheme.items[i]);
                this.scheme.items.splice(i, 1);
            } else {
                i++;
            }
        }

        this.scheme.items = this.scheme.items.concat(topItems);
    }

    provideBoundingBoxDraggers(item) {
        // OPTIMIZE: should not construct entire array of draggers each time, as it is used in mouseMove event
        var s = 5;
        return [{
            x: 0, y: 0, s: s, edges: ['top', 'left']
        },{
            x: item.area.w, y:0, s: s, edges: ['top', 'right']
        },{
            x: item.area.w, y: item.area.h, s: s, edges: ['bottom', 'right']
        },{
            x: 0, y: item.area.h, s: s, edges: ['bottom', 'left']
        }, {
            x: Math.floor(item.area.w / 2), y: 0, s: s, edges: ['top']
        },{
            x: Math.floor(item.area.w / 2), y: item.area.h, s: s, edges: ['bottom']
        },{
            x: item.area.w, y: Math.floor(item.area.h / 2), s: s, edges: ['right']
        },{
            x: 0, y: Math.floor(item.area.h / 2), s: s, edges: ['left']
        }, {
            x: item.area.w/2, y: - 30, s, rotation: true
        }];
    }

    /**
    Adds a reroute in specified connector and returns an index (in the reroutes array)
    */
    addReroute(x, y, sourceItem, connector) {
        if (!connector.reroutes) {
            connector.reroutes = [];
        }

        var id = connector.reroutes.length;
        if (connector.reroutes.length > 0) {
            id = this.findMatchingRerouteSegment(x, y, connector);
        }

        connector.reroutes.splice(id, 0, {
            x: x,
            y: y
        });
        this.buildConnector(sourceItem, connector);
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
        var item = this.itemMap[itemId];
        if (item) {
            return item;
        } else {
            return _.find(this.scheme.items, item => item.id === itemId);
        }
    }

    getConnectingSourceItemIds(destinationId) {
        return this._destinationToSourceLookup[destinationId];
    }

    groupSelectedItems() {
        var groupId = shortid.generate();
        _.forEach(this.selectedItems, item => {
            item.group = groupId;
        })
    }

    ungroupItem(item) {
        if (item.group) {
            var group = item.group;
            item.group = null;
            var leftoverGroupItems = _.filter(this.scheme.items, otherItem => {return otherItem.group === group});
            if (leftoverGroupItems.length === 1) {
                leftoverGroupItems[0].group = null;
            }
        }
    }

    copySelectedItems() {
        this.copyBuffer = [].concat(this.selectedItems);
    }

    pasteSelectedItems() {
        this.deselectAllItems();

        var newItems = [];

        _.forEach(this.copyBuffer, originalItem => {
            var item = JSON.parse(JSON.stringify(originalItem));
            item.area.x += -50;
            item.area.y += -50;
            item.meta = {
                hovered: false,
                selected: false
            };
            delete item.id;
            item.connectors = [];
            item = this.addItem(item);
            this.selectItem(item, true);
            newItems.push(item);
        });

        return newItems;
    }
}


export default SchemeContainer;
