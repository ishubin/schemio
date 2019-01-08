import _ from 'lodash';
import myMath from '../myMath.js';
import shortid from 'shortid';
/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    constructor(scheme) {
        this.scheme = scheme;
        this.selectedItems = [];
        this.selectedConnectors = [];
        this.activeBoundaryBox = null;
        this.schemeBoundaryBox = {x: 0, y: 0, w: 100, h: 100};
        this.itemMap = {};
        this.reindexItems();
    }

    reindexItems() {
        //TODO optimize itemMap to not reconstruct it with every change
        this.itemMap = {};
        var items = this.scheme.items;
        if (items.length > 0) {
            this.schemeBoundaryBox.x = items[0].area.x;
            this.schemeBoundaryBox.y = items[0].area.y;
            this.schemeBoundaryBox.w = items[0].area.w;
            this.schemeBoundaryBox.h = items[0].area.h;

            _.forEach(items, item => {
                this.enrichItemWithDefaultStyles(item);
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
        } else {
            this.schemeBoundaryBox = {x: 0, y: 0, w: 100, h: 100};
        }

        this.buildConnectors();
    }

    enrichItemWithDefaultStyles(item) {
        if (item.type === 'component') {
            this.extendObject(item, {
                style: {
                    shape: 'component',
                    background: {
                        color: '#ddd'
                    },
                    text: {
                        color: '#333'
                    },
                    properties: {
                        background: {
                            color: '#eee'
                        },
                        text: {
                            color: '#888'
                        }
                    },
                    stroke: {
                        color: '#666',
                        size: 1
                    }
                }
            });
        }
    }

    buildConnectors() {
        if (this.scheme.connectors) {
            _.forEach(this.scheme.connectors, connector => {
                this.buildConnector(connector);
            });
        }
    }

    reindexConnector(connector, item) {
        if (!item.meta) {
            item.meta = {};
        }

        if (!item.meta.connectorsMap) {
            item.meta.connectorsMap = {};
        }

        item.meta.connectorsMap[connector.id] = connector;
    }

    buildConnector(connector) {
        this.enrichConnectorWithDefaultStyle(connector);
        var sourceItem = this.itemMap[connector.sourceId];
        var destinationItem = this.itemMap[connector.destinationId];
        if (!sourceItem || !destinationItem) {
            return;
        }

        this.reindexConnector(connector, sourceItem);
        this.reindexConnector(connector, destinationItem);

        var sourceEdge = null, destinationEdge  = null;
        if (connector.reroutes && connector.reroutes.length > 0) {
            sourceEdge = this.identifyConnectorEdge(sourceItem.area, connector.reroutes[0]);
            destinationEdge = this.identifyConnectorEdge(destinationItem.area, connector.reroutes[connector.reroutes.length - 1]);
        } else {
            sourceEdge = this.identifyConnectorEdge(sourceItem.area, {
                x: destinationItem.area.x + destinationItem.area.w /2,
                y: destinationItem.area.y + destinationItem.area.h /2,
            });
            destinationEdge = this.identifyConnectorEdge(destinationItem.area, {
                x: sourceItem.area.x + sourceItem.area.w /2,
                y: sourceItem.area.y + sourceItem.area.h /2,
            });
        }

        var points = [];
        if (connector.reroutes && connector.reroutes.length > 0) {
            points.push(this.clampPointToEdge(connector.reroutes[0], sourceEdge));
            points = points.concat(connector.reroutes);
            points.push(this.clampPointToEdge(connector.reroutes[connector.reroutes.length - 1], destinationEdge));
        } else {
            points.push({
                x: (sourceEdge.x1 + sourceEdge.x2) / 2,
                y: (sourceEdge.y1 + sourceEdge.y2) / 2
            });

            points.push({
                x: (destinationEdge.x1 + destinationEdge.x2) / 2,
                y: (destinationEdge.y1 + destinationEdge.y2) / 2
            });
        }

        if (!connector.meta) {
            connector.meta = {};
        }
        connector.meta.points = points;
    }

    clampPointToEdge(point, edge) {
        var p = {x: 0, y: 0};
        if (edge.horizontal) {
            p.x = this.clamp(point.x, edge.x1, edge.x2);
            p.y = edge.y1;
        } else {
            p.x = edge.x1;
            p.y = this.clamp(point.y, edge.y1, edge.y2);
        }
        return p;
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    enrichConnectorWithDefaultStyle(connector) {
        this.extendObject(connector, {
            style: {
                color: '#333',
                width: 1,
                pattern: 'line',
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

    identifyConnectorEdge(area, point) {
        var lines = [
            {x1: area.x, y1: area.y, x2: area.x - 100, y2: area.y - 100}, //top-left
            {x1: area.x + area.w, y1: area.y, x2: area.x + area.w + 100, y2: area.y - 100}, //top-right
            {x1: area.x + area.w, y1: area.y + area.h, x2: area.x + area.w + 100, y2: area.y + area.h + 100}, //bottom-right
            {x1: area.x, y1: area.y + area.h, x2: area.x - 100, y2: area.y + area.h + 100} //bottom-left
        ];

        var pointPlacements = _.map(lines, line => {
            return myMath.findPointPlacementToLine(line, point) >= 0 ? 1: 0;
        });

        var placementId = Math.max(0, _.findIndex(pointPlacements, (side, index) => {
            return side - pointPlacements[(index + 1 ) % pointPlacements.length] < 0;
        }));

        if (placementId === 0) {
            return {
                x1: area.x, y1: area.y, x2: area.x + area.w, y2: area.y, horizontal: true
            };
        } else if (placementId === 1) {
            return {
                x1: area.x + area.w, y1: area.y, x2: area.x + area.w, y2: area.y + area.h, horizontal: false
            };
        } else if (placementId === 2) {
            return {
                x1: area.x, y1: area.y + area.h, x2: area.x + area.w, y2: area.y + area.h, horizontal: true
            };
        } else {
            return {
                x1: area.x, y1: area.y, x2: area.x, y2: area.y + area.h, horizontal: false
            };
        }

    }

    connectItems(sourceItem, destinationItem) {
        if (sourceItem !== destinationItem && sourceItem.id && destinationItem.id) {
            if (!this.scheme.connectors) {
                this.scheme.connectors = [];
            }

            var alreadyExistingConnection = _.find(this.scheme.connectors, c => {
                return (c.sourceId === sourceItem.id && c.destinationId === destinationItem.id)
                    || (c.sourceId === destinationItem.id && c.destinationId === sourceItem.id);
            });

            if (!alreadyExistingConnection) {
                var connector = {
                    id: shortid.generate(),
                    sourceId: sourceItem.id,
                    destinationId: destinationItem.id,
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
                this.scheme.connectors.push(connector);

                this.buildConnector(connector);
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
        if (this.selectedConnectors && this.selectedConnectors.length > 0) {
            _.remove(this.scheme.connectors, connector => _.includes(this.selectedConnectors, connector));
            this.selectedConnectors = [];
            removed += 1;
        }
        if (removed > 0) {
            this.reindexItems();
        }
    }

    removeConnectorsForItem(item) {
        if (item.meta && item.meta.connectorsMap) {
            _.remove(this.scheme.connectors, connector => item.meta.connectorsMap.hasOwnProperty(connector.id));
        }
    }

    addItem(item) {
        if (!item.hasOwnProperty('meta')) {
            item.meta = {};
        }
        this.scheme.items.push(item);
        this.reindexItems();
    }

    getItems() {
        return this.scheme.items;
    }

    findHoveredItem(x, y) {
        return _.findLast(this.scheme.items, item => myMath.isPointInArea(x, y, item.area));
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
            connector.meta.selected = false;
        });
        this.selectedConnectors = [];
    }

    selectItem(item, inclusive) {
        if (inclusive) {
            this.selectItemInclusive();
        } else {
            this.deselectAllItems();

            if (!item.meta.selected) {
                item.meta.selected = true;
                this.selectedItems.push(item);
            }
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

    bringToBack(item) {
        var i = _.findIndex(this.scheme.items, schemeItem => schemeItem.id === item.id);
        if (i > 0) {
            var element = this.scheme.items.splice(i, 1)[0];
            this.scheme.items.unshift(element);
        }
    }

    bringToFront(item) {
        var i = _.findIndex(this.scheme.items, schemeItem => schemeItem.id === item.id);
        if (i >= 0) {
            var element = this.scheme.items.splice(i, 1)[0];
            this.scheme.items.push(element);
        }
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
    addReroute(x, y, connector) {
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
        this.buildConnector(connector);
        return id;
    }

    findMatchingRerouteSegment(x, y, connector) {
        var point = {x, y};
        if (!connector.meta || !connector.meta.points) {
            this.buildConnector(connector);
        }
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

    extendObject(originalObject, overrideObject) {
        _.forEach(overrideObject, (value, key) => {
            if (!originalObject.hasOwnProperty(key)) {
                originalObject[key] = value;
            } else {
                if (typeof value === 'object') {
                    this.extendObject(originalObject[key], value);
                }
            }
        }) ;
    }
}


export default SchemeContainer;
