/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import Shape from '../items/shapes/Shape';
import EventBus from '../EventBus.js';
import _ from 'lodash';
import utils from '../../../utils';


function isEventRightClick(event) {
    return event.button === 2;
}


function visitItems(items, callback) {
    _.forEach(items, item => {
        callback(item);
        if (item.childItems) {
            visitItems(item.childItems, callback);
        }
    })
}

/**
 * Checkes whether keys like shift, meta (mac), ctrl were pressed during the mouse event
 * @param {MouseEvent} event 
 */
function isMultiSelectKey(event) {
    return event.metaKey || event.ctrlKey || event.shiftKey;

}

export default class StateDragItem extends State {
    /**
     * @param {EventBus} eventBus 
     */
    constructor(eventBus) {
        super(eventBus);
        this.name = 'drag-item';
        this.originalPoint = {x: 0, y: 0};
        this.startedDragging = true;
        this.controlPoint = null; // stores coords for item control point
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
        this.sourceItem = null; // source item for a connector
        this.multiSelectBox = null;

        ///used in order to optimize rebuilding of all connectors
        this.connectorsBuildChache = null;
        this.rotatingItem = false;

        // used to check whether the mouse moved between mouseDown and mouseUp events
        this.wasMouseMoved = false;

        // used in order to drag screen when user holds spacebar
        this.shouldDragScreen = false;
        this.originalOffset = {x: 0, y: 0};
        this.reindexNeeded = false;
    }

