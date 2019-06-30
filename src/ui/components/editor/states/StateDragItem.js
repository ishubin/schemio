/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
        this.sourceItem = null; // source item for a connector
        this.multiSelectBox = null;

        ///used in order to optimize rebuilding of all connectors
        this.connectorsBuildChache = null;
    }

    reset() {
        this.startedDragging = false;
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
        this.dragger = null;
        this.sourceItem = null;
        this.multiSelectBox = null;
        this.connectorsBuildChache = null;
    }

    keyPressed(key, keyOptions) {
        var delta = keyOptions.ctrlCmdPressed ? 10: 1;
        if (EventBus.KEY.LEFT === key) {
            this.dragItemsByKeyboard(-delta, 0);
        } else if (EventBus.KEY.RIGHT === key) {
            this.dragItemsByKeyboard(delta, 0);
        } else if (EventBus.KEY.UP === key) {
            this.dragItemsByKeyboard(0, -delta);
        } else if (EventBus.KEY.DOWN === key) {
            this.dragItemsByKeyboard(0, delta);
        }
    }

    dragItemsByKeyboard(dx, dy) {
        // don't need to drag by keyboard if already started dragging by mouse
        if (!this.startedDragging) {
            this.fillConnectorsBuildCache(this.schemeContainer.selectedItems);
            _.forEach(this.schemeContainer.selectedItems, item => {
                if (!item.locked) {
                    item.area.x += dx;
                    item.area.y += dy;
                }
            });
            this.rebuildConnectorsInCache();
            EventBus.$emit(EventBus.REDRAW);
        }
    }

    initDragging(x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.startedDragging = true;
    }

    initDraggingForItem(item, x, y) {
        item.meta.itemOriginalArea = {
            x: item.area.x,
            y: item.area.y,
            w: item.area.w,
            h: item.area.h
        };
    }

    initDraggingForReroute(sourceItem, connector, rerouteId, x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.startedDragging = true;
        this.selectedConnector = connector;
        this.selectedRerouteId = rerouteId;
        this.sourceItem = sourceItem;
    }

    mouseDown(x, y, mx, my, object, event) {
        if (object.dragger) {
            this.dragger = object.dragger;
            this.initDraggingForItem(object.dragger.item, x, y);
            this.initDragging(x, y);
            return;
        } else if (object.connector) {
            if (event.metaKey || event.ctrlKey) {
                if (object.rerouteId >= 0) {
                    object.connector.reroutes.splice(object.rerouteId, 1);
                    this.schemeContainer.buildConnector(object.sourceItem, object.connector);
                    EventBus.emitRedrawConnector(object.connector.id);
                } else {
                    var rerouteId = this.schemeContainer.addReroute(this.snapX(x), this.snapY(y), object.sourceItem, object.connector);
                    this.initDraggingForReroute(object.sourceItem, object.connector, rerouteId, x, y);
                    EventBus.emitRedrawConnector(object.connector.id);
                }
            } else {
                this.schemeContainer.selectConnector(object.sourceItem, object.connectorIndex, false);
                EventBus.emitRedrawConnector(object.connector.id);
                this.schemeContainer.deselectAllItems();
                EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED, object.connector);
                EventBus.$emit(EventBus.CONNECTOR_SELECTED, object.connector);
                EventBus.$emit(EventBus.REDRAW);
                if (object.rerouteId >= 0) {
                    this.initDraggingForReroute(object.sourceItem, object.connector, object.rerouteId, x, y);
                }
            }
        } else if (object.item) {
            if (!object.item.meta.selected) {
                this.schemeContainer.selectItem(object.item, event.metaKey || event.ctrlKey);
                this.schemeContainer.deselectAllConnectors();
                EventBus.$emit(EventBus.ACTIVE_ITEM_SELECTED, object.item);
                EventBus.$emit(EventBus.ALL_CONNECTORS_DESELECTED, object.item);
            }

            this.initDraggingForItem(object.item, x, y);
            _.forEach(this.schemeContainer.selectedItems, item => {
                this.initDraggingForItem(item, x, y);
            });

            this.initDragging(x, y);
        } else {
            //enabling multi select box only if user clicked in the empty area.
            if (event.srcElement.id === 'svg_plot') {
                this.initMulitSelectBox(x, y);
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
                } else if (this.schemeContainer.selectedItems.length > 0) {
                    var dx = x - this.originalPoint.x,
                        dy = y - this.originalPoint.y;

                    if (this.connectorsBuildChache === null) {
                        this.fillConnectorsBuildCache(this.schemeContainer.selectedItems);
                    }
                    _.forEach(this.schemeContainer.selectedItems, item => {
                        if (!item.locked) {
                            this.dragItem(item, dx, dy);
                        }
                    });
                    this.rebuildConnectorsInCache();
                    EventBus.$emit(EventBus.REDRAW);
                } else if (this.selectedConnector && this.selectedRerouteId >= 0) {
                    this.dragReroute(x, y);
                }
            }
        } else if (this.multiSelectBox) {
            if (x > this.originalPoint.x) {
                this.multiSelectBox.x = this.originalPoint.x;
                this.multiSelectBox.w = x - this.originalPoint.x;
            } else {
                this.multiSelectBox.x = x;
                this.multiSelectBox.w = this.originalPoint.x - x;
            }
            if (y > this.originalPoint.y) {
                this.multiSelectBox.y = this.originalPoint.y;
                this.multiSelectBox.h = y - this.originalPoint.y;
            } else {
                this.multiSelectBox.y = y;
                this.multiSelectBox.h = this.originalPoint.y - y;
            }
            EventBus.$emit(EventBus.MULTI_SELECT_BOX_APPEARED, this.multiSelectBox);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.multiSelectBox) {
            if (!event.metaKey && !event.ctrlKey) {
                this.schemeContainer.deselectAllItems();
                EventBus.$emit(EventBus.ALL_ITEMS_DESELECTED);
                EventBus.$emit(EventBus.REDRAW);
            }
            this.schemeContainer.selectByBoundaryBox(this.multiSelectBox);
            EventBus.$emit(EventBus.MULTI_SELECT_BOX_DISAPPEARED);
        }
        if (event.doubleClick) {
            if (object.connector) {
                if (object.rerouteId >= 0) {
                    object.connector.reroutes.splice(object.rerouteId, 1);
                    this.schemeContainer.buildConnector(object.sourceItem, object.connector);
                    EventBus.emitRedrawConnector(object.connector.id);
                } else {
                    this.schemeContainer.addReroute(this.snapX(x), this.snapY(y), object.sourceItem, object.connector);
                    EventBus.emitRedrawConnector(object.connector.id);
                }
           }
        }
        this.reset();
    }

    initMulitSelectBox(x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.multiSelectBox = {x, y, w: 0, h: 0};
    }

    dragItem(item, dx, dy) {
        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            item.area.x = item.meta.itemOriginalArea.x + dx;
            item.area.y = item.meta.itemOriginalArea.y + dy;

            //snapping to grid
            item.area.x = this.snapX(item.area.x);
            item.area.y = this.snapY(item.area.y);
        }
    }

    dragReroute(x, y) {
        var dx = x - this.originalPoint.x;
        var dy = y - this.originalPoint.y;

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            this.selectedConnector.reroutes[this.selectedRerouteId].x = this.snapX(x);
            this.selectedConnector.reroutes[this.selectedRerouteId].y = this.snapY(y);
            if (this.sourceItem) {
                this.schemeContainer.buildConnector(this.sourceItem, this.selectedConnector);
                EventBus.emitRedrawConnector(this.selectedConnector.id);
            }
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
                ny = this.snapY(item.meta.itemOriginalArea.y + dy);
                nh = item.meta.itemOriginalArea.y + item.meta.itemOriginalArea.h - ny;
            } else if (edge === 'bottom') {
                var dy = y - dragger.y;
                change += Math.abs(dy);
                nh = this.snapY(item.meta.itemOriginalArea.y + item.meta.itemOriginalArea.h + dy) - item.meta.itemOriginalArea.y;
            } else if (edge === 'left') {
                var dx = x - dragger.x;
                change += Math.abs(dx);
                nx = this.snapX(item.meta.itemOriginalArea.x + dx);
                nw = item.meta.itemOriginalArea.x + item.meta.itemOriginalArea.w - nx;
            } else if (edge === 'right') {
                var dx = x - dragger.x;
                change += Math.abs(dx);
                nw = this.snapX(item.meta.itemOriginalArea.x + item.meta.itemOriginalArea.w + dx) - item.meta.itemOriginalArea.x;
            }
        });
        if (change > 0) {
            if (this.connectorsBuildChache === null) {
                this.fillConnectorsBuildCache([item]);
            }
            this.rebuildConnectorsInCache();
        }
        if (nw > 0 && nh > 0) {
            item.area.x = nx;
            item.area.y = ny;
            item.area.w = nw;
            item.area.h = nh;
        }
    }

    rebuildConnectorsInCache() {
        _.forEach(this.connectorsBuildChache, (v) => {
            this.schemeContainer.buildConnector(v.item, v.connector);
            EventBus.emitRedrawConnector(v.connector.id);
        });
    }

    fillConnectorsBuildCache(items) {
        this.connectorsBuildChache = {};
        _.forEach(items, item => {
            _.forEach(item.connectors, (connector, connectorIndex) => {
                this.connectorsBuildChache[item.id + "|" + connectorIndex] = {item, connector};
            });
            _.forEach(this.schemeContainer.getConnectingSourceItemIds(item.id), sourceId => {
                var sourceItem = this.schemeContainer.findItemById(sourceId);
                if (sourceItem) {
                    _.forEach(sourceItem.connectors, (connector, connectorIndex) => {
                        this.schemeContainer.buildConnector(sourceItem, connector);
                        var key = `${sourceItem.id}|${connectorIndex}`;
                        if (!this.connectorsBuildChache.hasOwnProperty(key)) {
                            this.connectorsBuildChache[key] = {item: sourceItem, connector};
                        }
                    });
                }
            });
        })
    }

}
