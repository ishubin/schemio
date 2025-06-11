/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import utils from '../../../utils';
import myMath from '../../../myMath.js';
import Shape from '../items/shapes/Shape.js';
import {realignConnectorNormal} from '../items/shapes/Connector.vue';
import {enrichItemWithDefaults} from '../../../scheme/ItemFixer';
import { Keys } from '../../../events.js';
import StoreUtils from '../../../store/StoreUtils.js';
import {forEach} from '../../../collections';
import { localPointOnItem, worldPointOnItem } from '../../../scheme/ItemMath.js';
import shortid from 'shortid';
import EditorEventBus from '../EditorEventBus.js';

const IS_NOT_SOFT = false;

const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};


function isEventRightClick(event) {
    return event.button === 2;
}

export default class StateConnecting extends State {
    constructor(editorId, store, listener) {
        super(editorId, store, 'connecting', listener);
        this.item = null;
        this.addedToScheme = false;
        this.originalClickPoint = {x: 0, y: 0, mx: 0, my: 0};
        this.candidatePointSubmited = false;

        // used to identify whether mouse was moved between mouseDown and mouseUp events
        this.wasMouseMoved = false;

        // used in order to drag screen when user holds spacebar
        this.shouldDragScreen = false;
        this.startedDraggingScreen = false;
        this.originalScreenOffset = {x: 0, y: 0};

        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    }

    reset() {
        this.listener.onItemsHighlighted({itemIds: [], showPins: false})
        this.item = null;
        this.addedToScheme = false;
        this.softReset();
    }

    softReset() {

        this.shouldDragScreen = false;
        this.wasMouseMoved = false;
        this.startedDraggingScreen = false;
        this.candidatePointSubmited = false;
    }

    cancel() {
        StoreUtils.setCurrentConnector(this.store, null);
        this.listener.onItemsHighlighted({itemIds: [], showPins: false})
        if (this.item) {
            // deleting last point
            this.item.shapeProps.points.splice(this.item.shapeProps.points.length - 1 , 1);

            if (this.item.shapeProps.points.length > 0) {
                this.submitItem();
            }
        }
        super.cancel();
    }

    setItem(item) {
        item.area.x = 0;
        item.area.y = 0;
        this.item = item;
        StoreUtils.setCurrentConnector(this.store, item);
        if (this.schemeContainer.findItemById(item.id)) {
            this.addedToScheme = true;
            this.creatingNewPoints = false;
        }
    }

    initConnectingFromSourceItem(sourceItem, localPoint) {
        if (!localPoint) {
            localPoint = {
                x: this.round(sourceItem.area.w / 2),
                y: this.round(sourceItem.area.h / 2)
            };
        }

        const worldPoint = this.schemeContainer.worldPointOnItem(localPoint.x, localPoint.y, sourceItem);

        let connectorItem = {
            shape: 'connector',
            name: `${sourceItem.name} -> `,
            area: {x: 0, y: 0, w: 200, h: 200, r: 0},
            shapeProps: {
                destinationCap: 'triangle'
            }
        };
        enrichItemWithDefaults(connectorItem);
        connectorItem = this.schemeContainer.addItem(connectorItem);
        connectorItem.shapeProps.sourceItem = `#${sourceItem.id}`;

        const closestPoint = this.findAttachmentPointToItem(sourceItem, localPoint);
        if (closestPoint.pinId) {
            connectorItem.shapeProps.sourcePin = closestPoint.pinId;
            connectorItem.shapeProps.sourceItemPosition = 0;
        } else {
            connectorItem.shapeProps.sourcePin = '';
            connectorItem.shapeProps.sourceItemPosition = closestPoint.distanceOnPath;
        }

        connectorItem.shapeProps.points = [{
            t: 'L', x: this.round(closestPoint.x), y: this.round(closestPoint.y)
        }, {
            t: 'L', x: this.round(worldPoint.x), y: this.round(worldPoint.y)
        }];

        if (typeof closestPoint.nx != 'undefined') {
            connectorItem.shapeProps.points[0].nx = myMath.roundPrecise(closestPoint.nx, 4);
            connectorItem.shapeProps.points[0].ny = myMath.roundPrecise(closestPoint.ny, 4);
        }

        this.item = connectorItem;

        StoreUtils.setCurrentConnector(this.store, this.item);
        this.addedToScheme = true;
        this.creatingNewPoints = true;

        return this.item;
    }