    reset() {
        this.updateCursor('default');
        this.reindexNeeded = false;
        this.startedDragging = false;
        this.selectedConnector = null;
        this.selectedRerouteId = -1;
        this.dragger = null;
        this.rotatingItem = false;
        this.sourceItem = null;
        this.controlPoint = null;
        this.multiSelectBox = null;
        this.connectorsBuildChache = null;
        this.wasMouseMoved = false;
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
        } else if (key === EventBus.KEY.SPACE && !this.startedDragging) {
            this.shouldDragScreen = true;
            this.updateCursor('grab');
        }
    }

    keyUp(key, keyOptions) {
        if (key === EventBus.KEY.SPACE) {
            this.shouldDragScreen = false;
            this.updateCursor('default');
        }
    }

    initDragging(x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.startedDragging = true;
        this.wasMouseMoved = false;
        this.reindexNeeded = false;
    }

    initDraggingForItem(item, x, y) {
        item.meta.itemOriginalArea = {
            x: item.area.x,
            y: item.area.y,
            w: item.area.w,
            h: item.area.h,
            r: item.area.r
        };
        this.wasMouseMoved = false;

        if (item.shape === 'curve') {
            // storing original points so that they can be readjusted in case the item is resized
            item.meta.originalCurvePoints = utils.clone(item.shapeProps.points);
        }
    }

    initItemRotation(item, x, y) {
        item.meta.itemOriginalArea = {
            x: item.area.x,
            y: item.area.y,
            w: item.area.w,
            h: item.area.h,
            r: item.area.r
        };
        this.sourceItem = item;
        this.rotatingItem = true;
        this.wasMouseMoved = false;
    }

    initDraggingForReroute(sourceItem, connector, rerouteId, x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.startedDragging = true;
        this.selectedConnector = connector;
        this.selectedRerouteId = rerouteId;
        this.sourceItem = sourceItem;
    }

    initScreenDrag(mx, my) {
        this.startedDragging = true;
        this.originalPoint.x = mx;
        this.originalPoint.y = my;
        this.originalOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
    }

    mouseDown(x, y, mx, my, object, event) {
        this.wasMouseMoved = false;

        if (this.shouldDragScreen) {
            this.updateCursor('grabbing');
            this.initScreenDrag(mx, my);
        } else if (object.dragger) {
            this.dragger = object.dragger;
            this.initDraggingForItem(object.dragger.item, x, y);
            this.initDragging(x, y);
            return;
        } else if (object.rotationDragger) {
            this.initItemRotation(object.rotationDragger.item, x, y);
            this.initDragging(x, y);
        } else if (object.connector) {
            this.handleConnectorMouseDown(x, y, mx, my, object, event);
        } else if (object.item) {
            if (isEventRightClick(event)) {
                this.handleItemRightMouseDown(x, y, mx, my, object.item, event);
            } else {
                this.handleItemLeftMouseDown(x, y, mx, my, object.item, event);
            }
        } else if (object.connectorStarter) {
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, object.connectorStarter.item);
        } else if (object.controlPoint) {
            this.initDraggingForControlPoint(object.controlPoint, x, y);
        }else {
            //enabling multi select box only if user clicked in the empty area.
            if (event.srcElement.id === 'svg_plot') {
                this.initMulitSelectBox(x, y);
            }
        }
    }

    initDraggingForControlPoint(controlPointDef, x, y) {
        const controlPoint = controlPointDef.item.meta.controlPoints[controlPointDef.pointId];
        if (controlPoint) {
            this.reset();
            this.originalPoint.x = x;
            this.originalPoint.y = y;
            this.startedDragging = true;
            this.sourceItem = controlPointDef.item;
            this.controlPoint = {
                id: controlPointDef.pointId,
                originalX: controlPoint.x,
                originalY: controlPoint.y,
            }
        }
    }

    /**
     * This function is tricky as there are a lot of various conditions for the mouse click event.
     * 1. When clicked non-selected element without meta/ctrl key 
     *      =>  it should only select that element and deselect any other
     * 
     * 2. When clicked already selected element 
     *      =>  it should not do anything until the mouse is either released or moved.
     *          Other selected elements should stay selected
     * 
     * 3. When clicked non-selected element with meta/ctrl key
     *      =>  it should just select that element only without reseting selection for other elements
     * 
     * 4. When clicked selected element with meta/ctrl key
     *      =>  it should just deselect this element without reseting selection for other elements
     * 
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {number} mx 
     * @param {number} my 
     * @param {SchemeItem} item 
     * @param {MouseEvent} event 
     */
    handleItemLeftMouseDown(x, y, mx, my, item, event) {
        // if the item is already selected it should not do anything. This way we can let user drag multiple items
        if (!this.schemeContainer.isItemSelected(item)) {
            this.schemeContainer.selectItem(item, isMultiSelectKey(event));
        }
        this.schemeContainer.deselectAllConnectors();
        
        this.initDraggingForItem(item, x, y);
        _.forEach(this.schemeContainer.selectedItems, item => {
            this.initDraggingForItem(item, x, y);
        });

        this.initDragging(x, y);
    }

    handleItemRightMouseDown(x, y, mx, my, item, event) {
        this.eventBus.emitRightClickedItem(item, mx, my);

        if (!this.schemeContainer.isItemSelected(item)) {
            this.schemeContainer.selectItem(item, isMultiSelectKey(event));
        }
        this.schemeContainer.deselectAllConnectors();
    }

    handleConnectorMouseDown(x, y, mx, my, object, event) {
        const sourceItem = this.schemeContainer.findItemById(object.connector.meta.sourceItemId);

        if (isMultiSelectKey(event)) {
            if (object.rerouteId >= 0) {
                object.connector.reroutes.splice(object.rerouteId, 1);

                this.schemeContainer.buildConnector(sourceItem, object.connector);
                this.eventBus.emitConnectorChanged(object.connector.id);
            } else {
                const rerouteId = this.schemeContainer.addReroute(this.snapX(x), this.snapY(y), object.connector);
                this.initDraggingForReroute(sourceItem, object.connector, rerouteId, x, y);
                this.eventBus.emitConnectorChanged(object.connector.id);
            }
        } else {
            this.schemeContainer.selectConnector(object.connector, false);
            this.deselectAllItems();
            this.eventBus.emitConnectorSelected(object.connector.id, object.connector);
            if (object.rerouteId >= 0) {
                this.initDraggingForReroute(sourceItem, object.connector, object.rerouteId, x, y);
            }
        }
    }

    mouseMove(x, y, mx, my, object, event) {
        if (this.startedDragging) {
            this.wasMouseMoved = true;

            if (this.shouldDragScreen) {
                this.dragScreen(mx, my);
            } else if (event.buttons === 0) {
                // this means that no buttons are actually pressed, so probably user accidentally moved mouse out of view and released it, or simply clicked right button
                this.reset();
            } else {
                if (this.dragger && !this.dragger.item.locked) {
                    this.dragByDragger(this.dragger.item, this.dragger.edges, x, y);
                } else if (this.rotatingItem) {
                    this.rotateItem(x, y, this.sourceItem, event);
                } else if (this.controlPoint) {
                    this.handleControlPointDrag(x, y);
                } else if (this.schemeContainer.selectedItems.length > 0) {
                    var dx = x - this.originalPoint.x,
                        dy = y - this.originalPoint.y;

                    if (this.connectorsBuildChache === null) {
                        this.fillConnectorsBuildCache(this.schemeContainer.selectedItems);
                    }

                    this.dragItems(this.schemeContainer.selectedItems, dx, dy);

                    this.rebuildConnectorsInCache();
                } else if (this.selectedConnector && this.selectedRerouteId >= 0) {
                    this.dragReroute(x, y);
                }
            }
        } else if (this.multiSelectBox) {
            this.wasMouseMoved = true;
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
            this.eventBus.$emit(EventBus.MULTI_SELECT_BOX_APPEARED, this.multiSelectBox);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        if (this.multiSelectBox) {
            this.schemeContainer.deselectAllConnectors();

            if (!isMultiSelectKey(event)) {
                this.deselectAllItems();
            }
            this.schemeContainer.selectByBoundaryBox(this.multiSelectBox);
            this.emitEventsForAllSelectedItems();
            this.eventBus.$emit(EventBus.MULTI_SELECT_BOX_DISAPPEARED);

        } else if (object.item && !this.wasMouseMoved) {
            // when clicking right button - it should not deselected
            // but when clicking left button and without movin a mouse - it should deselect other items
            if (!isEventRightClick(event) && ! isMultiSelectKey(event)) {
                // forcing deselect of other items, since the mouse wasn't moved and ctrl/meta keys were not pressed
                this.schemeContainer.selectItem(object.item, false);
            }
        } 
        if (this.startedDragging && this.wasMouseMoved) {
            this.eventBus.emitSchemeChangeCommited();
        }
        if (this.reindexNeeded) {
            this.schemeContainer.reindexItems();
        }
        this.reset();
    }

    mouseDoubleClick(x, y, mx, my, object, event) {
        if (object.item) {
            if (object.item.shape === 'curve') {
                this.eventBus.emitCurveEdited(object.item);
            } else {
                this.eventBus.emitItemInEditorTextEditTriggered(object.item, x, y);
            }
        } else if (object.connector) {
            if (object.rerouteId >= 0) {
                object.connector.reroutes.splice(object.rerouteId, 1);
                this.schemeContainer.buildConnector(this.schemeContainer.findItemById(object.connector.meta.sourceItemId), object.connector);
                this.eventBus.emitConnectorChanged(object.connector.id);
                this.eventBus.emitSchemeChangeCommited();
            } else {
                this.schemeContainer.addReroute(this.snapX(x), this.snapY(y), object.connector);
                this.eventBus.emitConnectorChanged(object.connector.id);
                this.eventBus.emitSchemeChangeCommited();
            }
        }
    }

    handleControlPointDrag(x, y) {
        const localPoint = this.schemeContainer.localPointOnItem(this.originalPoint.x, this.originalPoint.y, this.sourceItem);
        const localPoint2 = this.schemeContainer.localPointOnItem(x, y, this.sourceItem);
        const dx = localPoint2.x - localPoint.x,
              dy = localPoint2.y - localPoint.y;

        const controlPoint = this.sourceItem.meta.controlPoints[this.controlPoint.id];
        if (controlPoint) {
            const shape = Shape.find(this.sourceItem.shape);
            shape.controlPoints.handleDrag(this.sourceItem, this.controlPoint.id, this.controlPoint.originalX, this.controlPoint.originalY, dx, dy);
            const newPoint = shape.controlPoints.make(this.sourceItem, this.controlPoint.id);
            this.sourceItem.meta.controlPoints[this.controlPoint.id].x = newPoint.x;
            this.sourceItem.meta.controlPoints[this.controlPoint.id].y = newPoint.y;
            this.eventBus.emitItemChanged(this.sourceItem.id);
        }
    }

    initMulitSelectBox(x, y) {
        this.originalPoint.x = x;
        this.originalPoint.y = y;
        this.multiSelectBox = {x, y, w: 0, h: 0};
    }

    dragItemsByKeyboard(dx, dy) {
        // don't need to drag by keyboard if already started dragging by mouse
        if (!this.startedDragging) {
            this.fillConnectorsBuildCache(this.schemeContainer.selectedItems);
            // storing ids of dragged items in a map
            // this way we will be able to figure out whether any items ancestors was dragged already
            // so that we can skip dragging of item
            const itemDraggedIds = {};
            _.forEach(this.schemeContainer.selectedItems, item => {
                itemDraggedIds[item.id] = 1;
                if (!item.locked) {
                    // checking whether any of ancestors were dragged already
                    if (!(item.meta && item.meta.ancestorIds && _.find(item.meta.ancestorIds, id => itemDraggedIds[id]))) {
                        if (item.meta.parentId) {
                            const parentItem = this.schemeContainer.findItemById(item.meta.parentId);
                            if (parentItem) {
                                const localPoint            = this.schemeContainer.localPointOnItem(item.area.x + dx, item.area.y + dy, parentItem);
                                const localOriginalPoint    = this.schemeContainer.localPointOnItem(item.area.x, item.area.y, parentItem);
                                item.area.x = item.area.x + localPoint.x - localOriginalPoint.x;
                                item.area.y = item.area.y + localPoint.y - localOriginalPoint.y;
                            }
                        } else {
                            item.area.x += dx;
                            item.area.y += dy;
                        }

                        this.schemeContainer.updateChildTransforms(item);
                        this.reindexNeeded = true;
                    }
                }
            });
            this.rebuildConnectorsInCache();
        }
    }
    
    dragItems(items, dx, dy) {
        // storing ids of dragged items in a map
        // this way we will be able to figure out whether any items ancestors was dragged already
        // so that we can skip dragging of item
        const itemDraggedIds = {};
        
        //storing world points of items so that after all the items are dragged we can re-adjust reroutes for affected connectors (only in case both of their items are dragged equally)
        const itemWorldPoints = {};
        visitItems(items, item => {
            itemWorldPoints[item.id] = this.schemeContainer.worldPointOnItem(0, 0, item);
        });


        let realDx = dx, realDy = dy;
        _.forEach(items, (item, itemIndex) => {
            itemDraggedIds[item.id] = 1;
            if (!item.locked) {
                if (!(item.meta && item.meta.ancestorIds && _.find(item.meta.ancestorIds, id => itemDraggedIds[id]))) {
                    // only snapping x and y in case it is first item in the selection
                    this.dragItem(item, realDx, realDy, itemIndex === 0);
                    if(itemIndex === 0) {
                        //adjusting real dx and dy to what the item was actually moved
                        realDx = item.area.x - item.meta.itemOriginalArea.x;
                        realDy = item.area.y - item.meta.itemOriginalArea.y;
                    }
                }
            }
        });

        // re-adjusting connector reroutes
        visitItems(items, item => {
            const oldP1 = itemWorldPoints[item.id];
            if (item.connectors && oldP1) {
                const newP1 = this.schemeContainer.worldPointOnItem(0, 0, item);
                _.forEach(item.connectors, connector => {
                    if (connector.itemId) {
                        const oldP2 = itemWorldPoints[connector.itemId];
                        const otherItem = this.schemeContainer.findItemById(connector.itemId);
                        if (oldP2 && otherItem) {
                            const newP2 = this.schemeContainer.worldPointOnItem(0, 0, otherItem);
                            const diff = Math.abs(newP1.x - oldP1.x - (newP2.x - oldP2.x)) + Math.abs(newP1.y - oldP1.y - (newP2.y - oldP2.y));
                            if (diff < 0.00001) {
                                //re-adjusting connector reroutes
                                this.readjustConnectorReroutes(connector, newP1.x - oldP1.x, newP1.y - oldP1.y);
                            }
                        }
                    }
                });
            }
        });
    }

    readjustConnectorReroutes(connector, dx, dy) {
        if (connector.reroutes) {
            _.forEach(connector.reroutes, reroute => {
                reroute.x += dx;
                reroute.y += dy;
            });
        }
    }

    dragItem(item, dx, dy, useSnap) {
        const snapItByX = (x) => {
            if (useSnap) {
                return this.snapX(x);
            }
            return x;
        };
        const snapItByY = (y) => {
            if (useSnap) {
                return this.snapX(y);
            }
            return y;
        };

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            if (item.meta.parentId) {
                const parentItem = this.schemeContainer.findItemById(item.meta.parentId);
                if (parentItem) {
                    const localPoint            = this.schemeContainer.localPointOnItem(snapItByX(item.meta.itemOriginalArea.x + dx), snapItByY(item.meta.itemOriginalArea.y + dy), parentItem);
                    const localOriginalPoint    = this.schemeContainer.localPointOnItem(item.meta.itemOriginalArea.x, item.meta.itemOriginalArea.y, parentItem);
                    item.area.x = item.meta.itemOriginalArea.x + localPoint.x - localOriginalPoint.x;
                    item.area.y = item.meta.itemOriginalArea.y + localPoint.y - localOriginalPoint.y;
                }
            } else {
                item.area.x = snapItByX(item.meta.itemOriginalArea.x + dx);
                item.area.y = snapItByY(item.meta.itemOriginalArea.y + dy);
            }

            this.reindexNeeded = true;
            this.eventBus.emitItemChanged(item.id);

            this.schemeContainer.updateChildTransforms(item);
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
                this.eventBus.emitConnectorChanged(this.selectedConnector.id);
            }
        }
    }

    worldPointOnOriginalItem(x, y, item) {
        if (!item.meta.itemOriginalArea) {
            return {x: 0, y: 0};
        }
        
        let transform = {x: 0, y: 0, r: 0};
        if (item.meta && item.meta.transform) {
            transform = item.meta.transform;
        }

        let tAngle = transform.r * Math.PI/180,
            cosTA = Math.cos(tAngle),
            sinTA = Math.sin(tAngle),
            angle = (transform.r + item.meta.itemOriginalArea.r) * Math.PI/180,
            cosa = Math.cos(angle),
            sina = Math.sin(angle);

        return {
            x: transform.x + item.meta.itemOriginalArea.x * cosTA - item.meta.itemOriginalArea.y * sinTA  + x * cosa - y * sina,
            y: transform.y + item.meta.itemOriginalArea.x * sinTA + item.meta.itemOriginalArea.y * cosTA  + x * sina + y * cosa,
        };
    }

    rotateItem(x, y, item, event) {
        const c = this.worldPointOnOriginalItem(item.area.w/2, item.area.h/2, item);
        const p0 = this.worldPointOnOriginalItem(0, 0, item)

        const v1x = this.originalPoint.x - c.x;
        const v1y = this.originalPoint.y - c.y;
        const v2x = x - c.x;
        const v2y = y - c.y;
        const v1SquareLength = v1x * v1x + v1y * v1y;
        const v2SquareLength = v2x * v2x + v2y * v2y;
        
        if (v1SquareLength < 0.0001 || v2SquareLength < 0.0001) {
            return;
        }

        // cross production of two vectors to figure out the direction (clock-wise or counter clock-wise) of rotation
        const direction = (v1x * v2y - v2x * v1y >= 0) ? 1: -1; 

        let cosa = (v1x * v2x + v1y * v2y)/(Math.sqrt(v1SquareLength) * Math.sqrt(v2SquareLength));
        let angle = direction * Math.acos(cosa);
        let angleConverted = angle * 180 / Math.PI;
        
        if (isNaN(angleConverted)) {
            return;
        }
        if (!isMultiSelectKey(event)) {
            angleConverted = Math.round(angleConverted/ 5) * 5;
            angle = angleConverted * Math.PI / 180;
        }

        item.area.r = item.meta.itemOriginalArea.r + angleConverted;

        const ax = p0.x - c.x;
        const ay = p0.y - c.y;
        cosa = Math.cos(angle);
        const sina = Math.sin(angle);
        const bx = ax * cosa - ay * sina;
        const by = ax * sina + ay * cosa;
        let np0x = c.x + bx;
        let np0y = c.y + by;

        if (item.meta.parentId) {
            const parentItem = this.schemeContainer.findItemById(item.meta.parentId);
            if (parentItem) {
               let np = this.schemeContainer.localPointOnItem(np0x, np0y, parentItem);
               np0x = np.x;
               np0y = np.y;
            }
        }

        item.area.x = np0x;
        item.area.y = np0y;

        if (this.connectorsBuildChache === null) {
            this.fillConnectorsBuildCache([item]);
        }
        this.schemeContainer.updateChildTransforms(item);
        this.rebuildConnectorsInCache();
        this.reindexNeeded = true;
        this.eventBus.emitItemChanged(item.id);
    }

    dragByDragger(item, draggerEdges, x, y) {
        let nx = item.area.x,
            ny = item.area.y,
            nw = item.area.w,
            nh = item.area.h,
            dx = x - this.originalPoint.x,
            dy = y - this.originalPoint.y,
            change = 0;

        let p0 = this.schemeContainer.worldPointOnItem(0, 0, item);
        let p1 = this.schemeContainer.worldPointOnItem(1, 0, item);
        let p2 = this.schemeContainer.worldPointOnItem(0, 1, item);

        let parentItem = null;
        if (item.meta.parentId) {
            parentItem = this.schemeContainer.findItemById(item.meta.parentId);
        }

        if (parentItem) {
            // bringing all points to the transform of the parent item
            p0 = this.schemeContainer.localPointOnItem(p0.x, p0.y, parentItem);
            p1 = this.schemeContainer.localPointOnItem(p1.x, p1.y, parentItem);
            p2 = this.schemeContainer.localPointOnItem(p2.x, p2.y, parentItem);

            let parentP0 = this.schemeContainer.worldPointOnItem(0, 0, parentItem);
            const mouseDeltaInLocalTransform = this.schemeContainer.localPointOnItem(dx + parentP0.x, dy + parentP0.y, parentItem);
            dx = mouseDeltaInLocalTransform.x;
            dy = mouseDeltaInLocalTransform.y;
        }

        const rightVector = {x: p1.x - p0.x, y: p1.y - p0.y};
        const bottomVector = {x: p2.x - p0.x, y: p2.y - p0.y};

        _.forEach(draggerEdges, edge => {
            if (edge === 'top') {
                // This should be a vector multiplication, so in case we introduce scale into transform,
                // we should also divide by the length of bottomVector
                const projection = this.snapX(dx * bottomVector.x + dy * bottomVector.y); 
                ny = item.meta.itemOriginalArea.y + projection * bottomVector.y;
                nh = item.meta.itemOriginalArea.h - projection;
                if (nh < 0) {
                    nh = 0;
                }
                change += Math.abs(projection);
            } else if (edge === 'bottom') {
                // This should be a vector multiplication, so in case we introduce scale into transform,
                // we should also divide by the length of bottomVector
                const projection = this.snapX(dx * bottomVector.x + dy * bottomVector.y); 
                nh = item.meta.itemOriginalArea.h + projection;
                if (nh < 0) {
                    nh = 0;
                }
                change += Math.abs(projection);
            } else if (edge === 'left') {
                // This should be a vector multiplication, so in case we introduce scale into transform,
                // we should also divide by the length of bottomVector
                const projection = this.snapX(dx * rightVector.x + dy * rightVector.y); 
                nx = item.meta.itemOriginalArea.x + projection * rightVector.x;
                nw = item.meta.itemOriginalArea.w - projection;
                if (nw < 0) {
                    nw = 0;
                }
                change += Math.abs(projection);
            } else if (edge === 'right') {
                // This should be a vector multiplication, so in case we introduce scale into transform,
                // we should also divide by the length of bottomVector
                const projection = this.snapX(dx * rightVector.x + dy * rightVector.y); 
                nw = item.meta.itemOriginalArea.w + projection;
                if (nw < 0) {
                    nw = 0;
                }
                change += Math.abs(projection);
            }
        });
        if (change > 0) {
            if (this.connectorsBuildChache === null) {
                // TODO optimize: don't do it here. prepare connectors upfront at the moment when drag is initiated on mouseDown
                this.fillConnectorsBuildCache([item]);
            }
            item.area.x = nx;
            item.area.y = ny;
            item.area.w = nw;
            item.area.h = nh;
            if (item.shape === 'curve') {
                this.readjustCurveItemPoints(item);
            }
            this.schemeContainer.updateChildTransforms(item);
            this.rebuildConnectorsInCache();
            this.reindexNeeded = true;
            this.eventBus.emitItemChanged(item.id);
        }
    }

    readjustCurveItemPoints(item) {
        if (!item.meta.itemOriginalArea || item.meta.itemOriginalArea.w < 0.0001 || item.meta.itemOriginalArea.h < 0.0001) {
            return;
        }
        if (item.area.w < 0.0001 || item.area.h < 0.0001) {
            return;
        }
        if (!item.meta.originalCurvePoints) {
            return;
        }

        _.forEach(item.meta.originalCurvePoints, (point, index) => {
            item.shapeProps.points[index].x = point.x * item.area.w / item.meta.itemOriginalArea.w;
            item.shapeProps.points[index].y = point.y * item.area.h / item.meta.itemOriginalArea.h;
            if (point.t === 'B') {
                item.shapeProps.points[index].x1 = point.x1 * item.area.w / item.meta.itemOriginalArea.w;
                item.shapeProps.points[index].y1 = point.y1 * item.area.h / item.meta.itemOriginalArea.h;
                item.shapeProps.points[index].x2 = point.x2 * item.area.w / item.meta.itemOriginalArea.w;
                item.shapeProps.points[index].y2 = point.y2 * item.area.h / item.meta.itemOriginalArea.h;
            }
        });
    }

    rebuildConnectorsInCache() {
        _.forEach(this.connectorsBuildChache, (v) => {
            this.schemeContainer.buildConnector(v.item, v.connector);
            this.eventBus.emitConnectorChanged(v.connector.id);
        });
    }

    /**
     * This is a recursive function that puts all the connectors related to an item (incomming & outgoing) into a temporary cache.
     * It is used in order to optimize performance for such things like dragging or resizing items.
     * @param {Array} items 
     */
    fillConnectorsBuildCache(items) {
        this.connectorsBuildChache = {};
        this._fillConnectorsBuildCache(items, this.connectorsBuildChache);
    }

    _fillConnectorsBuildCache(items, cache) {
        _.forEach(items, item => {
            if (item.childItems) {
                this._fillConnectorsBuildCache(item.childItems, cache);
            }
            _.forEach(item.connectors, connector => {
                cache[connector.id] = {item, connector};
            });
            _.forEach(this.schemeContainer.getConnectingSourceItemIds(item.id), sourceId => {
                const sourceItem = this.schemeContainer.findItemById(sourceId);
                if (sourceItem) {
                    _.forEach(sourceItem.connectors, connector => {
                        if (!cache.hasOwnProperty(connector.id)) {
                            cache[connector.id] = {item: sourceItem, connector};
                        }
                    });
                }
            });
        })
    }

    deselectAllItems() {
        _.forEach(this.schemeContainer.selectedItems, item => this.eventBus.emitItemDeselected(item.id));
        this.schemeContainer.deselectAllItems();
    }

    emitEventsForAllSelectedItems() {
        _.forEach(this.schemeContainer.selectedItems, item => this.eventBus.emitItemSelected(item.id));
    }

    dragScreen(x, y) {
        this.schemeContainer.screenTransform.x = Math.floor(this.originalOffset.x + x - this.originalPoint.x);
        this.schemeContainer.screenTransform.y = Math.floor(this.originalOffset.y + y - this.originalPoint.y);
    }

}
