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
        this.rotatingItem = false;
    }

    reset() {
        this.startedDragging = false;
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
        this.dragger = null;
        this.rotatingItem = false;
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

    initItemRotation(item, x, y) {
        item.meta.originalRotation = item.area.r;
        this.sourceItem = item;
        this.rotatingItem = true;
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
        } else if (object.rotationDragger) {
            this.initItemRotation(object.rotationDragger.item, x, y);
            this.initDragging(x, y);
        } else if (object.connector) {
            if (event.metaKey || event.ctrlKey) {
                if (object.rerouteId >= 0) {
                    object.connector.reroutes.splice(object.rerouteId, 1);
                    this.schemeContainer.buildConnector(object.sourceItem, object.connector);
                    EventBus.emitConnectorChanged(object.connector.id);
                } else {
                    var rerouteId = this.schemeContainer.addReroute(this.snapX(x), this.snapY(y), object.sourceItem, object.connector);
                    this.initDraggingForReroute(object.sourceItem, object.connector, rerouteId, x, y);
                    EventBus.emitConnectorChanged(object.connector.id);
                }
            } else {
                this.schemeContainer.selectConnector(object.sourceItem, object.connectorIndex, false);
                this.deselectAllItems();
                EventBus.emitConnectorSelected(object.connector.id);
                if (object.rerouteId >= 0) {
                    this.initDraggingForReroute(object.sourceItem, object.connector, object.rerouteId, x, y);
                }
            }
        } else if (object.item) {
            const inclusive = event.metaKey || event.ctrlKey;
            if (!inclusive) {
                _.forEach(this.schemeContainer.selectedItems, item => {
                    if (item.id !== object.item.id) {
                        EventBus.emitItemDeselected(item.id);
                    }
                });
            }
            this.schemeContainer.selectItem(object.item, inclusive);
            EventBus.emitItemSelected(object.item.id);

            this.schemeContainer.forEachSelectedConnector(connector => EventBus.emitConnectorDeselected(connector.id));
            this.schemeContainer.deselectAllConnectors();

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
                } else if (this.rotatingItem) {
                    this.rotateItem(x, y, event);
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
                this.deselectAllItems();
            }
            this.schemeContainer.selectByBoundaryBox(this.multiSelectBox);
            this.emitEventsForAllSelectedItems();
            EventBus.$emit(EventBus.MULTI_SELECT_BOX_DISAPPEARED);
        }
        if (event.doubleClick) {
            if (object.connector) {
                if (object.rerouteId >= 0) {
                    object.connector.reroutes.splice(object.rerouteId, 1);
                    this.schemeContainer.buildConnector(object.sourceItem, object.connector);
                    EventBus.emitConnectorChanged(object.connector.id);
                } else {
                    this.schemeContainer.addReroute(this.snapX(x), this.snapY(y), object.sourceItem, object.connector);
                    EventBus.emitConnectorChanged(object.connector.id);
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
                EventBus.emitConnectorChanged(this.selectedConnector.id);
            }
        }
    }

    rotateItem(x, y, event) {
        if (this.sourceItem) {
            const cx = this.sourceItem.area.x + this.sourceItem.area.w/2;
            const cy = this.sourceItem.area.y + this.sourceItem.area.h/2;

            const v1x = this.originalPoint.x - cx;
            const v1y = this.originalPoint.y - cy;
            const v2x = x - cx;
            const v2y = y - cy;

            let angle = this.sourceItem.meta.originalRotation + (Math.atan2(v2y, v2x) - Math.atan2(v1y, v1x)) * 180.0/Math.PI
            if (event.metaKey || event.ctrlKey) {
                angle = Math.round(angle / 5) * 5;
            }
            this.sourceItem.area.r = angle;
            if (this.connectorsBuildChache === null) {
                this.fillConnectorsBuildCache([this.sourceItem]);
            }
            this.rebuildConnectorsInCache();
            EventBus.emitItemChanged(this.sourceItem.id);
        }
    }

    dragByDragger(item, dragger, x, y) {
        var nx = item.area.x;
        var ny = item.area.y;
        var nw = item.area.w;
        var nh = item.area.h;

        let change = 0;

        _.forEach(dragger.edges, edge => {
            //TODO calculate dragging of rotated item edges properly
            /*
            the problem here is that by dragging any of the draggers - the center of the item moves.
            This causes it "squezes" the item from both sides instead of just dragging the single edge.
            */
            const tx = x - this.originalPoint.x;
            const ty = y - this.originalPoint.y;
            const cs = Math.cos(-item.area.r * Math.PI / 180); 
            const sn = Math.sin(-item.area.r * Math.PI / 180);
            const dx = tx * cs - ty * sn;
            const dy = tx * sn + ty * cs;
            change += Math.abs(dx) + Math.abs(dy);
            if (edge === 'top') {
                ny = this.snapY(item.meta.itemOriginalArea.y + dy);
                nh = item.meta.itemOriginalArea.y + item.meta.itemOriginalArea.h - ny;
            } else if (edge === 'bottom') {
                nh = this.snapY(item.meta.itemOriginalArea.y + item.meta.itemOriginalArea.h + dy) - item.meta.itemOriginalArea.y;
            } else if (edge === 'left') {
                nx = this.snapX(item.meta.itemOriginalArea.x + dx);
                nw = item.meta.itemOriginalArea.x + item.meta.itemOriginalArea.w - nx;
            } else if (edge === 'right') {
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
            EventBus.emitConnectorChanged(v.connector.id);
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

    deselectAllItems() {
        _.forEach(this.schemeContainer.selectedItems, item => EventBus.emitItemDeselected(item.id));
        this.schemeContainer.deselectAllItems();
    }

    emitEventsForAllSelectedItems() {
        _.forEach(this.schemeContainer.selectedItems, item => EventBus.emitItemSelected(item.id));
    }

}
