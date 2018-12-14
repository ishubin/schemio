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
        this.sortedItemsIndex = null;
        this.activeBoundaryBox = null;
        this.schemeBoundaryBox = {x: 0, y: 0, w: 100, h: 100};
        this.itemMap = {};
        this.reindexItems();
    }

    reindexItems() {
        var sortedItems = [].concat(this.scheme.items);
        sortedItems.sort((a,b) => {
            var areaA = a.area.w * a.area.h,
                areaB = b.area.w * b.area.h;
            return areaA - areaB;
        });

        //TODO optimize itemMap to not reconstruct it with every change
        this.itemMap = {};
        if (sortedItems.length > 0) {
            this.schemeBoundaryBox.x = sortedItems[0].area.x;
            this.schemeBoundaryBox.y = sortedItems[0].area.y;
            this.schemeBoundaryBox.w = sortedItems[0].area.w;
            this.schemeBoundaryBox.h = sortedItems[0].area.h;

            _.forEach(sortedItems, item => {
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
        this.sortedItemsIndex = sortedItems;
    }

    buildConnectors() {
        //TODO optimize connectors and only rebuild the ones that were affected
        if (this.scheme.connectors) {
            _.forEach(this.scheme.connectors, schemeConnector => {
                this.buildConnector(schemeConnector);
            });
        }
    }

    buildConnector(schemeConnector) {
        this.enrichConnectorWithDefaultStyle(schemeConnector);
        var sourceItem = this.itemMap[schemeConnector.sourceId];
        var destinationItem = this.itemMap[schemeConnector.destinationId];
        if (!sourceItem || !destinationItem) {
            return null;
        }

        var sourceEdge = null, destinationEdge  = null;
        if (schemeConnector.reroutes && schemeConnector.reroutes.length > 0) {
            sourceEdge = this.identifyConnectorEdge(sourceItem.area, schemeConnector.reroutes[0]);
            destinationEdge = this.identifyConnectorEdge(destinationItem.area, schemeConnector.reroutes[schemeConnector.reroutes.length - 1]);
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

        var points = [{
            x: (sourceEdge.x1 + sourceEdge.x2) / 2,
            y: (sourceEdge.y1 + sourceEdge.y2) / 2
        }];

        if (schemeConnector.reroutes) {
            points = points.concat(schemeConnector.reroutes);
        }
        points.push({
            x: (destinationEdge.x1 + destinationEdge.x2) / 2,
            y: (destinationEdge.y1 + destinationEdge.y2) / 2
        });

        if (!schemeConnector.meta) {
            schemeConnector.meta = {};
        }
        schemeConnector.meta.points = points;
    }

    enrichConnectorWithDefaultStyle(connector) {
        if (!connector.style) {
            connector.style = {};
        }
        if (!connector.style.color) {
            connector.style.color = '#333';
        }
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
                x1: area.x, y1: area.y, x2: area.x + area.w, y2: area.y
            };
        } else if (placementId === 1) {
            return {
                x1: area.x + area.w, y1: area.y, x2: area.x + area.w, y2: area.y + area.h
            };
        } else if (placementId === 2) {
            return {
                x1: area.x, y1: area.y + area.h, x2: area.x + area.w, y2: area.y + area.h
            };
        } else {
            return {
                x1: area.x, y1: area.y, x2: area.x, y2: area.y + area.h
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
                var schemeConnector = {
                    id: shortid.generate(),
                    sourceId: sourceItem.id,
                    destinationId: destinationItem.id,
                    reroutes: []
                };
                this.scheme.connectors.push(schemeConnector);

                this.buildConnector(schemeConnector);
            }
        }
    }

    getSelectedItems() {
        return this.selectedItems;
    }

    deleteSelectedItems() {
        if (this.selectedItems && this.selectedItems.length > 0) {
            _.remove(this.scheme.items, item => _.includes(this.selectedItems, item));
            this.reindexItems();
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
        return _.find(this.sortedItemsIndex, item => myMath.isPointInArea(x, y, item.area));
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

            if (connector.meta) {
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
            item.meta.selected = true;
            this.selectedItems.push(item);
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
}


export default SchemeContainer;
