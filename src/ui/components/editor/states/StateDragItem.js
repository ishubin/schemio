import State from './State.js';
import EventBus from '../EventBus.js';
import _ from 'lodash';

export default class StateDragItem extends State {
    constructor(editor) {
        super(editor);
        this.name = 'drag-item';
        this.schemeContainer = editor.schemeContainer;
        this.originalPoint = {x: 0, y: 0};
        this.startedDragging = true;
        this.selectedItem = null;
        this.itemOriginalArea = {x: 0, y: 0, w: 0, h: 0};
        this.hasDraggedItems = false;
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
    }

    reset() {
        this.startedDragging = false;
        this.selectedItem = null;
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
        this.dragger = null;
        this.hasDraggedItems = false;
    }

    initDraggingForItem(item, x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.itemOriginalArea.x = item.area.x;
        this.itemOriginalArea.y = item.area.y;
        this.itemOriginalArea.w = item.area.w;
        this.itemOriginalArea.h = item.area.h;
        this.startedDragging = true;
    }

    initDraggingForReroute(connector, rerouteId, x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.startedDragging = true;
        this.selectedConnector = connector;
        this.selectedRerouteId = rerouteId;
    }

    mouseDown(x, y, mx, my, object, event) {
        var selectedItems = this.schemeContainer.getSelectedItems();
        if (selectedItems && selectedItems.length > 0) {
            var dragger = this.findDraggerAtPoint(selectedItems, x, y, mx, my);
            if (dragger) {
                this.dragger = dragger;
                this.initDraggingForItem(dragger.item, x, y);
                return;
            }
        }
        // proceed initiating item or connector drag if dragger wasn't found
        if (connector) {
            if (connector && (event.metaKey || event.ctrlKey)) {
                if (rerouteId >= 0) {
                    connector.reroutes.splice(rerouteId, 1);
                    this.schemeContainer.buildConnector(connector);
                    EventBus.$emit(EventBus.REDRAW_CONNECTOR, connector);
                } else {
                    rerouteId = this.schemeContainer.addReroute(x, y, connector);
                    this.initDraggingForReroute(connector, rerouteId, x, y);
                    EventBus.$emit(EventBus.REDRAW_CONNECTOR, connector);
                }
            } else {
                this.schemeContainer.selectConnector(connector, false);
                this.schemeContainer.deselectAllItems();
                EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED, connector);
                EventBus.$emit(EventBus.CONNECTOR_SELECTED, connector);
                EventBus.$emit(EventBus.REDRAW);
                EventBus.$emit(EventBus.REDRAW_CONNECTOR);
                if (rerouteId >= 0) {
                    this.initDraggingForReroute(connector, rerouteId, x, y);
                }
            }
        } else if (item) {
            this.selectedItem = item;
            this.initDraggingForItem(item, x, y);

            if (!item.selected) {
                this.schemeContainer.selectItem(item, false);
                this.schemeContainer.deselectAllConnectors();
                EventBus.$emit(EventBus.ITEM_SELECTED, item);
                EventBus.$emit(EventBus.ALL_CONNECTORS_DESELECTED, item);
            }
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging) {
            if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.reset();
            } else {
                if (this.dragger && !this.dragger.item.locked) {
                    this.dragByDragger(this.dragger.item, this.dragger.dragger, x, y);
                } else if (this.selectedItem && !this.selectedItem.locked) {
                    this.dragItem(x, y);
                } else if (this.selectedConnector && this.selectedRerouteId >= 0) {
                    this.drageReroute(x, y);
                }
            }
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (event.doubleClick && connector) {
            if (rerouteId >= 0) {
                connector.reroutes.splice(rerouteId, 1);
                this.schemeContainer.buildConnector(connector);
                EventBus.$emit(EventBus.REDRAW_CONNECTOR, connector);
            } else {
                var rerouteId = this.schemeContainer.addReroute(x, y, connector);
                EventBus.$emit(EventBus.REDRAW_CONNECTOR, connector);
            }
        }
        this.reset();
    }

    dragItem(x, y) {
        var dx = x - this.originalPoint.x;
        var dy = y - this.originalPoint.y;

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            this.selectedItem.area.x = this.itemOriginalArea.x + dx;
            this.selectedItem.area.y = this.itemOriginalArea.y + dy;

            this.rebuildItemConnectors(this.selectedItem);
            EventBus.$emit(EventBus.REDRAW);
            this.hasDraggedItems = true;
        } else {
            this.hasDraggedItems = false;
        }
    }

    drageReroute(x, y) {
        var dx = x - this.originalPoint.x;
        var dy = y - this.originalPoint.y;

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            this.selectedConnector.reroutes[this.selectedRerouteId].x = x;
            this.selectedConnector.reroutes[this.selectedRerouteId].y = y;
            this.schemeContainer.buildConnector(this.selectedConnector);
            EventBus.$emit(EventBus.REDRAW_CONNECTOR, this.selectedConnector);
        }
    }

    dragByDragger(item, dragger, x, y) {
        var nx = item.area.x;
        var ny = item.area.y;
        var nw = item.area.w;
        var nh = item.area.h;

        var change = 0;

        _.forEach(dragger.edges, edge => {
            if (edge === 'top') {
                var dy = y - dragger.y;
                change += Math.abs(dy);
                ny = this.itemOriginalArea.y + dy;
                nh = this.itemOriginalArea.h - dy;
            } else if (edge === 'bottom') {
                var dy = y - dragger.y;
                change += Math.abs(dy);
                nh = this.itemOriginalArea.h + dy;
            } else if (edge === 'left') {
                var dx = x - dragger.x;
                change += Math.abs(dx);
                nx = this.itemOriginalArea.x + dx;
                nw = this.itemOriginalArea.w - dx;
            } else if (edge === 'right') {
                var dx = x - dragger.x;
                change += Math.abs(dx);
                nw = this.itemOriginalArea.w + dx;
            }
        });
        if (change > 0) {
            this.hasDraggedItems = true;
            this.rebuildItemConnectors(item);
        } else {
            this.hasDraggedItems = false;
        }
        if (nw > 0 && nh > 0) {
            item.area.x = nx;
            item.area.y = ny;
            item.area.w = nw;
            item.area.h = nh;
        }
    }

    rebuildItemConnectors(item) {
        if (item.meta && item.meta.connectorsMap) {
            _.forEach(item.meta.connectorsMap, (connector, connectorId) => {
                this.schemeContainer.buildConnector(connector);
                EventBus.$emit(EventBus.REDRAW_CONNECTOR, connector);
            });
        }
    }

    findDraggerAtPoint(items, x, y, mx, my) {
        for (var i = 0; i < items.length; i++) {
            var item = items[i];

            var draggers = this.schemeContainer.provideBoundingBoxDraggers(item);

            for (var j = 0; j < draggers.length; j++) {
                var dragger = draggers[j];
                var draggerMX = this.editor._x(dragger.x);
                var draggerMY = this.editor._y(dragger.y);

                if (Math.abs(mx - draggerMX) <= dragger.s
                    && Math.abs(my - draggerMY) <= dragger.s) {
                    return {
                        item, dragger
                    };
                }
            }
        }
        return null;
    }
}