    /**
     *
     * @param {Item} item
     * @param {Point} localPoint
     * @returns {ItemClosestPoint} - closest point in world transform
     */
    findAttachmentPointToItem(item, localPoint) {
        const worldPoint = this.schemeContainer.worldPointOnItem(localPoint.x, localPoint.y, item);
        const closestPoint = this.schemeContainer.closestPointToItemOutline(item, worldPoint, {
            withNormal: true
        });

        const closestPin = this.findClosestItemPin(item, worldPoint);

        if (closestPin) {
            if (closestPoint) {
                // should check which of these two is closer, but there is a catch
                // Users would prefer for it to be pin always, but in some shapes there is only a single pin that is the center of the item
                // In such cases it is best to stick to the point on path
                // This is quite hacky but I don't see another better way for now
                // The idea is to check the distance of pin to the center of the item. If it is very low, we will choose point on path instead

                const centerPoint = this.schemeContainer.worldPointOnItem(item.area.w/2, item.area.h/2, item);
                const distance = (closestPin.x - centerPoint.x)*(closestPin.x - centerPoint.x) + (closestPin.y - centerPoint.y)*(closestPin.y - centerPoint.y);
                if (distance < 0.5) {
                    return closestPoint;
                }
            }
            closestPin.x = this.round(closestPin.x);
            closestPin.y = this.round(closestPin.y);
            return closestPin;
        }

        if (closestPoint) {
            closestPoint.x = this.round(closestPoint.x);
            closestPoint.y = this.round(closestPoint.y);
            return closestPoint;
        }

        return {
            x: this.round(item.area.w / 2),
            y: this.round(item.area.h / 2)
        };
    }

    findClosestItemPin(item, worldPoint) {
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        const pins = shape.getPins(item);

        let foundPin = null;
        let minDistance = 0;

        forEach(pins, (pin, pinId) => {
            const worldPinPoint = this.schemeContainer.worldPointOnItem(pin.x, pin.y, item);
            const distance = (worldPinPoint.x - worldPoint.x)*(worldPinPoint.x - worldPoint.x) + (worldPinPoint.y - worldPoint.y)*(worldPinPoint.y - worldPoint.y);
            if (!foundPin || minDistance > distance) {
                minDistance = distance;
                foundPin = {
                    x: worldPinPoint.x,
                    y: worldPinPoint.y,
                    distanceOnPath: 0,
                    pinId: pinId
                };

                if (pin.hasOwnProperty('nx')) {
                    foundPin.nx = pin.nx;
                    foundPin.ny = pin.ny;
                }
            }
        });

        return foundPin;
    }

    initFirstClick(x, y) {
        this.item.shapeProps.points = [];

        this.schemeContainer.addItem(this.item);

        // snapping can only be performed once the item is added to the scheme
        // that is why we have to re-adjust curve points afterwards so that they are snapped
        const snappedCurvePoint = this.snapCurvePoint(-1, x, y);

        this.item.shapeProps.points.push({
            id: shortid.generate(),
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        });
        this.item.shapeProps.points.push({
            id: shortid.generate(),
            x: snappedCurvePoint.x,
            y: snappedCurvePoint.y,
            t: 'L'
        });

        // in case user tried to attach source to another item
        this.handleEdgePointDrag(this.item.shapeProps.points[0], true);
        this.addedToScheme = true;
    }

    initScreenDrag(mx, my) {
        this.startedDraggingScreen = true;
        this.originalClickPoint.x = mx;
        this.originalClickPoint.y = my;
        this.originalClickPoint.mx = mx;
        this.originalClickPoint.my = my;
        this.originalScreenOffset = {x: this.schemeContainer.screenTransform.x, y: this.schemeContainer.screenTransform.y};
    }

