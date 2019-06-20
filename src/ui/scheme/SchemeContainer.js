/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import _ from 'lodash';
import myMath from '../myMath.js';
import utils from '../utils.js';
import shortid from 'shortid';


const CONNECTOR_SMOOTH_RATIO = 6;
/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    constructor(scheme) {
        this.scheme = scheme;
        this.selectedItems = [];
        this.selectedConnectorWrappers = [];
        this.activeBoundaryBox = null;
        this.schemeBoundaryBox = {x: 0, y: 0, w: 100, h: 100};
        this.itemMap = {};
        this._destinationToSourceLookup = {}; //a lookup map for discovering source items. id -> id[]
        this.copyBuffer = [];
        this.reindexItems();
    }

    reindexItems() {
        //TODO optimize itemMap to not reconstruct it with every change
        this.itemMap = {};
        this._destinationToSourceLookup = {};
        var items = this.scheme.items;
        if (items.length > 0) {
            this.schemeBoundaryBox.x = items[0].area.x;
            this.schemeBoundaryBox.y = items[0].area.y;
            this.schemeBoundaryBox.w = items[0].area.w;
            this.schemeBoundaryBox.h = items[0].area.h;

            _.forEach(items, item => {
                if (!item.meta) {
                    item.meta = {};
                }
                if (item.id) {
                    this.itemMap[item.id] = item;
                }

                if (this.schemeBoundaryBox.x > item.area.x) {
                    this.schemeBoundaryBox.x = item.area.x;
                }
                if (this.schemeBoundaryBox.x + this.schemeBoundaryBox.w < item.area.x + item.area.w) {
                    this.schemeBoundaryBox.w = item.area.x + item.area.w - this.schemeBoundaryBox.x;
                }
                if (this.schemeBoundaryBox.y > item.area.y) {
                    this.schemeBoundaryBox.y = item.area.y;
                }
                if (this.schemeBoundaryBox.y + this.schemeBoundaryBox.h < item.area.y + item.area.h) {
                    this.schemeBoundaryBox.h = item.area.y + item.area.h - this.schemeBoundaryBox.y;
                }
            });

            _.forEach(items, item => {
                this.buildItemConnectors(item);
            });
        } else {
            this.schemeBoundaryBox = {x: 0, y: 0, w: 100, h: 100};
        }
    }

    buildItemConnectors(item) {
        if (item.connectors) {
            _.forEach(item.connectors, connector => {
                this.buildConnector(item, connector);
            });
        }
    }

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

        this.enrichConnectorWithDefaultStyle(connector);
        var destinationItem = this.itemMap[connector.itemId];
        if (!sourceItem || !destinationItem) {
            return;
        }

        this.indexDestinationToSource(sourceItem.id, destinationItem.id);

        var sourcePoint, destinationPoint;
        if (connector.reroutes && connector.reroutes.length > 0) {
            sourcePoint = this.findEdgePoint(sourceItem, connector.reroutes[0], true);
            destinationPoint = this.findEdgePoint(destinationItem, connector.reroutes[connector.reroutes.length - 1], true);
        } else {
            sourcePoint = this.findEdgePoint(sourceItem, {
                x: destinationItem.area.x + destinationItem.area.w /2,
                y: destinationItem.area.y + destinationItem.area.h /2,
            });
            destinationPoint = this.findEdgePoint(destinationItem, {
                x: sourceItem.area.x + sourceItem.area.w /2,
                y: sourceItem.area.y + sourceItem.area.h /2,
            });
        }

        var points = [];
        if (connector.reroutes && connector.reroutes.length > 0) {
            points.push(sourcePoint);

            var previousPoint = sourcePoint;
            var nextPoint = null;
            for (var i = 0; i < connector.reroutes.length; i++) {
                if (i < connector.reroutes.length - 1) {
                    nextPoint = connector.reroutes[i+1];
                } else {
                    nextPoint = destinationPoint;
                }

                var x = connector.reroutes[i].x;
                var y = connector.reroutes[i].y;
                var vx = (nextPoint.x - previousPoint.x)/CONNECTOR_SMOOTH_RATIO;
                var vy = (nextPoint.y - previousPoint.y)/CONNECTOR_SMOOTH_RATIO;
                points.push({
                    x, y,
                    qax: x - vx, qay: y - vy,
                    qbx: x + vx, qby: y + vy
                });

                previousPoint = connector.reroutes[i];
            }

            points.push(destinationPoint);
        } else {
            points.push(sourcePoint);
            points.push(destinationPoint);
        }

        if (!connector.meta) {
            connector.meta = {};
        }
        connector.meta.points = points;
    }

    findEdgePoint(item, nextPoint, allowPerpendicularLines) {
        if (item.type === 'component' && item.style.shape === 'ellipse') {
            return this.findEdgePointOnEllipse(item.area, nextPoint);
        } else {
            if (allowPerpendicularLines) {
                var point = this.findPerpendicularEdgePoint(item.area, nextPoint);
                if (point) {
                    return point;
                }
            }
            return this.findEdgePointOnRect(item.area, nextPoint, allowPerpendicularLines);
        }
    }

    findPerpendicularEdgePoint(area, nextPoint) {
        if (nextPoint.y >= area.y && nextPoint.y <= area.y + area.h) {
            if (nextPoint.x <= area.x) {
                return {x: area.x, y: nextPoint.y, qx: area.x - (area.x - nextPoint.x)/CONNECTOR_SMOOTH_RATIO, qy: nextPoint.y};
            } else if (nextPoint.x >= area.x + area.w) {
                return {x: area.x + area.w, y: nextPoint.y,  qx: area.x + area.w + (nextPoint.x - area.x - area.w)/CONNECTOR_SMOOTH_RATIO, qy: nextPoint.y};
            }
        }

        if (nextPoint.x >= area.x && nextPoint.x <= area.x + area.w) {
            if (nextPoint.y <= area.y) {
                return {x: nextPoint.x, y: area.y, qx: nextPoint.x, qy: area.y - (area.y - nextPoint.y)/CONNECTOR_SMOOTH_RATIO};
            } else if (nextPoint.y >= area.y + area.h) {
                return {x: nextPoint.x, y: area.y + area.h, qx: nextPoint.x, qy: area.y + area.h + (nextPoint.y - area.y - area.h)/CONNECTOR_SMOOTH_RATIO};
            }
        }
        return null;
    }

    findEdgePointOnEllipse(area, nextPoint) {
        var a = area.w / 2,
            b = area.h / 2,
            x0 = area.x + a,
            y0 = area.y + b,
            dx = nextPoint.x - x0,
            dy = nextPoint.y - y0,
            D = b*b*dx*dx + a*a*dy*dy;

        if (D > 0) {
            var t = b*a / Math.sqrt(D);
            var point = {
                x: x0 + dx * t,
                y: y0 + dy * t,
            };

            point.qx = (nextPoint.x - point.x) / 5 + point.x;
            point.qy = (nextPoint.y - point.y) / 5 + point.y;
            return point;
        }

        return {
            x: x0, y: y0,
            qx: x0, qy: y0
        };
    }

    findEdgePointOnRect(area, nextPoint) {
        var x3 = area.x + area.w / 2,
            y3 = area.y + area.h / 2,
            x4 = nextPoint.x,
            y4 = nextPoint.y;

        //iterate through all edges to find out if there is an intersection point from center of item to "nextPoint"
        var edges = [
            {x1: area.x, y1: area.y, x2: area.x + area.w, y2: area.y}, // top
            {x1: area.x, y1: area.y, x2: area.x, y2: area.y + area.h}, // left
            {x1: area.x + area.w, y1: area.y, x2: area.x + area.w, y2: area.y + area.h}, // right
            {x1: area.x, y1: area.y + area.h, x2: area.x + area.w, y2: area.y + area.h} // bottom
        ];

        for (var i = 0; i < edges.length; i++) {
            var e = edges[i];
            var td = (x4 - x3) * (e.y1 - e.y2) - (e.x1 - e.x2) * (y4 - y3);
            if (Math.abs(td) > 0.0001) {
                var t = ((y3 - y4) * (e.x1 - x3) + (x4 - x3) * (e.y1 - y3)) / td;
                if (t >= 0 && t <= 1.0) {
                    // checking if the intersection is within second line segment as well
                    t = ((e.y1 - e.y2) * (e.x1 - x3) + (e.x2 - e.x1) * (e.y1 - y3)) / td;
                    if (t >= 0 && t <= 1.0) {
                        var point = {
                            x: x3 + t * (x4 - x3),
                            y: y3 + t * (y4 - y3),
                        };

                        point.qx = (nextPoint.x - point.x) / 2 + point.x;
                        point.qy = (nextPoint.y - point.y) / 2 + point.y;
                        return point;
                    }
                }
            }
        }

        return {x: x3, y: y3, qx: x3, qy: y3};
    }

    enrichConnectorWithDefaultStyle(connector) {
        utils.extendObject(connector, {
            style: {
                color: '#333',
                width: 1,
                pattern: 'line',
                smooth: false,
                destination: {
                    type: 'arrow',
                    size: 5
                },
                source: {
                    type: 'empty',
                    size: 5
                }
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
        return this.scheme.items;
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
                cw.sourceItem.connectors[cw.connectorIndex].meta.selected = false;
            }
        });
        this.selectedConnectorWrappers = [];
    }

    selectItem(item, inclusive) {
        if (inclusive) {
            this.selectItemInclusive(item);
        } else {
            this.deselectAllItems();

            if (!item.meta.selected) {
                item.meta.selected = true;
                this.selectedItems.push(item);
            }
        }

        if (item.group && item.group.length > 0) {
            _.forEach(this.scheme.items, otherItem => {
                if (otherItem.group === item.group && otherItem.id !== item.id) {
                    this.selectItemInclusive(otherItem);
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
        } else {
            item.meta.selected = false;
            this.selectedItems.splice(i, 1);
        }
    }

    deselectAllItems() {
        _.forEach(this.selectedItems, item => {
            item.meta.selected = false;
        });
        this.selectedItems = [];
    }

    selectByBoundaryBox(box) {
        _.forEach(this.scheme.items, item => {
            if (myMath.isAreaInArea(item.area, box)) {
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
            x: item.area.x, y: item.area.y, s: s, edges: ['top', 'left']
        },{
            x: item.area.x + item.area.w, y: item.area.y, s: s, edges: ['top', 'right']
        },{
            x: item.area.x + item.area.w, y: item.area.y + item.area.h, s: s, edges: ['bottom', 'right']
        },{
            x: item.area.x, y: item.area.y + item.area.h, s: s, edges: ['bottom', 'left']
        }, {
            x: item.area.x + Math.floor(item.area.w / 2), y: item.area.y, s: s, edges: ['top']
        },{
            x: item.area.x + Math.floor(item.area.w / 2), y: item.area.y + item.area.h, s: s, edges: ['bottom']
        },{
            x: item.area.x + item.area.w, y: item.area.y + Math.floor(item.area.h / 2), s: s, edges: ['right']
        },{
            x: item.area.x, y: item.area.y + Math.floor(item.area.h / 2), s: s, edges: ['left']
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
