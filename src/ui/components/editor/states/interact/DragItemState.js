import { SubState } from '../State.js';
import Events from '../../../../userevents/Events.js';
import {DragType} from '../../../../scheme/Item.js';
import { getBoundingBoxOfItems, getItemOutlineSVGPath, localPointOnItem, worldPointOnItem } from '../../../../scheme/ItemMath.js';
import EditorEventBus from '../../EditorEventBus.js';
import myMath from '../../../../myMath.js';
import { indexOf } from '../../../../collections.js';


function startDraggingLoop(looper, timeMarker) {
    window.requestAnimationFrame(() => {
        const nextTimeMarker = performance.now();
        if (looper.loop(nextTimeMarker - timeMarker)) {
            startDraggingLoop(looper, nextTimeMarker);
        }
    });
}

class DragItemLooper {
    /**
     *
     * @param {SchemeContainer} globalSchemeContainer - a global scheme container, used only for dragging the screen
     *                                                  when user drags object too close to the edge of the screen
     * @param {Point} localClickPoint
     * @param {Array|undefined} shadowTransform
     */
    constructor(globalSchemeContainer, localClickPoint, shadowTransform) {
        this.globalSchemeContainer = globalSchemeContainer;
        this.shouldLoop = true;
        this.pos = {x: 0, y: 0};
        this.localClickPoint = localClickPoint;
        this.shadowTransform = shadowTransform;
    }

    start() {
        startDraggingLoop(this, performance.now());
    }

    /**
     *
     * @param {Item} item
     */
    updateItemPosition(item) {
        this.pos = worldPointOnItem(this.localClickPoint.x, this.localClickPoint.y, item, this.shadowTransform);
    }

    loop(dt) {
        const mx = this.pos.x * this.globalSchemeContainer.screenTransform.scale + this.globalSchemeContainer.screenTransform.x;
        const my = this.pos.y * this.globalSchemeContainer.screenTransform.scale + this.globalSchemeContainer.screenTransform.y;

        const padding = 20;
        if (mx < padding) {
            this.globalSchemeContainer.screenTransform.x += dt/2;
        }
        if (my < padding) {
            this.globalSchemeContainer.screenTransform.y += dt/ 2;
        }
        if (mx > this.globalSchemeContainer.screenSettings.width - padding) {
            this.globalSchemeContainer.screenTransform.x -= dt/2;
        }
        if (my > this.globalSchemeContainer.screenSettings.height - padding) {
            this.globalSchemeContainer.screenTransform.y -= dt/ 2;
        }
        return this.shouldLoop;
    }

    stop() {
        this.shouldLoop = false;
    }
}

export class DragItemState extends SubState {
    /**
     * @param {State} parentState
     * @param {*} listener
     * @param {Item} item
     * @param {Number} x
     * @param {Number} y
     * @param {UserEventBus}
     * @param {Item|undefined} componentItem
     */
    constructor(parentState, listener, item, x, y, userEventBus, componentItem) {
        super(parentState, 'drag-item');
        this.listener = listener;
        this.userEventBus = userEventBus;
        this.initialClickPoint = {x, y};
        this.originalItemPosition = {x: item.area.x, y: item.area.y};
        this.item = item;
        this.moved = false;
        this.lastDropCandidate = null;
        this.componentItem = componentItem;
        if (componentItem) {
            this.schemeContainer = componentItem.meta.componentSchemeContainer;
        }
        const localPoint = localPointOnItem(x, y, item, this.schemeContainer.shadowTransform);
        this.looper = new DragItemLooper(this.parentState.schemeContainer, localPoint, this.schemeContainer.shadowTransform);
        const worldPivot = worldPointOnItem(item.area.px * item.area.w, item.area.py * item.area.h, item, this.schemeContainer.shadowTransform);
        this.worldPivotCorrection = {
            x: x - worldPivot.x,
            y: y - worldPivot.y,
        };
    }

    cancel() {
        super.cancel();
        this.looper.stop();
    }

    emit(item, eventName, ...args) {
        if (this.componentItem) {
            this.componentItem.meta.componentUserEventBus.emitItemEvent(this.item.id, eventName, ...args);
        } else {
            this.userEventBus.emitItemEvent(item.id, eventName, ...args);
        }
    }