    keyPressed(key, keyOptions) {
        if (key === Keys.SPACE && !this.startedDraggingScreen) {
            this.shouldDragScreen = true;
        }
    }

    keyUp(key, keyOptions) {
        if (key === Keys.SPACE) {
            this.shouldDragScreen = false;
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        this.originalClickPoint.x = x;
        this.originalClickPoint.y = y;
        this.originalClickPoint.mx = mx;
        this.originalClickPoint.my = my;

        if (this.shouldDragScreen) {
            this.initScreenDrag(mx, my);
            return;
        }

        if (!this.addedToScheme) {
            this.initFirstClick(x, y);
        } else {
            if (isEventRightClick(event)) {
                this.proposeNewDestinationItemForConnector(this.item, mx, my);
            } else {
                const snappedCurvePoint = this.snapCurvePoint(this.item.shapeProps.points.length - 1, x, y);

                // checking if the curve was attached to another item
                if (this.item.shapeProps.destinationItem) {
                    if (this.item.shapeProps.sourceItem) {
                        this.item.name = this.createNameFromAttachedItems(this.item.shapeProps.sourceItem, this.item.shapeProps.destinationItem);
                    }
                    this.submitItem();
                    this.cancel();
                    return;
                }

                const point = this.item.shapeProps.points[this.item.shapeProps.points.length - 1];


                point.x = snappedCurvePoint.x;
                point.y = snappedCurvePoint.y;
                this.candidatePointSubmited = true;
            }
        }
    }

    createNameFromAttachedItems(sourceSelector, destinationSelector) {
        const sourceItem = this.schemeContainer.findFirstElementBySelector(sourceSelector);
        const destinationItem = this.schemeContainer.findFirstElementBySelector(destinationSelector);
        if (sourceItem && destinationItem) {
            return `${sourceItem.name} -> ${destinationItem.name}`;
        }

        return 'Curve';
    }

    mouseMove(x, y, mx, my, object, event) {
        // not handling any mouse movement if connector proposed destination panel is shown
        if (this.store.state.connectorProposedDestination.shown) {
            return;
        }

        this.wasMouseMoved = true;

        if (this.shouldDragScreen && this.startedDraggingScreen) {
            this.dragScreen(mx, my);
            return;
        }

        StoreUtils.clearItemSnappers(this.store);

        if (!this.addedToScheme) {
            // Will try to search for source attachment
            this.handleConnectorSourceMouseMove(x, y);

        } else {
            const pointIndex = this.item.shapeProps.points.length - 1;
            const point = this.item.shapeProps.points[pointIndex];

            // drag last point
            const snappedLocalCurvePoint = this.snapCurvePoint(pointIndex, x, y);

            point.x = this.round(snappedLocalCurvePoint.x);
            point.y = this.round(snappedLocalCurvePoint.y);

            // what if we want to attach this point to another item
            this.handleEdgePointDrag(point, false);

            this.listener.onItemChanged(this.item.id);
        }
    }

    mouseUp(x, y, mx, my, object, event) {
        this.listener.onItemsHighlighted({itemIds: [], showPins: false})

        if (this.addedToScheme) {
            if (this.candidatePointSubmited) {
                this.candidatePointSubmited = false;

                const snappedLocalCurvePoint = this.snapCurvePoint(-1, x, y);

                this.item.shapeProps.points.push({
                    id: shortid.generate(),
                    x: this.round(snappedLocalCurvePoint.x),
                    y: this.round(snappedLocalCurvePoint.y),
                    t: 'L'
                });
                this.listener.onItemChanged(this.item.id);
            }
        }

        StoreUtils.clearItemSnappers(this.store);
        this.softReset();
    }

    snapCurvePoint(pointId, localX, localY) {
        const worldCurvePoint = this.schemeContainer.worldPointOnItem(localX, localY, this.item);

        let bestSnappedHorizontalProximity = 100000;
        let bestSnappedVerticalProximity = 100000;
        //TODO configure snapping precision
        const maxSnapProximity = 6;

        let horizontalSnapper = null;
        let verticalSnapper = null;

        // first it should try to snap to its own curve points and only then to any other snappers of other items
        if (this.isSnappingToItemsEnabled()) {
            forEach(this.item.shapeProps.points, (point, idx) => {
                if (pointId === idx) {
                    return;
                }

                const wp = this.schemeContainer.worldPointOnItem(point.x, point.y, this.item);

                let d = Math.abs(wp.y - worldCurvePoint.y);
                if (d < maxSnapProximity && d < bestSnappedHorizontalProximity) {
                    bestSnappedHorizontalProximity = d;
                    horizontalSnapper = {
                        localValue: point.y,
                        value: wp.y,
                        item: this.item,
                        snapperType: 'horizontal'
                    };
                }

                d = Math.abs(wp.x - worldCurvePoint.x);
                if (d < maxSnapProximity && d < bestSnappedVerticalProximity) {
                    bestSnappedVerticalProximity = d;
                    verticalSnapper = {
                        localValue: point.x,
                        value: wp.x,
                        item: this.item,
                        snapperType: 'vertical'
                    };
                }
            });
        }

        const newOffset = this.snapPoints({
            vertical: [worldCurvePoint],
            horizontal: [worldCurvePoint]
        }, new Set(), 0, 0);

        let snappedWorldX = worldCurvePoint.x + newOffset.dx;
        let snappedWorldY = worldCurvePoint.y + newOffset.dy;

        const localPoint = this.schemeContainer.localPointOnItem(snappedWorldX, snappedWorldY, this.item);
        if (horizontalSnapper) {
            localPoint.y = horizontalSnapper.localValue;
            StoreUtils.setItemSnapper(this.store, horizontalSnapper);
        }
        if (verticalSnapper) {
            localPoint.x = verticalSnapper.localValue;
            StoreUtils.setItemSnapper(this.store, verticalSnapper);
        }
        return {
            x: this.round(localPoint.x),
            y: this.round(localPoint.y),
        };
    }

    handleConnectorSourceMouseMove(x, y) {
        const closestPointToItem = this.findClosestAttachmentPoint(x, y);

        if (closestPointToItem) {
            this.listener.onItemsHighlighted({itemIds: [closestPointToItem.itemId], showPins: true});
            this.item.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
            if (closestPointToItem.pinId) {
                this.item.shapeProps.sourcePin = closestPointToItem.pinId;
                this.item.shapeProps.sourceItemPosition = 0;
            } else {
                this.item.shapeProps.sourcePin = '';
                this.item.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
            }
        } else {
            this.listener.onItemsHighlighted({itemIds: [], showPins: false});
            this.item.shapeProps.sourceItem = null;
            this.item.shapeProps.sourcePin = '';
            this.item.shapeProps.sourceItemPosition = 0;
        }
    }

    findClosestAttachmentPoint(x, y) {
        let distanceThreshold = 10;
        if (this.schemeContainer.screenTransform.scale > 0) {
            distanceThreshold = distanceThreshold / this.schemeContainer.screenTransform.scale;
        }

        const includeOnlyVisibleItems = true;
        return this.schemeContainer.findClosestPointToItems(x, y, distanceThreshold, this.item.id, includeOnlyVisibleItems);
    }

    /**
     * Handles dragging of edge point and checks whether it should stick to other item
     * This is the most time consuming function as it needs to look through all items in schemes
     * @param {Point} curvePoint
     * @param {Boolean} isSource
     */
    handleEdgePointDrag(curvePoint, isSource) {
        const worldCurvePoint = this.schemeContainer.worldPointOnItem(curvePoint.x, curvePoint.y, this.item);

        const closestPointToItem = this.findClosestAttachmentPoint(worldCurvePoint.x, worldCurvePoint.y);

        if (closestPointToItem) {
            const localCurvePoint = this.schemeContainer.localPointOnItem(closestPointToItem.x, closestPointToItem.y, this.item);
            curvePoint.x = localCurvePoint.x;
            curvePoint.y = localCurvePoint.y;

            const item = this.schemeContainer.findItemById(closestPointToItem.itemId);
            if (closestPointToItem.hasOwnProperty('nx')) {
                curvePoint.nx = closestPointToItem.nx;
                curvePoint.ny = closestPointToItem.ny;
            } else {
                const normal = this.schemeContainer.calculateNormalOnPointInItemOutline(item, closestPointToItem.distanceOnPath);
                curvePoint.nx = normal.x;
                curvePoint.ny = normal.y;
            }

            this.listener.onItemsHighlighted({itemIds: [closestPointToItem.itemId], showPins: true});
            if (isSource) {
                this.item.shapeProps.sourceItem = '#' + closestPointToItem.itemId;
                if (closestPointToItem.pinId) {
                    this.item.shapeProps.sourcePin = closestPointToItem.pinId;
                    this.item.shapeProps.sourceItemPosition = 0;
                } else {
                    this.item.shapeProps.sourcePin = '';
                    this.item.shapeProps.sourceItemPosition = closestPointToItem.distanceOnPath;
                }
            } else {
                this.item.shapeProps.destinationItem = '#' + closestPointToItem.itemId;
                if (closestPointToItem.pinId) {
                    this.item.shapeProps.destinationPin = closestPointToItem.pinId;
                    this.item.shapeProps.destinationItemPosition = 0;
                } else {
                    this.item.shapeProps.destinationPin = '';
                    this.item.shapeProps.destinationItemPosition = closestPointToItem.distanceOnPath;
                }
            }
        } else {
            if (curvePoint.hasOwnProperty('nx')) {
                delete curvePoint.nx;
                delete curvePoint.ny;
            }
            // nothing to attach to so reseting highlights in case it was set previously
            this.listener.onItemsHighlighted({itemIds: [], showPins: false});
            if (isSource) {
                this.item.shapeProps.sourceItem = null;
                this.item.shapeProps.sourcePin = '';
                this.item.shapeProps.sourceItemPosition = 0;
            } else {
                this.item.shapeProps.destinationItem = null;
                this.item.shapeProps.destinationPin = '';
                this.item.shapeProps.destinationItemPosition = 0;
            }
        }

        if (!this.item.shapeProps.sourcePin) {
            realignConnectorNormal(this.item.shapeProps.points[0], this.item.shapeProps.points[1]);
        }
        if (!this.item.shapeProps.destionationPin) {
            realignConnectorNormal(this.item.shapeProps.points[this.item.shapeProps.points.length - 1], this.item.shapeProps.points[this.item.shapeProps.points.length - 2]);
        }
    }

    submitItem() {
        if (this.item.shapeProps.points.length < 2) {
            this.schemeContainer.deleteItem(this.item);
            this.schemeContainer.reindexItems();
            this.reset();
            return;
        }

        this.schemeContainer.readjustItem(this.item.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT, this.getUpdatePrecision());

        if (this.store.state.autoRemount) {
            const parentItem = this.schemeContainer.findItemSuitableForParent(this.item, 0.98);
            if (parentItem) {
                this.schemeContainer.remountItemInsideOtherItemAtTheBottom(this.item.id, parentItem.id);
            }
        }
        this.schemeContainer.reindexItems();
        this.listener.onItemChanged(this.item.id, 'area');
        this.listener.onSchemeChangeCommitted();
        this.schemeContainer.selectItem(this.item);


        const connectorItem = this.item;
        const sourceItem = this.schemeContainer.findFirstElementBySelector(this.item.shapeProps.sourceItem);
        const destinationItem = this.schemeContainer.findFirstElementBySelector(this.item.shapeProps.destinationItem);
        const schemeContainer = this.schemeContainer;
        const promiseResolve = ({template, rootItem}) => {
            if (!template || !rootItem) {
                return;
            }
            template.onConnectorAttached(rootItem, connectorItem);
            EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, connectorItem.id);
            schemeContainer.updateEditBox();
        };
        if (sourceItem) {
            this.schemeContainer.findAncestorWithTemplate(sourceItem).then(promiseResolve);
        }
        if (destinationItem) {
            this.schemeContainer.findAncestorWithTemplate(destinationItem).then(promiseResolve);
        }
        this.reset();
    }

