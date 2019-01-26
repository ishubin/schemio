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
                locked: false,
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

        var sourcePoint, destinationPoint;
        if (connector.reroutes && connector.reroutes.length > 0) {
            sourcePoint = this.findEdgePoint(sourceItem, connector.reroutes[0]);
            destinationPoint = this.findEdgePoint(destinationItem, connector.reroutes[connector.reroutes.length - 1]);
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
            points = points.concat(connector.reroutes);
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

    findEdgePoint(item, nextPoint) {
        if (item.style.shape === 'ellipse') {
            return this.findEdgePointOnEllipse(item.area, nextPoint);
        } else {
            return this.findEdgePointOnRect(item.area, nextPoint);
        }
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
            return {
                x: x0 + dx * t,
                y: y0 + dy * t
            };
        }

        return {
            x: x0, y: y0
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
                        return {
                            x: x3 + t * (x4 - x3),
                            y: y3 + t * (y4 - y3),
                        }
                    }
                }
            }
        }

        return {x: x3, y: y3};
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