    mouseMove(x, y, mx, my, object, event, componentItem) {
        if (event.buttons === 0) {
            this.mouseUp(x, y, mx, my, object, event, componentItem);
            return;
        }
        if (!this.moved) {
            this.emit(this.item, Events.standardEvents.dragStart.id);
            this.looper.start();
        }
        this.moved = true;

        this.emit(this.item, Events.standardEvents.drag.id);

        const p0 = this.schemeContainer.relativePointForItem(this.initialClickPoint.x, this.initialClickPoint.y, this.item);
        const p1 = this.schemeContainer.relativePointForItem(x, y, this.item);
        const nx = this.originalItemPosition.x + p1.x - p0.x;
        const ny = this.originalItemPosition.y + p1.y - p0.y;

        if (this.item.behavior.dragging === DragType.dragndrop.id) {
            this.handleDroppableMouseMove(nx, ny);
        } else if (this.item.behavior.dragging === DragType.path.id && this.item.behavior.dragPath) {
            this.handlePathMouseMove(x, y);
        } else {
            this.item.area.x = nx;
            this.item.area.y = ny;
        }

        this.schemeContainer.readjustItemAndDescendants(this.item.id, true);

        this.looper.updateItemPosition(this.item);
        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'area');
    }

    handlePathMouseMove(x, y) {
        const pathItems = this.schemeContainer.findElementsBySelector(this.item.behavior.dragPath);
        if (pathItems.length === 0) {
            return;
        }

        let bestDistance = -1;
        let closestPoint = null;
        let closestPathItem = null;
        let closestPath = null;
        let closestPathDistance = -1;

        pathItems.forEach(item => {
            // it should not be possible to drag item along itself
            if (item.id === this.item.id || (item.meta.ancestorIds && indexOf(item.meta.ancestorIds) >= 0)) {
                return;
            }

            // re-calculating item outline for every mouse move event is not optimal
            // but if we calculate it only at the start of the drag
            // and the path is changing (e.g. stretching), it will not be the same path
            // as the one that is rendered on screen
            const svgPath = getItemOutlineSVGPath(item);
            if (!svgPath) {
                return;
            }

            const localPoint = localPointOnItem(x - this.worldPivotCorrection.x, y - this.worldPivotCorrection.y, item, this.schemeContainer.shadowTransform);
            const p = myMath.closestPointOnPath(localPoint.x, localPoint.y, svgPath);

            if (!p) {
                return;
            }

            const wp = worldPointOnItem(p.x, p.y, item, this.schemeContainer.shadowTransform);

            const squareDistance = (wp.x - x) * (wp.x - x) + (wp.y - y) * (wp.y - y);

            if (squareDistance < bestDistance || bestDistance < 0) {
                bestDistance = squareDistance;
                closestPoint = wp;
                closestPathItem = item;
                closestPath = svgPath;
                closestPathDistance = p.distance;
            }
        });

        if (!closestPoint) {
            return;
        }

        let fullTransformMatrix = this.item.meta.transformMatrix;
        if (this.schemeContainer.shadowTransform) {
            fullTransformMatrix = myMath.multiplyMatrices(this.schemeContainer.shadowTransform, fullTransformMatrix);
        }

        const localPoint = myMath.findTranslationMatchingWorldPoint(
            closestPoint.x, closestPoint.y,
            this.item.area.w * this.item.area.px, this.item.area.h * this.item.area.py,
            this.item.area, fullTransformMatrix
        );
        this.item.area.x = localPoint.x;
        this.item.area.y = localPoint.y;


        if (this.item.behavior.dragPathAlign) {
            const nextPoint = closestPath.getPointAtLength(closestPathDistance + 1);
            const prevPoint = closestPath.getPointAtLength(closestPathDistance - 1);
            const worldNextPoint = worldPointOnItem(nextPoint.x, nextPoint.y, closestPathItem, this.schemeContainer.shadowTransform);
            const worldPrevPoint = worldPointOnItem(prevPoint.x, prevPoint.y, closestPathItem, this.schemeContainer.shadowTransform);
            const Vx = worldNextPoint.x - worldPrevPoint.x;
            const Vy = worldNextPoint.y - worldPrevPoint.y;
            const dSquared = Vx * Vx + Vy * Vy;
            if (!myMath.tooSmall(dSquared)) {
                const d = Math.sqrt(dSquared);

                const vx = Vx / d;
                const vy = Vy / d;
                const angle = myMath.fullAngleForNormalizedVector(vx, vy) * 180 / Math.PI;

                this.item.area.r = angle;

                if (isFinite(this.item.behavior.dragPathRotation)) {
                    this.item.area.r += this.item.behavior.dragPathRotation;
                };
            }
        }
    }

    handleDroppableMouseMove(x, y) {
        this.item.area.x = x;
        this.item.area.y = y;
        const dropItem = this.findDesignatedDropItem();

        if (this.lastDropCandidate && (!dropItem || dropItem.id !== this.lastDropCandidate.id)) {
            this.emit(this.item, Events.standardEvents.dragObjectOut.id, this.lastDropCandidate);
            this.emit(this.lastDropCandidate, Events.standardEvents.dragObjectOut.id, this.item);
        }

        if (!dropItem) {
            this.lastDropCandidate = null;
            return;
        }

        const p = this.getDropPosition(dropItem);
        if (p) {
            this.item.area.x = p.x;
            this.item.area.y = p.y;
        }

        if (!this.lastDropCandidate || this.lastDropCandidate.id !== dropItem.id) {
            this.emit(this.item, Events.standardEvents.dragObjectIn.id, dropItem);
            this.emit(dropItem, Events.standardEvents.dragObjectIn.id, this.item);
        }

        this.lastDropCandidate = dropItem;

    }

    getDropPosition(dropItem) {
        // centering item inside drop item
        const wp = worldPointOnItem(dropItem.area.w / 2, dropItem.area.h / 2, dropItem, this.schemeContainer.shadowTransform);
        let fullTransformMatrix = this.item.meta.transformMatrix;
        if (this.schemeContainer.shadowTransform) {
            fullTransformMatrix = myMath.multiplyMatrices(this.schemeContainer.shadowTransform, fullTransformMatrix);
        }
        return myMath.findTranslationMatchingWorldPoint(wp.x, wp.y, this.item.area.w/2, this.item.area.h/2, this.item.area, fullTransformMatrix);

    }

    mouseUp(x, y, mx, my, object, event, componentItem) {
        this.looper.stop();
        this.emit(this.item, Events.standardEvents.dragEnd.id);
        if (!this.moved) {
            this.parentState.handleItemClick(this.item, mx, my);
            this.migrateToPreviousSubState();
            return;
        }
        if (this.item.behavior.dragging === DragType.dragndrop.id) {
            const dropItem = this.lastDropCandidate;
            if (dropItem) {
                const p = this.getDropPosition(dropItem);
                if (p) {
                    this.item.area.x = p.x;
                    this.item.area.y = p.y;
                }
                this.emit(this.item, Events.standardEvents.drop.id, dropItem);
                this.emit(dropItem, Events.standardEvents.receiveDrop.id, this.item);
            } else {
                // resetting back to old position since we can only drop the item
                // to specified designated items
                this.item.area.x = this.originalItemPosition.x;
                this.item.area.y = this.originalItemPosition.y;
            }
        }
        EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'area');
        this.migrateToPreviousSubState();
    }

    findDesignatedDropItem() {
        if (this.item.behavior.dropTo === 'self') {
            return null;
        }
        const designatedDropItems = this.schemeContainer.findElementsBySelector(this.item.behavior.dropTo, null);

        const draggedItemBox = getBoundingBoxOfItems([this.item], this.schemeContainer.shadowTransform);

        let candidateDrop = null;
        const draggedSquare = draggedItemBox.w * draggedItemBox.h;
        designatedDropItems.forEach(item => {
            // it should not be possible to drop item to itself or to its own descendants
            if (item.id === this.item.id || (item.meta.ancestorIds && indexOf(item.meta.ancestorIds) >= 0)) {
                return;
            }
            const box = getBoundingBoxOfItems([item], this.schemeContainer.shadowTransform);
            const overlap = myMath.overlappingArea(draggedItemBox, box);
            if (overlap) {
                const overlapSquare = overlap.w * overlap.h;
                if (overlapSquare > draggedSquare / 2) {
                    candidateDrop = item;
                }
            }
        });
        return candidateDrop;
    }
}