    dragScreen(x, y) {
        this.schemeContainer.screenTransform.x = Math.floor(this.originalScreenOffset.x + x - this.originalClickPoint.x);
        this.schemeContainer.screenTransform.y = Math.floor(this.originalScreenOffset.y + y - this.originalClickPoint.y);
    }

    proposeNewDestinationItemForConnector(item, mx, my) {
        let primaryShapeId = null;
        const sourceItem = this.schemeContainer.findFirstElementBySelector(this.item.shapeProps.sourceItem);
        if (sourceItem) {
            primaryShapeId = sourceItem.shape;
        }
        StoreUtils.proposeConnectorDestinationItems(this.store, item.id, mx, my, primaryShapeId);
    }

    /**
     * Invoked when user selects an item from ConnectorDestinationProposal panel
     * @param {Item} dstItem
     */
    submitConnectorDestinationItem(item) {
        item = utils.clone(item);

        if (item.area.w < 1 || item.area.h < 1) {
            if (item.shape === 'uml_actor') {
                // uml_actor item looks ugly when stretched wide
                item.area.w = 50;
                item.area.h = 100;
            } else {
                item.area.w = 100;
                item.area.h = 50;
            }
        }

        const lp0 = this.item.shapeProps.points[this.item.shapeProps.points.length - 2];
        const lp1 = this.item.shapeProps.points[this.item.shapeProps.points.length - 1];
        const p0 = worldPointOnItem(lp0.x, lp0.y, this.item);
        const p1 = worldPointOnItem(lp1.x, lp1.y, this.item);

        let N = myMath.normalizedVector(p1.x - p0.x, p1.y - p0.y);
        if (!N) {
            N = {x: 1, y: 0};
        }

        // this is a bit non-intuitive but this formula works in such a way
        // that based on the normal we identify which side (width or height) of the item
        // should take greater presense in calculation of the "r"
        // so for normal [1, 0] it will only take width, for [0, 1] it will take height
        // This gives us a better and consistent experience in the end
        const r = (Math.abs(N.x) * item.area.w + Math.abs(N.y) * item.area.h) / 2;
        let proposedPoint = {x: p1.x, y: p0.y};
        if (N) {
            proposedPoint.x = p1.x + N.x * r;
            proposedPoint.y = p1.y + N.y * r;
        }

        item.area.x = proposedPoint.x - item.area.w / 2;
        item.area.y = proposedPoint.y - item.area.h / 2;


        const destinationItem = this.schemeContainer.addItem(item);

        const closestPoint = this.schemeContainer.closestPointToItemOutline(destinationItem, p1, {});
        const localPoint = localPointOnItem(closestPoint.x, closestPoint.y, this.item);

        // modifying last point
        lp1.x = localPoint.x;
        lp1.y = localPoint.y;

        // this is a hack but have to do it as when user cancels state edit curve
        // it actually deletes the last point since it is considered as not submited
        const latestPoint = utils.clone(this.item.shapeProps.points[this.item.shapeProps.points.length - 1]);
        latestPoint.id = shortid.generate();
        this.item.shapeProps.points.push(latestPoint);

        this.item.shapeProps.destinationItem = `#${destinationItem.id}`;
        if (closestPoint.pinId) {
            this.item.shapeProps.destinationPin = closestPoint.pinId;
            this.item.shapeProps.destinationItemPosition = 0;
        } else {
            this.item.shapeProps.destinationPin = '';
            this.item.shapeProps.destinationItemPosition = closestPoint.distanceOnPath;
        }
        this.item.name += destinationItem.name;

        this.moveConnectorToFront();
        this.cancel();
    }

    moveConnectorToFront() {
        let parentArray = this.schemeContainer.scheme.items;
        if (this.item.meta.parentId) {
            const parentItem = this.schemeContainer.findItemById(this.item.meta.parentId);
            if (!parentItem) {
                return;
            }
            parentArray = parentItem.childItems;
        }

        for (let i = parentArray.length - 1; i >= 0; i--) {
            if (parentArray[i].id === this.item.id) {
                if (i < parentArray.length - 1) {
                    const [item] = parentArray.splice(i, 1);
                    parentArray.push(item);
                    break;
                }
                break;
            }
        }
    }
}