/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import map from 'lodash/map';
import forEach from 'lodash/forEach';
import filter from 'lodash/filter';
import keys from 'lodash/keys';
import indexOf from 'lodash/indexOf';
import findIndex from 'lodash/findIndex';
import find from 'lodash/find';
import { SpatialIndex } from '../SpatialIndex';

import '../typedef';
import collections from '../collections';
import myMath from '../myMath.js';
import utils from '../utils.js';
import shortid from 'shortid';
import Shape from '../components/editor/items/shapes/Shape.js';
import { Item, enrichItemWithDefaults, traverseItems, defaultItemDefinition, createDefaultRectItem } from './Item.js';
import { enrichSchemeWithDefaults } from './Scheme';
import { Debugger, Logger } from '../logger';
import Functions from '../userevents/functions/Functions';
import { compileAnimations, FrameAnimation } from '../animations/FrameAnimation';
import { enrichObjectWithDefaults } from '../../defaultify';
import AnimationFunctions from '../animations/functions/AnimationFunctions';

const log = new Logger('SchemeContainer');

const DIVISION_BY_ZERO_THRESHOLD = 0.0001;

export const DEFAULT_ITEM_MODIFICATION_CONTEXT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};

export const ITEM_MODIFICATION_CONTEXT_RESIZED = {
    moved: false,
    rotated: false,
    resized: true,
    id: ''
};

export const ITEM_MODIFICATION_CONTEXT_ROTATED = {
    moved: false,
    rotated: true,
    resized: false,
    id: ''
};

export function worldPointOnItem(x, y, item) {
    return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}

export function localPointOnItem(x, y, item) {
    return myMath.localPointInArea(x, y, item.area, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null);
}

export function worldAngleOfItem(item) {
    const v = worldVectorOnItem(item.area.w, 0, item);
    return myMath.fullAngleForVector(v.x, v.y) * 180 / Math.PI;
}

export function worldVectorOnItem(x, y, item) {
    const p0 = worldPointOnItem(0, 0, item);
    const p1 = worldPointOnItem(x, y, item);
    return {
        x: p1.x - p0.x,
        y: p1.y - p0.y
    };
}

/**
 * Calculates scaling effect of the item relative to the world
 * This is needed for proper computation of control points for scaled items
 * @param {Item} item 
 * @returns {Point}
 */
export function worldScalingVectorOnItem(item) {
    const topLengthVector = worldVectorOnItem(1, 0, item);
    const leftLengthVector = worldVectorOnItem(0, 1, item);

    return {
        x:  myMath.vectorLength(topLengthVector.x, topLengthVector.y),
        y: myMath.vectorLength(leftLengthVector.x, leftLengthVector.y)
    }
}

export function itemCompleteTransform(item) {
    const parentTransform = (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : myMath.identityMatrix();
    return myMath.standardTransformWithArea(parentTransform, item.area);
}


function visitItems(items, callback, transformMatrix, parentItem, ancestorIds) {
    if (!items) {
        return;
    }
    if (!transformMatrix) {
        transformMatrix = myMath.identityMatrix();
    }
    if (!ancestorIds) {
        ancestorIds = [];
    }

    for (let i = 0; i < items.length; i++) {
        // this has to be done here as the item might not yet be fully enriched
        // also the app optimizes schemes on saving and removes fields with default values
        enrichObjectWithDefaults(items[i].area, defaultItemDefinition.area);

        callback(items[i], transformMatrix, parentItem, ancestorIds);

        const itemTransform = myMath.standardTransformWithArea(transformMatrix, items[i].area);

        if (items[i].childItems) {
            visitItems(items[i].childItems, callback, itemTransform, items[i], ancestorIds.concat([items[i].id]));
        }
    }
}


// used for computing closest points to item paths
// it caches paths of items and resets the cache in case the items were reindexed
class ItemCache {
    /**
     * 
     * @param {Function} cacheMissFallback 
     */
    constructor(cacheMissFallback) {
        this.itemPaths = new Map();
        this.cacheMissFallback = cacheMissFallback;
    }

    /**
     * 
     * @param {Item} item 
     */
    get(item) {
        const entry = this.itemPaths.get(item.id);
        if (entry && entry.revision === item.meta.revision) {
            return entry.value;
        }
        
        const value = this.cacheMissFallback(item);
        this.itemPaths.set(item.id, {
            revision: item.meta.revision,
            value
        });
        return value;
    }
}


/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    /**
     * 
     * @param {Scheme} scheme 
     * @param {EventBus} eventBus 
     */
    constructor(scheme, eventBus) {
        Debugger.register('SchemioContainer', this);

        this.scheme = scheme;
        this.screenTransform = {x: 0, y: 0, scale: 1.0};
        this.screenSettings = {width: 700, height: 400, x1: -1000000, y1: -1000000, x2: 1000000, y2: 1000000};
        this.eventBus = eventBus;
        // contains an array of items that were selected
        this.selectedItems = [];
        // used to quick access to item selection state
        this.selectedItemsMap = {};
        this.activeBoundaryBox = null;
        this.itemMap = {};
        this._itemArray = []; // stores all flatten items (all sub-items are stored as well)
        this.revision = 0;
        this.hudItems = []; //used for storing hud items that are supposed to be rendered in the viewport transform
        this.worldItems = []; // used for storing top-level items with default area
        this.worldItemAreas = new Map(); // used for storing rough item bounding areas in world transform (used for finding suitable parent)
        this.dependencyItemMap = {}; // used for looking up items that should be re-adjusted once the item area is changed (e.g. curve item can be attached to other items)

        this._itemGroupsToIds = {}; // used for quick access to item ids via item groups
        this.itemGroups = []; // stores groups from all items

        this.spatialIndex = new SpatialIndex(); // used for indexing item path points
        this.pinSpatialIndex = new SpatialIndex(); // used for indexing item pins

        // contains mapping of frame player id to its compiled animations
        this.framesAnimations = {};

        this.svgOutlinePathCache = new ItemCache((item) => {
            log.info('Computing shape outline for item', item.id, item.name);
            const shape = Shape.find(item.shape);
            if (shape) {
                const path = shape.computeOutline(item);
                if (path) {
                    const shadowSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    shadowSvgPath.setAttribute('d', path);
                    return shadowSvgPath;
                }
            }
            return null;
        });

        // stores all snapping rules for items (used when user drags an item)
        this.relativeSnappers = {
            horizontal: [],
            vertical: [],
        };

        // Used to drag, resize and rotate multiple items
        // Since both the SvgEditor component and StateDragItem state needs access to it, it is easier to keep it here
        this.multiItemEditBox = null;

        enrichSchemeWithDefaults(this.scheme);
        this.reindexItems();
    }
    
    /**
     * Recalculates transform for each child item of specified item.
     * It is needed when user drags an item that has sub-items.
     * @param {Item} mainItem 
     */
    updateChildTransforms(mainItem) {
        if (mainItem.childItems) {
            let parentTransform = myMath.identityMatrix();

            if (mainItem.meta && mainItem.meta.parentId) {
                const item = this.findItemById(mainItem.meta.parentId);
                if (item && item.meta && item.meta.transformMatrix) {
                    parentTransform = item.meta.transformMatrix;
                }
            }
            
            const recalculatedTransform = myMath.standardTransformWithArea(parentTransform, mainItem.area);

            visitItems(mainItem.childItems, (item, transformMatrix, parentItem, ancestorIds) => {
                if (!item.meta) {
                    item.meta = {};
                }
                item.meta.transformMatrix = transformMatrix;
            }, recalculatedTransform, mainItem.meta.ancestorIds);
        }
    }

    reindexItems() {
        log.info('reindexItems()', this);
        log.time('reindexItems');

        //TODO optimize it to not reconstruct all indices with every change (e.g. reindex only effected items. This obviously needs to be specified from the caller)

        this.itemMap = {};
        this._itemArray = [];
        this.worldItems = [];
        this._itemGroupsToIds = {};
        this.worldItemAreas = new Map();
        this.relativeSnappers.horizontal = [];
        this.relativeSnappers.vertical = [];
        this.spatialIndex = new SpatialIndex();
        this.pinSpatialIndex = new SpatialIndex();
        this.dependencyItemMap = {};

        if (!this.scheme.items) {
            return;
        }
        
        this.reindexSpecifiedItems(this.scheme.items);

        log.timeEnd('reindexItems');
    }

    reindexChildItems(mainItem) {
        const itemTransform = myMath.standardTransformWithArea(mainItem.meta.transformMatrix, mainItem.area);

        if (mainItem.childItems) {
            this.reindexSpecifiedItems(mainItem.childItems, itemTransform, mainItem, mainItem.meta.ancestorIds.concat([mainItem.id]));
        }
    }

    reindexSpecifiedItems(items, transformMatrix, parentItem, ancestorIds) {
        // stores element selectors with their dependants
        // this will be used once it has visited all items
        // so that it can finally start puting ids of existing items into dependencyItemMap
        const dependencyElementSelectorMap = {};
        const registerDependant = (elementSelector, itemId) => {
            let dependants = dependencyElementSelectorMap[elementSelector] || [];
            dependants.push(itemId);
            dependencyElementSelectorMap[elementSelector] = dependants;
        };

        const newRevision = this.revision + 1;

        visitItems(items, (item, transformMatrix, parentItem, ancestorIds) => {
            this._itemArray.push(item);
            enrichItemWithDefaults(item);
            this.enrichItemMeta(item, transformMatrix, parentItem, ancestorIds);
            if (item.groups) {
                this.indexItemGroups(item.id, item.groups);
            }

            if (parentItem && (parentItem.meta.isInHUD || parentItem.shape === 'hud')) {
                item.meta.isInHUD = true;
            }

            const shape = Shape.find(item.shape);
            if (item.text && item.text.length > 0) {
                const textSlots = shape.getTextSlots(item);
                if (textSlots && textSlots.length > 0) {
                    item.textSlots[textSlots[0].name].text = item.text;
                }
                delete item.text;
            }

            // only storing top-level items 
            if (!parentItem) {
                this.worldItems.push(item);
                if (item.shape === 'hud') {
                    this.hudItems.push(item);
                }
            }

            if (item.id) {
                this.itemMap[item.id] = item;
            }

            if (item.shape === 'connector') {
                if (item.shapeProps.sourceItem) {
                    registerDependant(item.shapeProps.sourceItem, item.id);
                }
                if (item.shapeProps.destinationItem) {
                    registerDependant(item.shapeProps.destinationItem, item.id);
                }
            }

            // calculating real visibility based on parents visibility
            let parentVisible = true;
            if (parentItem) {
                parentVisible = parentItem.meta.calculatedVisibility;
            }
            item.meta.calculatedVisibility = parentVisible && item.visible && item.opacity > 0;

            // generating item snappers
            const itemSnappers = this.generateItemSnappers(item);
            if (itemSnappers) {
                forEach(itemSnappers, itemSnapper => {
                    if (itemSnapper.snapperType === 'horizontal') {
                        this.relativeSnappers.horizontal.push(itemSnapper);
                    } else if (itemSnapper.snapperType === 'vertical') {
                        this.relativeSnappers.vertical.push(itemSnapper);
                    }
                });
            }

            this.indexItemPins(item, shape);
            this.indexItemOutlinePoints(item);

            this.worldItemAreas.set(item.id, this.calculateItemWorldArea(item));

            // storing revision in item as it is used  in ItemCache to identify whether item outline was changed or not
            item.meta.revision = newRevision;
        }, transformMatrix, parentItem, ancestorIds);

        this.buildDependencyItemMapFromElementSelectors(this.dependencyItemMap, dependencyElementSelectorMap);
        this.itemGroups = keys(this._itemGroupsToIds);
        this.itemGroups.sort();

        this.revision = newRevision;
    }


    // Iterates recursively through all items and reindexes item groups.
    // These groups are going to be used in the element picker
    reindexGroups() {
        this._itemGroupsToIds = {};
        visitItems(this.scheme.items, (item, transformMatrix, parentItem, ancestorIds) => {
            if (item.groups) {
                this.indexItemGroups(item.id, item.groups);
            }
        });
        this.itemGroups = keys(this._itemGroupsToIds);
        this.itemGroups.sort();
    }

    calculateItemWorldArea(item) {
        const points = [
            {x: 0, y: 0},
            {x: item.area.w, y: 0},
            {x: item.area.w, y: item.area.h},
            {x: 0, y: item.area.h},
        ];
        const worldPoints = map(points, point => this.worldPointOnItem(point.x, point.y, item));

        const area = {
            x: worldPoints[0].x,
            y: worldPoints[0].y,
            w: 0,
            h: 0
        };

        forEach(worldPoints, point => {
            if (area.x > point.x) {
                const oldX = area.x;
                area.x = point.x;
                area.w = oldX + area.w - point.x;
            } else if (point.x > area.x + area.w) {
                area.w = point.x - area.x;
            }

            if (area.y > point.y) {
                const oldY = area.y;
                area.y = point.y;
                area.h = oldY + area.h - point.y;
            } else if (point.y > area.y + area.h) {
                area.h = point.y - area.y;
            }
        });
        
        return area;
    }

    getItemWorldPinPoint(item, pinIndex) {
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        const pins = shape.getPins(item);
        if (pinIndex >= 0 && pinIndex < pins.length) {
            const pinPoint = pins[pinIndex]
            const worldPinPoint = this.worldPointOnItem(pinPoint.x, pinPoint.y, item);

            // we need to recalculate pins as the item might be rotated
            if (pinPoint.nx || pinPoint.ny) {
                const p0 = this.worldPointOnItem(0, 0, item);
                const p1 = this.worldPointOnItem(pinPoint.nx, pinPoint.ny, item);

                worldPinPoint.nx = p1.x - p0.x;
                worldPinPoint.ny = p1.y - p0.y;
            }
            return worldPinPoint;
        }
        return null;
    }

    indexItemPins(item, shape) {
        if (!shape) {
            return;
        }

        const points = shape.getPins(item);
        forEach(points, (p, idx) => {
            const worldPoint = this.worldPointOnItem(p.x, p.y, item);

            // checking if pin point has normals and converting normal to world transform
            if (p.hasOwnProperty('nx')) {
                const w0 = this.worldPointOnItem(0, 0, item);
                const worldNormal = this.worldPointOnItem(p.nx, p.ny, item);
                worldPoint.nx = worldNormal.x - w0.x;
                worldPoint.ny = worldNormal.y - w0.y;
            }

            this.pinSpatialIndex.addPoint(worldPoint.x, worldPoint.y, {
                itemId: item.id,
                pinIndex: idx,
                worldPinPoint: worldPoint
            });
        });
    }

    indexItemOutlinePoints(item) {
        const svgPath = this.getSvgOutlineOfItem(item);
        if (!svgPath) {
            return;
        }
        
        const minDistance = 20;
        const totalLength = svgPath.getTotalLength();

        const totalPoints = Math.max(1, Math.ceil(totalLength/minDistance));

        // Doing a breadth-first indexing by taking midpoint of each segment
        // This is needed for more efficient indexing
        //
        // For instance if you have a straight line and you perform indexing linearly
        // - then the lookup of the last point would take O(n)
        //
        // But if you index it from the mid point and then do the same for each segment
        // - then lookup of any points of the segements would take at most O(log(n))
        //
        // That's why in this code is indexing by dividing each segment in half and indexes
        // mid points first

        let segments = [[0, totalPoints]];

        while(segments.length > 0) {
            const newSegments = [];
            for (let i = 0; i < segments.length; i++) {
                const a = segments[i][0];
                const b = segments[i][1];

                let pathDistance = -1;

                let diff = b - a;
                if (diff >= 2) {
                    const mid = Math.floor((a + b) / 2);
                    pathDistance = mid * minDistance;
                    if (mid > a) {
                        newSegments.push([a, mid - 1]);
                    }
                    if (mid < b) {
                        newSegments.push([mid + 1, b]);
                    }

                } else if (diff >= 1) {
                    pathDistance = b * minDistance;
                    newSegments.push([a, a]);

                } else if (diff >= 0) {
                    pathDistance = a * minDistance;
                }

                if (pathDistance >= 0) {
                    const point = svgPath.getPointAtLength(pathDistance);
                    const worldPoint = this.worldPointOnItem(point.x, point.y, item);
                    this.spatialIndex.addPoint(worldPoint.x, worldPoint.y, {
                        itemId: item.id,
                        pathDistance
                    });
                }
            }

            segments = newSegments;
        }

        // The following code is a lot simpler to understand, but it creates a less efficient index
        // because it indexes points linearly
        /*
        let pathDistance = 0;
        while (pathDistance < totalLength) {
            const point = svgPath.getPointAtLength(pathDistance);
            const worldPoint = this.worldPointOnItem(point.x, point.y, item);
            this.spatialIndex.addPoint(worldPoint.x, worldPoint.y, {
                itemId: item.id,
                pathDistance
            });
            pathDistance += minDistance;
        }
        */
    }

    buildDependencyItemMapFromElementSelectors(dependencyItemMap, dependencyElementSelectorMap) {
        const registerDependants = (itemId, newDependants) => {
            let dependants = dependencyItemMap[itemId] || [];
            dependants = dependants.concat(newDependants);
            dependencyItemMap[itemId] = dependants;
        };

        forEach(dependencyElementSelectorMap, (dependants, elementSelector) => {
            const mainItem = this.findFirstElementBySelector(elementSelector);
            if (mainItem) {
                registerDependants(mainItem.id, dependants);
            }
        });
    }

    /**
     * Used in case an item was moved. This is needed so that we only update transforms (in meta) for objects that are children of this item
     * @param {Item} item - item that was moved or rotated
     */
    reindexItemTransforms(item) {
        if (!item.childItems) {
            return;
        }
        const callback = (childItem, transformMatrix, parentItem, ancestorIds) => {
            childItem.meta.transformMatrix = transformMatrix;
        };
        const parentItem = this.findItemById(item.meta.parentId);
        visitItems(item.childItems, callback, item.meta.transformMatrix, parentItem, item.meta.ancestorIds);
    }

    indexItemGroups(itemId, groups) {
        forEach(groups, group => {
            if (!this._itemGroupsToIds.hasOwnProperty(group)) {
                this._itemGroupsToIds[group] = [];
            }
            this._itemGroupsToIds[group].push(itemId);
        })
    }

    enrichItemMeta(item, transformMatrix, parentItem, ancestorIds) {
        if (!item.meta) {
            item.meta = {
                collapsed: false, // used only for item tree selector
                collapseBitMask: 0 // used in item tree selector and stores information about parent items collapse state
            };
        }

        item.meta.transformMatrix = transformMatrix;
        item.meta.ancestorIds = ancestorIds;
        if (!parentItem) {
            item.meta.collapseBitMask = 0;
        } else {
            item.meta.collapseBitMask = (parentItem.meta.collapseBitMask << ancestorIds.length) | (parentItem.meta.collapsed ? 1: 0)
        }

        if (parentItem) {
            item.meta.parentId = parentItem.id;
        } else {
            item.meta.parentId = null;
        }
    }

    /**
     * This function should only be called after indexing of items is finished
     * because it relies on item having its transformationAreas assigned in its 'meta' object
     * It converts the point inside the item from its local coords to world coords
     * 
     * @param {Number} x local position x
     * @param {Number} y local position y
     * @param {Item} item 
     * @returns {Point}
     */
    worldPointOnItem(x, y, item) {
        return worldPointOnItem(x, y, item);
    }

    /**
     * Converts world point to local item coords
     * @param {Number} x world position x
     * @param {Number} y world position y
     * @param {Item} item 
     * @returns {Point}
     */
    localPointOnItem(x, y, item) {
        return localPointOnItem(x, y, item);
    }

    /**
     * converts worlds coords to local point in the transform of the parent of the item
     * In case item has no parents - it returns the world coords
     * @param {*} x world position x
     * @param {*} y world position y
     * @param {*} item 
     */
    relativePointForItem(x, y, item) {
        if (item.meta.parentId) {
            const parentItem = this.findItemById(item.meta.parentId);
            if (parentItem) {
                return this.localPointOnItem(x, y, parentItem);
            }
        }

        return {x, y};
    }
    
    /**
     * Finds first item that is within specified distance to path
     * @param {Number} x - x axis of world coords
     * @param {Number} y - y axis of world coords
     * @param {Number} d - maximum distance to items path
     * @param {String} excludedId - item that should be excluded
     * @param {Boolean} onlyVisibleItems - specifies whether it should check only items that are visible
     * @returns {ItemClosestPoint}
     */
    findClosestPointToItems(x, y, d, excludedId, onlyVisibleItems) {
        let closestPin = null;
        this.pinSpatialIndex.forEachInRange(x - d, y - d, x + d, y + d, ({itemId, pinIndex, worldPinPoint}, point) => {
            if (itemId !== excludedId) {
                const distance = (x - point.x) * (x - point.x) + (y - point.y) * (y - point.y);
                if (!closestPin || closestPin.distance > distance) {
                    closestPin = { itemId, pinIndex, point: worldPinPoint, distance };
                }
            }
        });

        if (closestPin) {
            const result = {
                x                 : closestPin.point.x,
                y                 : closestPin.point.y,
                distanceOnPath    : -closestPin.pinIndex - 1, // converting it to the negative space, yeah yeah, that's hacky, I know.
                itemId            : closestPin.itemId
            };
            if (closestPin.point.hasOwnProperty('nx')) {
                result.nx = closestPin.point.nx;
                result.ny = closestPin.point.ny;
            }
            return result;
        }

        const items = new Map();

        this.spatialIndex.forEachInRange(x - d, y - d, x + d, y + d, ({itemId, pathDistance}) => {
            if (!items.has(itemId)) {
                items.set(itemId, {min: pathDistance, max: pathDistance});
            } else {
                const pathRange = items.get(itemId);
                if (pathRange.min > pathDistance) {
                    pathRange.min = pathDistance;
                }
                if (pathRange.max < pathDistance) {
                    pathRange.max = pathDistance;
                }
            }
        });

        let globalPoint = {x, y};

        let foundPoint = null;
        let bestSquaredDistance = 100000;

        items.forEach((pathRange, itemId) => {
            const item = this.findItemById(itemId);
            if (item.id === excludedId) {
                return;
            }
            
            if (onlyVisibleItems && !item.meta.calculatedVisibility) {
                return;
            }

            const closestPoint = this.closestPointToItemOutline(item, globalPoint, {
                startDistance: Math.max(0, pathRange.min - d),
                stopDistance: pathRange.max + d
            });

            if (!closestPoint) {
                return;
            }
            const squaredDistance = (closestPoint.x - globalPoint.x) * (closestPoint.x - globalPoint.x) + (closestPoint.y - globalPoint.y) * (closestPoint.y - globalPoint.y);
            if (squaredDistance < d * d) {
                const candidatePoint = {
                    x                 : closestPoint.x,
                    y                 : closestPoint.y,
                    distanceOnPath    : closestPoint.distanceOnPath,
                    itemId            : item.id
                };

                if (!foundPoint || bestSquaredDistance > squaredDistance) {
                    foundPoint = candidatePoint;
                    bestSquaredDistance = squaredDistance;
                }
            }
        });

        return foundPoint;
    }

    getBoundingBoxOfItems(items) {
        if (!items || items.length === 0) {
            return {x: 0, y: 0, w: 0, h: 0};
        }

        let range = null;

        forEach(items, item => {
            const points = [
                this.worldPointOnItem(0, 0, item),
                this.worldPointOnItem(item.area.w, 0, item),
                this.worldPointOnItem(item.area.w, item.area.h, item),
                this.worldPointOnItem(0, item.area.h, item),
            ];

            forEach(points, point => {
                if (!range) {
                    range = {
                        x1: point.x,
                        x2: point.x,
                        y1: point.y,
                        y2: point.y,
                    }
                } else {
                    if (range.x1 > point.x) {
                        range.x1 = point.x;
                    }
                    if (range.x2 < point.x) {
                        range.x2 = point.x;
                    }
                    if (range.y1 > point.y) {
                        range.y1 = point.y;
                    }
                    if (range.y2 < point.y) {
                        range.y2 = point.y;
                    }
                }
            });
        });

        const schemeBoundaryBox = {
            x: range.x1,
            y: range.y1,
            w: range.x2 - range.x1,
            h: range.y2 - range.y1,
        };

        return schemeBoundaryBox;
    }

    /**
     * This function recursively goes into all items descendants and readjusts them
     * It is needed in situation when a parent item is dragged but its children have curve items attached to them.
     * In order to keep curve readjust their shapes we need to do it with this function
     * @param {*} itemId 
     * @param {Boolean} isSoft 
     * @param {ItemModificationContext} context
     * @param {Number} precision - number of digits after point which it should round to
     */
    readjustItemAndDescendants(itemId, isSoft, context, precision) {
        this._readjustItemAndDescendants(itemId, {}, isSoft, context, precision);
    }

    /**
     * 
     * @param {*} itemId 
     * @param {Object} visitedItems 
     * @param {Boolean} isSoft 
     * @param {ItemModificationContext} context
     * @param {Number} precision - number of digits after point which it should round to
     */
    _readjustItemAndDescendants(itemId, visitedItems, isSoft, context, precision) {
        this._readjustItem(itemId, visitedItems, isSoft, context, precision);
        const item = this.findItemById(itemId);
        if (!item) {
            return;
        }
        forEach(item.childItems, childItem => {
            this._readjustItemAndDescendants(childItem.id, visitedItems, isSoft, context, precision);
        });
    }

    /**
     * Should be invoked each time an area or path of item changes
     * @param {String} changedItemId
     * @param {Boolean} isSoft specifies whether this is just a preview readjustment (e.g. curve items need to readjust their area, but only when user stopped dragging)
     * @param {ItemModificationContext} context
     * @param {Number} precision - number of digits after point which it should round to
     */
    readjustItem(changedItemId, isSoft, context, precision) {
        if (isNaN(precision)) {
            precision = 4;
        }
        this._readjustItem(changedItemId, {}, isSoft, context, precision);
    }

    /**
     * 
     * @param {*} changedItem 
     * @param {*} visitedItems - tracks all items that were already visited. Need in order to exclude eternal loops
     * @param {Boolean} isSoft specifies whether this is just a preview readjustment (e.g. curve items need to readjust their area, but only when user stopped dragging)
     * @param {ItemModificationContext} context
     * @param {Number} precision - number of digits after point which it should round to
     */
    _readjustItem(changedItemId, visitedItems, isSoft, context, precision) {
        if (isNaN(precision)) {
            precision = 4;
        }
        if (visitedItems[changedItemId]) {
            return;
        }

        visitedItems[changedItemId] = true;

        const item = this.findItemById(changedItemId);
        if (!item) {
            return;
        }

        const shape = Shape.find(item.shape);
        if (shape && shape.readjustItem) {
            shape.readjustItem(item, this, isSoft, context, precision);
            if (this.eventBus) this.eventBus.emitItemChanged(item.id);
        }

        // searching for items that depend on changed item
        if (this.dependencyItemMap[changedItemId]) {
            forEach(this.dependencyItemMap[changedItemId], dependantItemId => {
                this._readjustItem(dependantItemId, visitedItems, isSoft, context, precision);
            });
        }

        // scanning through children of the item and readjusting them as well
        forEach(item.childItems, childItem => {
            this._readjustItem(childItem.id, visitedItems, isSoft, context, precision);
        });
    }

    remountItemToRoot(itemId) {
        const position = this.scheme.items.length;
        this.remountItemInsideOtherItem(itemId, null, position);
    }

    remountItemInsideOtherItemAtTheBottom(itemId, otherItemId) {
        if (!otherItemId) {
            return;
        }
        const otherItem = this.findItemById(otherItemId);
        if (!otherItem) {
            return;
        }

        let position = 0;
        if (otherItem.childItems) {
            position = otherItem.childItems.length;
        }
        this.remountItemInsideOtherItem(itemId, otherItemId, position);
    }

    remountItemInsideOtherItem(itemId, otherItemId, position) {
        if (!position) {
            position = 0;
        }
        const item = this.findItemById(itemId);
        if (!item) {
            return;
        }

        let otherItem = null;
        if (otherItemId) {
            otherItem = this.findItemById(otherItemId);
            if (!otherItem) {
                return;
            }
        }

        //checking if item is moved into its own child items. It should be protected from such move, otherwise it is going to be an eternal loop
        if (otherItem && indexOf(otherItem.meta.ancestorIds, item.id) >= 0) {
            return;
        }

        // Recalculating item area so that its world coords would match under new transform
        const worldPoint = this.worldPointOnItem(0, 0, item);
        let newLocalPoint = {
            x: worldPoint.x, y: worldPoint.y
        }

        let previousParentWorldAngle = 0;
        let otherItemWorldAngle = 0;

        if (otherItem) {
            newLocalPoint = this.localPointOnItem(worldPoint.x, worldPoint.y, otherItem);
            otherItemWorldAngle = worldAngleOfItem(otherItem);
        }

        let parentItem = null;
        let parentId = null;
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            parentItem = this.findItemById(item.meta.parentId);
            if (!parentItem) {
                return;
            }
            parentId = parentItem.id;
            itemsArray = parentItem.childItems;
            previousParentWorldAngle = worldAngleOfItem(parentItem);
        }

        const index = findIndex(itemsArray, it => it.id === itemId);
        if (index < 0) {
            return;
        }

        // removing item from its original position in array
        itemsArray.splice(index, 1);

        let newItemsArray = this.scheme.items;
        let newParentId = null;
        if (otherItem) {
            if (!otherItem.childItems) {
                otherItem.childItems = [];
            }
            newItemsArray = otherItem.childItems;
            newParentId = otherItem.id;
        }

        let positionCorrection = 0;
        if (parentId === newParentId && index < position) {
            // if item was located in the same parent and was above destination we need to correct its new position
            positionCorrection = -1;
        }

        newItemsArray.splice(position + positionCorrection, 0, item);

        item.area.x = newLocalPoint.x;
        item.area.y = newLocalPoint.y;
        item.area.r += previousParentWorldAngle - otherItemWorldAngle;
 
        if (this.eventBus) this.eventBus.emitSchemeChangeCommited();

        this.reindexItems();
        this.updateMultiItemEditBox();
    }

    remountItemAfterOtherItem(itemId, otherItemId) {
        this.remountItemWithOffsetToOtherItem(itemId, otherItemId, 1);
    }

    remountItemBeforeOtherItem(itemId, otherItemId) {
        this.remountItemWithOffsetToOtherItem(itemId, otherItemId, 0);
    }

    remountItemWithOffsetToOtherItem(itemId, otherItemId, indexOffset) {
        const otherItem = this.findItemById(otherItemId);
        if (!otherItem) {
            return;
        }
        let itemsArray = this.scheme.items;
        let parent = null;
        if (otherItem.meta.parentId) {
            parent = this.findItemById(otherItem.meta.parentId);
            if (!parent) {
                return;
            }
            if (!parent.childItems) {
                parent.childItems = [];
            }

            itemsArray = parent.childItems;
        }

        const index = findIndex(itemsArray, it => it.id === otherItemId);
        if (index < 0) {
            return;
        }

        let parentId = null;
        if (parent) {
            parentId = parent.id;
        }
        this.remountItemInsideOtherItem(itemId, parentId, index + indexOffset);
    }

    /**
     * 
     * @param {Item} item 
     * @returns {SVGPathElement}
     */
    getSvgOutlineOfItem(item) {
        return this.svgOutlinePathCache.get(item);
    }

    /**
     * 
     * @param {*} item 
     * @param {Point} globalPoint 
     * @param {Object} settings specifies whether it should calculate the normal vector on the point on specified path
     * @param {ItemClosestPoint}
     */
    closestPointToItemOutline(item, globalPoint, {withNormal, startDistance, stopDistance}) {
        // in order to include all parent items transform into closest point finding we need to first bring the global point into local transform
        const localPoint = this.localPointOnItem(globalPoint.x, globalPoint.y, item);

        const shadowSvgPath = this.svgOutlinePathCache.get(item);
        if (!shadowSvgPath) {
            return null;
        }

        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, shadowSvgPath, {
            startDistance,
            stopDistance
        });
        const worldPoint = this.worldPointOnItem(closestPoint.x, closestPoint.y, item);
        worldPoint.distanceOnPath = closestPoint.distance;

        if (withNormal) {
            const normal = this.calculateNormalOnPointInItemOutline(item, closestPoint.distance, shadowSvgPath);
            worldPoint.bx = normal.x;
            worldPoint.by = normal.y;
        }
        return worldPoint;
    }

    /**
     * calculates normal of specified point on svg path
     * @param {*} item 
     * @param {Number} distanceOnPath 
     * @param {SVGPathElement} shadowSvgPath if not specified it will try to obtain svg path from items cache
     * @returns {Point}
     */
    calculateNormalOnPointInItemOutline(item, distanceOnPath, shadowSvgPath) {
        if (!shadowSvgPath) {
            shadowSvgPath = this.svgOutlinePathCache.get(item);
            if (!shadowSvgPath) {
                return {x: 1, y: 0};
            }
        }

        let leftPosition = distanceOnPath - 2;
        if (leftPosition < 0) {
            leftPosition = shadowSvgPath.getTotalLength() - leftPosition;
        }
        const pointA = shadowSvgPath.getPointAtLength(leftPosition);
        const pointB = shadowSvgPath.getPointAtLength((distanceOnPath + 2) % shadowSvgPath.getTotalLength());

        let vx = pointB.x - pointA.x;
        let vy = pointB.y - pointA.y; 

        // rotating vector by 90 degrees, could have done it earlier but doing it explicitly, to keep algorithm clear
        let t = vx;
        vx = vy;
        vy = -t;

        // ^ calculated perpendicular vector in local to attachmentItem transform, now it should be converted to the world transform
        const topLeftCorner = this.worldPointOnItem(0, 0, item);
        const vectorOffset = this.worldPointOnItem(vx, vy, item);
        let Vx = vectorOffset.x - topLeftCorner.x;
        let Vy = vectorOffset.y - topLeftCorner.y;

        // normalizing vector
        const d = Math.sqrt(Vx*Vx + Vy*Vy);
        if (d > 0.0001) {
            Vx = Vx / d;
            Vy = Vy / d;
        }
        return {
            x: myMath.roundPrecise(Vx, 4), // we don't need a high precision for normals
            y: myMath.roundPrecise(Vy, 4)
        };
    }

    getSelectedItems() {
        return this.selectedItems;
    }


    deleteItem(item) {
        this._deleteItem(item);
        this.reindexItems();
    }

    _deleteItem(item) {
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            const parentItem = this.findItemById(item.meta.parentId);
            if (!parentItem || !parentItem.childItems) {
                return;
            }
            itemsArray = parentItem.childItems;
        }

        const index = findIndex(itemsArray, it => it.id === item.id);
        if (index < 0) {
            return;
        }

        itemsArray.splice(index, 1);
    }

    deleteSelectedItems() {
        if (this.selectedItems && this.selectedItems.length > 0) {
            forEach(this.selectedItems, item => {
                delete this.selectedItemsMap[item.id];
                this._deleteItem(item);
            });

            this.selectedItems = [];
            this.multiItemEditBox = null;
            this.reindexItems();
            // This event is needed to inform some components that they need to update their state because selection has dissapeared
            if (this.eventBus) this.eventBus.emitAnyItemDeselected();
        }
    }

    addItem(item) {
        enrichItemWithDefaults(item);
        if (!item.hasOwnProperty('meta')) {
            item.meta = {}
        }
        if (!item.id) {
            item.id = shortid.generate();
        }
        this.scheme.items.push(item);
        this.reindexSpecifiedItems([item]);
        return item;
    }

    getItems() {
        return this._itemArray;
    }

    getTopLevelItems() {
        return this.worldItems;
    }

    filterNonHUDItems(items) {
        return filter(items, item => item.shape !== 'hud' && !item.meta.isInHUD);
    }

    isItemInHUD(item) {
        return item.shape === 'hud' || item.meta.isInHUD;
    }

    setActiveBoundaryBox(area) {
        this.activeBoundaryBox = area;
    }

    isItemSelected(item) {
        return this.selectedItemsMap[item.id] || false;
    }


    /**
     * Selects a specified item and deselects any other items that were selected previously
     * @param {SchemeItem} item 
     * @param {boolean} inclusive Flag that specifies whether it should deselect other items
     */
    selectItem(item, inclusive) {
        if (inclusive) {
            this.selectItemInclusive(item);
            this.selectedItemsMap[item.id] = true;
            if (this.eventBus) this.eventBus.emitItemSelected(item.id);
        } else {
            const deselectedItemIds = [];
            forEach(this.selectedItems, selectedItem => {
                if (selectedItem.id !== item.id) {
                    deselectedItemIds.push(selectedItem.id);
                }
            });
            this.selectedItems = [];
            forEach(deselectedItemIds, itemId => {
                this.selectedItemsMap[itemId] = false;
                if (this.eventBus) this.eventBus.emitItemDeselected(itemId);
            });

            this.selectItemInclusive(item);
            if (this.eventBus) this.eventBus.emitItemSelected(item.id);
        }
        this.updateMultiItemEditBox();
    }

    selectMultipleItems(items, inclusive) {
        if (!inclusive) {
            this.deselectAllItems();
        } 
        forEach(items, item => {
            this.selectedItems.push(item);
            this.selectedItemsMap[item.id] = true;
        });
        this.updateMultiItemEditBox();
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
            this.selectedItemsMap[item.id] = true;
        }

        this.sortSelectedItemsByAncestors();
    }

    sortSelectedItemsByAncestors() {
        if (this.selectedItems) {
            this.selectedItems = this.selectedItems.sort((a, b) => {
                let la = 0;
                let lb = 0;
                if (a.meta.ancestorIds) {
                    la = a.meta.ancestorIds.length;
                }
                if (b.meta.ancestorIds) {
                    lb = b.meta.ancestorIds.length;
                }
                return la - lb;
            });
        }
    }

    /**
     * Deselect all previously selected items
     */
    deselectAllItems() {
        const itemIds = map(this.selectedItems, item => item.id);
        forEach(this.selectedItems, item => {
            this.selectedItemsMap[item.id] = false;
        });
        this.selectedItems = [];

        // First we should reset selectedItems array and only then emit event for each event
        // Some components check selectedItems array to get information whether item is selected or not
        if (this.eventBus) {
            forEach(itemIds, itemId => this.eventBus.emitItemDeselected(itemId));
        }

        this.updateMultiItemEditBox();
    }

    /**
     * This is a recursive functions that goes through all sub-items
     * @param {Array} itemArray 
     */
    bringSelectedItemsToBack(itemArray) {
        if (!itemArray) {
            itemArray = this.scheme.items;
        }
        let i = 0;
        let lastItems = [];
        while (i < itemArray.length) {
            if (itemArray[i].childItems) {
                this.bringSelectedItemsToBack(itemArray[i].childItems);
            }

            if (this.isItemSelected(itemArray[i])) {
                lastItems.push(itemArray[i]);
                itemArray.splice(i, 1);
            } else {
                i++;
            }
        }

        forEach(lastItems, item => {
            itemArray.splice(0, 0, item);
        });
    }

    /**
     * This is a recursive functions that goes through all sub-items
     * @param {Array} itemArray 
     */
    bringSelectedItemsToFront(itemArray) {
        if (!itemArray) {
            itemArray = this.scheme.items;
        }
        let i = 0;
        let topItems = [];
        while (i < itemArray.length) {
            if (itemArray[i].childItems) {
                this.bringSelectedItemsToFront(itemArray[i].childItems);
            }

            if (this.isItemSelected(itemArray[i])) {
                topItems.push(itemArray[i]);
                itemArray.splice(i, 1);
            } else {
                i++;
            }
        }

        forEach(topItems, item => {
            itemArray.push(item);
        });
    }

    findItemById(itemId) {
        return this.itemMap[itemId];
    }

    findItemsByGroup(group) {
        const itemIds = this._itemGroupsToIds[group];
        const items = [];
        if (itemIds) {
            forEach(itemIds, id => {
                const item = this.findItemById(id);
                if (item) {
                    items.push(item);
                }
            })
        }
        return items;
    }

    findFirstElementBySelector(selector, selfItem) {
        const elements = this.findElementsBySelector(selector, selfItem);
        if (elements.length > 0) {
            return elements[0];
        }
        return null;
    }

    /**
     * Finds items that match specified selector
     * @param {String} selector contains a selector for an element
     * @param {SchemeItem} selfItem 
     */
    findElementsBySelector(selector, selfItem) {
        if (selector === 'self') {
            return [selfItem];
        }

        if (selector.charAt(0) === '#') {
            const id = selector.substr(1);
            const item = this.findItemById(id);
            if (item) {
                return [item];
            }
        } else {
            const colonIndex = selector.indexOf(':');
            if (colonIndex > 0) {
                const expression = selector.substring(0, colonIndex);
                if (expression === 'group') {
                    return this.findItemsByGroup(selector.substr(colonIndex + 1).trim());
                }
            }
        }
        return [];
    }

    copySelectedItems() {
        const copyBuffer = [];
        forEach(this.selectedItems, item => {
            copyBuffer.push(utils.clone(item));
        });

        return JSON.stringify(copyBuffer);
    }

    decodeItemsFromText(text) {
        let json = null;
        try {
            json = JSON.parse(text);
        } catch(err) {
            return null;
        }

        // verifying items
        if (!Array.isArray(json)) {
            return null;
        }

        for (let i = 0; i < json.length; i++) {
            const item = json[i];

            if (typeof item.area !== 'object' || item.area === null) {
                return null;
            }
            if (typeof item.shape !== 'string' || item.shape === null) {
                return null;
            }
        }
        return json;
    }

    cloneItems(items) {
        const copiedItemIds = {};
        const copiedItems = [];
        forEach(items, item => {
            // checking whether any of ancestors were already copied for this item
            // as we don't need to copy it twice
            if (!find(item.meta.ancestorIds, ancestorId => copiedItemIds[ancestorId] === 1)) {
                copiedItemIds[item.id] = 1;
                const worldPoint = this.worldPointOnItem(0, 0, item);
                const worldAngle = worldAngleOfItem(item);

                const newItem = this.copyItem(item);
                newItem.name = this.copyNameAndMakeUnique(item.name);
                newItem.area.x = worldPoint.x;
                newItem.area.y = worldPoint.y;
                newItem.area.r = worldAngle;

                copiedItems.push(newItem);
            }
        });
        
        // collecting id conversions so that later it could be used for converting attached connectors
        const idOldToNewConversions = new Map();
        forEach(copiedItems, copiedItem => {
            traverseItems(copiedItem, item => {
                idOldToNewConversions.set(item.meta.oldId, item.id);
            });
        });

        // recreates element selector in case the source or destination was also copied together with it
        const rebuildElementSelector = (elementSelector) => {
            if (elementSelector && elementSelector.indexOf('#') === 0) {
                const oldId = elementSelector.substr(1);
                if (idOldToNewConversions.has(oldId)) {
                    return '#' + idOldToNewConversions.get(oldId);
                }
            }
            return elementSelector;
        };

        forEach(copiedItems, copiedItem => {
            traverseItems(copiedItem, item => {
                if (item.shape === 'connector') {
                    item.shapeProps.sourceItem = rebuildElementSelector(item.shapeProps.sourceItem);
                    item.shapeProps.destinationItem = rebuildElementSelector(item.shapeProps.destinationItem);
                }
                
                if (item.shape === 'frame_player') {
                    forEach(item.shapeProps.animations, animation => {
                        if (animation.kind === 'item') {
                            animation.id = idOldToNewConversions.get(animation.id);
                        }
                    });
                    forEach(item.shapeProps.functions, animationFunction => {
                        const funcDef = AnimationFunctions[animationFunction.functionId];
                        if (!funcDef) {
                            return;
                        }
                        forEach(funcDef.args, (argDef, argName) => {
                            if (argDef.type === 'element') {
                                animationFunction.args[argName] = rebuildElementSelector(animationFunction.args[argName]);
                            }
                        });
                    });
                }


                // converting behavior events as well
                forEach(item.behavior.events, behaviorEvent => {
                    forEach(behaviorEvent.actions, action => {
                        action.element = rebuildElementSelector(action.element);

                        // converting element args of the function calls (e.g. path in "move" function)
                        if (Functions.main[action.method]) {
                            forEach(Functions.main[action.method].args, (argConfig, argName) => {
                                if (argConfig.type === 'element' && action.args[argName]) {
                                    action.args[argName] = rebuildElementSelector(action.args[argName]);
                                }
                            });
                        }
                    });
                });
            });
        });
        return copiedItems;
    }

    /**
     * 
     * @param {*} items array of items that should be copied and pasted
     * @param {*} centerX x in relative transform for which items should put pasted to
     * @param {*} centerY y in relative transform for which items should put pasted to 
     */
    pasteItems(items, centerX, centerY) {
        if (!items || items.length === 0) {
            return;
        }
        this.deselectAllItems();
        
        const copiedItems = this.cloneItems(items);
        forEach(copiedItems, item => {
            this.scheme.items.push(item);
        });

        // doing the selection afterwards so that item has all meta transform calculated after re-indexing
        // and its edit box would be aligned with the item
        forEach(copiedItems, item => this.selectItem(item, true));

        //since all items are already selected, the relative multi item edit box should be centered on the specified center point
        if (this.multiItemEditBox) {
            const boxArea = this.multiItemEditBox.area;
            const boxCenterX = boxArea.x + boxArea.w / 2;
            const boxCenterY = boxArea.y + boxArea.h / 2;
            const dx = centerX - boxCenterX;
            const dy = centerY - boxCenterY;

            boxArea.x += dx;
            boxArea.y += dy;
            this.updateMultiItemEditBoxItems(this.multiItemEditBox, true, DEFAULT_ITEM_MODIFICATION_CONTEXT);
            this.updateMultiItemEditBoxItems(this.multiItemEditBox, false, DEFAULT_ITEM_MODIFICATION_CONTEXT);
        }

        this.reindexItems();
    }

    copyItem(oldItem) {
        const newId = shortid.generate();
        const newItem = {
            id: newId,
            meta: { oldId: oldItem.id } // setting oldId as we need to be able to convert attached copied connectors
        };

        forEach(oldItem, (value, field) => {
            if (field === 'childItems') {
                newItem[field] = map(value, childItem => this.copyItem(childItem));
            } else if (field !== 'id' && field !== 'meta') {
                newItem[field] = utils.clone(value);
            }
        });

        return newItem;
    }

    /**
     * This function is used to update the area of all items inside edit box so that
     * they reflect transformations applied to edit box.
     * The way it works is by computing original projection points of items onto new area of edit box
     * @param {MultiItemEditBox} multiItemEditBox 
     * @param {Boolean} isSoft 
     * @param {ItemModificationContext} context 
     */
    updateMultiItemEditBoxItems(multiItemEditBox, isSoft, context, precision) {
        if (precision === undefined) {
            precision = 4;
        }
        if (!context) {
            context = DEFAULT_ITEM_MODIFICATION_CONTEXT;
        }

        // storing ids of dragged items in a map
        // this way we will be able to figure out whether any items ancestors were dragged already
        // so that we can skip dragging or rotating an item
        const itemDraggedIds = new Set();

        const topRightPoint = myMath.worldPointInArea(multiItemEditBox.area.w, 0, multiItemEditBox.area);
        const bottomLeftPoint = myMath.worldPointInArea(0, multiItemEditBox.area.h, multiItemEditBox.area);
        const topVx = topRightPoint.x - multiItemEditBox.area.x;
        const topVy = topRightPoint.y - multiItemEditBox.area.y;

        const leftVx = bottomLeftPoint.x - multiItemEditBox.area.x;
        const leftVy = bottomLeftPoint.y - multiItemEditBox.area.y;

        const itemsForReindex = [];

        forEach(multiItemEditBox.items, item => {
            itemDraggedIds.add(item.id)

            // checking whether the item in the box list is actually a descendant of the other item that was also in the same box
            // this is needed to build proper reindexing of items and not to double rotate child items in case their parent was already rotated
            const parentWasAlreadyUpdated = (item.meta && item.meta.ancestorIds && find(item.meta.ancestorIds, id => itemDraggedIds.has(id)));
            if (!parentWasAlreadyUpdated) {
                itemsForReindex.push(item);
            }

            if (!item.locked) {
                // calculating new position of item based on their pre-calculated projections
                const itemProjection = multiItemEditBox.itemProjections[item.id];

                if (!parentWasAlreadyUpdated) {
                    item.area.r = myMath.roundPrecise(itemProjection.r + multiItemEditBox.area.r, precision);
                }

                const projectBack = (point) => {
                    return {
                        x: multiItemEditBox.area.x + topVx * point.x + leftVx * point.y,
                        y: multiItemEditBox.area.y + topVy * point.x + leftVy * point.y
                    }
                };
                
                // Here we have to do some reversed computation to figure out which translation matrix should be used in the item
                // so that it reflects the changes in multi-item edit box
                // We do it like this:
                // We take a point at (0, 0) which represents top left corner in the item and try to match it to the
                // representative projected point in multi-item edit box in the world transform
                // In other words: edit box stores projection of topLeft corner relatively to itself.
                // So if we project that corner to the real world - we would get a point where it is supposed to be after 
                // all modifications made to the edit box. Lets call this point Pw.
                // Then we know how to calculate local point of top left corner P0 which is in (0, 0) inside item area
                // We just need to apply standard transformation together with parent transform.
                // Based on this we can write the following equation:
                //
                //      Pw = Ap * At * Ac1 * Ar * Ac2 * As * P0
                //
                // where
                //      Pw  - top left corner in world transform
                //      Ap  - parent item transform matrix
                //      At  - translation matrix. This is unknown in the equation
                //      Ac1 - translation matrix for items pivot point. It moves item to by (rpx, rpy). 
                //            This matrix is needed so that item is rotated around pivot point
                //      Ar  - rotation matrix. Rotates item by its area.r value
                //      Ac2 - translation matrix for items pivot point. It moves item back by (-rpx, -rpy)
                //      As  - scale matrix
                //      P0  - top left corner is just a 1-column matrix representing point in (0, 0)
                //
                // We can move Ap to the left if we inverse it. Lets also group all matrices
                // on the right between At and P0 and call it just matrix A
                //
                //      Ap-1 * Pw = At * A * P0
                // 
                // where
                //      Ap-1 = is inverse of Ap matrix
                //      A = Ac1 * Ar * Ac2 * As
                // 
                // lets call matrinx Ap-1 as B to make it easier to distinguish between the two matrices:
                //
                //      B * Pw = At * A * P0
                //
                // in the equation above only At is unknown so lets expand all multiplications of all matrices
                //
                //      | B11  B12  B13 |   | Xw |     | 1  0  Xt |   | A11  A12  A13 |   | 0 |
                //      | B21  B22  B23 | * | Yw |  =  | 0  1  Yt | * | A21  A22  A23 | * | 0 |
                //      | B31  B32  B33 | * | 1  |     | 0  0  1  |   | A31  A32  A33 |   | 1 |
                //
                // if we multiple all matrices we will find out that
                //
                //      | B11*Xw + B12*Yw + B13 |   | A13 + A33*Xt |
                //      | B21*Xw + B22*Yw + B23 | = | A23 + A33*Yt |
                //      |    B31 + B32 + B33    |   |     A33      |
                //
                // from the abouve equation we can take out the relevant parts and finally get our complete formula
                //
                //      Xt = (B11*Xw + B12*Yw + B13 - A13) / A33
                //      Yt = (B21*Xw + B22*Yw + B23 - A23) / A33

                const itemParentInversedTransform = myMath.inverseMatrix3x3(item.meta.transformMatrix);
                if (itemParentInversedTransform) {

                    const rpx = item.area.px * item.area.w;
                    const rpy = item.area.py * item.area.h;

                    const B = itemParentInversedTransform;
                    const A = myMath.multiplyMatrices(
                        myMath.translationMatrix(rpx, rpy),
                        myMath.rotationMatrixInDegrees(item.area.r),
                        myMath.translationMatrix(-rpx, -rpy),
                        myMath.scaleMatrix(item.area.sx, item.area.sy)
                    );

                    
                    const worldTopLeft = projectBack(itemProjection.topLeft);

                    const xw = worldTopLeft.x;
                    const yw = worldTopLeft.y;

                    if (!myMath.tooSmall(A[2][2])) {
                        item.area.x = (B[0][0]*xw + B[0][1]*yw + B[0][2] - A[0][2]) / A[2][2];
                        item.area.y = (B[1][0]*xw + B[1][1]*yw + B[1][2] - A[1][2]) / A[2][2];
                    }
                }

                // recalculated width and height only in case multi item edit box was resized
                // otherwise it doesn't make sense
                if (context.resized) {
                    const worldBottomRight = projectBack(itemProjection.bottomRight);
                    const localBottomRight = localPointOnItem(worldBottomRight.x, worldBottomRight.y, item);
                    item.area.w = localBottomRight.x;
                    item.area.h = localBottomRight.y;
                }

                if (item.shape === 'curve') {
                    this.readjustCurveItemPointsInMultiItemEditBox(item, multiItemEditBox, precision);
                }

                // changing item revision so that its shape will be recomputed
                item.meta.revision += 1;

                this.readjustItemAndDescendants(item.id, isSoft, context, precision);
                if (this.eventBus) this.eventBus.emitItemChanged(item.id, 'area');

            }
        });
        forEach(itemsForReindex, item => this.updateChildTransforms(item));

        if (this.eventBus) this.eventBus.$emit(this.eventBus.MULTI_ITEM_EDIT_BOX_ITEMS_UPDATED);
    }

    readjustCurveItemPointsInMultiItemEditBox(item, multiItemEditBox, precision) {
        const originalArea = multiItemEditBox.itemData[item.id].originalArea;
        const originalCurvePoints = multiItemEditBox.itemData[item.id].originalCurvePoints;

        if (!originalCurvePoints) {
            return;
        }

        forEach(originalCurvePoints, (point, index) => {
            if (originalArea.w > DIVISION_BY_ZERO_THRESHOLD) {
                item.shapeProps.points[index].x = myMath.roundPrecise(point.x * item.area.w / originalArea.w, precision);
            }
            if (originalArea.h > DIVISION_BY_ZERO_THRESHOLD) {
                item.shapeProps.points[index].y = myMath.roundPrecise(point.y * item.area.h / originalArea.h, precision);
            }
            if (point.t === 'B') {
                if (originalArea.w > DIVISION_BY_ZERO_THRESHOLD) {
                    item.shapeProps.points[index].x1 = myMath.roundPrecise(point.x1 * item.area.w / originalArea.w, precision);
                    item.shapeProps.points[index].x2 = myMath.roundPrecise(point.x2 * item.area.w / originalArea.w, precision);
                }
                if (originalArea.h > DIVISION_BY_ZERO_THRESHOLD) {
                    item.shapeProps.points[index].y1 = myMath.roundPrecise(point.y1 * item.area.h / originalArea.h, precision);
                    item.shapeProps.points[index].y2 = myMath.roundPrecise(point.y2 * item.area.h / originalArea.h, precision);
                }
            }
        });
    }

    /**
     * Searches for all item names and adds numeric index so that it becomes unique in the scheme
     * @param {string} name 
     */
    generateUniqueName(name) {
        const itemNames = map(this.getItems(), item => item.name);
        return collections.giveUniqueName(name, itemNames);
    }

    copyNameAndMakeUnique(name) {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) {
            if (!isNaN(nameParts[nameParts.length - 1])) {
                nameParts.splice(nameParts.length - 1, 1);
                return this.generateUniqueName(nameParts.join(' ').trim());
            }
        }
        return this.generateUniqueName(name);
    }

    updateMultiItemEditBox() {
        if (this.selectedItems.length > 0) {
            this.multiItemEditBox = this.generateMultiItemEditBox(this.selectedItems);
        } else {
            this.multiItemEditBox = null;
        }
    }

    /**
     * This is needed only in case we don't want to reset multi-item edit box
     * but we do need to update its area
     */
    updateMultiItemEditBoxAreaOnly() {
        if (this.multiItemEditBox && this.selectedItems.length > 0) {
            const box = this.generateMultiItemEditBox(this.selectedItems);
            this.multiItemEditBox.area.x = box.area.x;
            this.multiItemEditBox.area.y = box.area.y;
            this.multiItemEditBox.area.w = box.area.w;
            this.multiItemEditBox.area.h = box.area.h;
            this.multiItemEditBox.area.r = box.area.r;
            this.multiItemEditBox.area.sx = box.area.sx;
            this.multiItemEditBox.area.sy = box.area.sy;
        }
    }

    createMultiItemEditBoxAveragedArea(items) {
        let minP = null;
        let maxP = null;

        // iterating over all corners of items area to calculate the boundary box
        const pointGenerators = [
            (item) => {return {x: 0, y: 0}},
            (item) => {return {x: item.area.w, y: 0}},
            (item) => {return {x: item.area.w, y: item.area.h}},
            (item) => {return {x: 0, y: item.area.h}},
        ];

        forEach(items, item => {
            forEach(pointGenerators, pointGenerator => {
                const localPoint = pointGenerator(item);
                const p = this.worldPointOnItem(localPoint.x, localPoint.y, item);
                if (minP) {
                    minP.x = Math.min(minP.x, p.x);
                    minP.y = Math.min(minP.y, p.y);
                } else {
                    minP = {x: p.x, y: p.y};
                }

                if (maxP) {
                    maxP.x = Math.max(maxP.x, p.x);
                    maxP.y = Math.max(maxP.y, p.y);
                } else {
                    maxP = {x: p.x, y: p.y};
                }
            });
        });

        return {
           x: minP.x,
           y: minP.y,
           w: maxP.x - minP.x,
           h: maxP.y - minP.y,
           r: 0,
           px: 0,
           py: 0,
           sx: 1.0,
           sy: 1.0
        };
    }

    /**
     * 
     * @param {Array} items 
     * @returns {MultiItemEditBox}
     */
    generateMultiItemEditBox(items) {
        let area = null;
        let locked = true;

        if (items.length === 1) {
            // we want the item edit box to be aligned with item only if that item was selected
            /*
            Bt * Bd1 * Br * Bd2 * Bs * P0 = 
            */
            const   p0 = this.worldPointOnItem(0, 0, items[0]),
                    p1 = this.worldPointOnItem(items[0].area.w, 0, items[0]),
                    p3 = this.worldPointOnItem(0, items[0].area.h, items[0]);

            area = {
                x: p0.x,
                y: p0.y,
                r: myMath.fullAngleForVector(p1.x - p0.x, p1.y - p0.y) * 180 / Math.PI,
                w: myMath.distanceBetweenPoints(p0.x, p0.y, p1.x, p1.y),
                h: myMath.distanceBetweenPoints(p0.x, p0.y, p3.x, p3.y),
                px: 0,
                py: 0,
                sx: 1.0,
                sy: 1.0
            };


        } else {
            // otherwise item edit box area will be an average of all other items
            area = this.createMultiItemEditBoxAveragedArea(items);
        }

        const itemProjections = {};

        // First we are going to map all item coords to a multi item box area by projecting their coords on to top and left edges of edit box
        // later we will recalculate item new positions based on new edit box area using original projections
        const topRightPoint = myMath.worldPointInArea(area.w, 0, area);
        const bottomLeftPoint = myMath.worldPointInArea(0, area.h, area);

        const originalBoxTopVx = topRightPoint.x - area.x;
        const originalBoxTopVy = topRightPoint.y - area.y;

        const originalBoxLeftVx = bottomLeftPoint.x - area.x;
        const originalBoxLeftVy = bottomLeftPoint.y - area.y;

        let topLengthSquare = originalBoxTopVx * originalBoxTopVx + originalBoxTopVy * originalBoxTopVy;

        if (myMath.tooSmall(topLengthSquare)) {
            topLengthSquare = 0.001;
        }

        let leftLengthSquare = originalBoxLeftVx * originalBoxLeftVx + originalBoxLeftVy * originalBoxLeftVy
        if (leftLengthSquare < 0.001) {
            leftLengthSquare = 0.001;
        }
        
        // used to store additional information that might be needed when modifying items
        const itemData = {};

        //storing ids of all items that are included in the box
        const itemIds = new Set();

        forEach(items, item => {
            itemData[item.id] = {
                originalArea: utils.clone(item.area)
            };
            itemIds.add(item.id);
            if (!item.locked) {
                locked = false;
            }

            // caclulating projection of item world coords on the top and left edges of original edit box
            // since some items can be children of other items we need to project only their world location

            const worldPoint = this.worldPointOnItem(0, 0, item);
            const worldBottomRightPoint = this.worldPointOnItem(item.area.w, item.area.h, item);

            const xAxisVector = worldVectorOnItem(1, 0, item);
            const yAxisVector = worldVectorOnItem(0, 1, item);

            const projectPoint = (x, y) => {
                let Vx = x - area.x;
                let Vy = y - area.y;
                return {
                    x: (originalBoxTopVx * Vx + originalBoxTopVy * Vy) / topLengthSquare,
                    y: (originalBoxLeftVx * Vx + originalBoxLeftVy * Vy) / leftLengthSquare
                };
            };

            itemProjections[item.id] = {
                topLeft: projectPoint(worldPoint.x, worldPoint.y),
                bottomRight: projectPoint(worldBottomRightPoint.x, worldBottomRightPoint.y),
                // the following angle correction is needed in case only one item is selected,
                // in that case the initial edit box area might have a starting angle that matches item area
                // in all other cases the initial angle will be 0
                r: item.area.r - area.r,

                scalingVector: {
                    x: myMath.vectorLength(xAxisVector.x, xAxisVector.y),
                    y: myMath.vectorLength(yAxisVector.x, yAxisVector.y)
                }
            };

            if (item.shape === 'curve') {
                // storing original points so that they can be readjusted in case the item is resized
                itemData[item.id].originalCurvePoints = utils.clone(item.shapeProps.points);
            }
        });

        return {
            id: shortid.generate(),
            locked,
            items,
            itemIds,
            itemData,
            area,
            itemProjections,
        };
    }

    generateItemSnappers(item) {
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        return shape.getSnappers(item);
    }

    /**
     * Searches for item that is able to fit item inside it and that has the min area out of all specified items
     * @param {Area} area  - area that it needs to fit into another parent item (should be in world transform)
     * @param {Function} itemConsiderCallback - callback function which should return true for specified item if it should be considered
     * @returns {Item}
     */
    findItemSuitableForParent(area, itemConsiderCallback) {
        const items = this.getItems();

        // doing backwards search as getItems() returns a list of all items ordered by their layering position on screen
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];

            // connectors should not be parent of any other items
            if (item.visible && item.shape !== 'connector' && (!itemConsiderCallback || itemConsiderCallback(item))) {

                const worldArea = this.worldItemAreas.get(item.id);

                if (worldArea &&  area.w + area.h < worldArea.w + worldArea.h) {
                    const overlap = myMath.overlappingArea(worldArea, area);
                    
                    const A = area.w * area.h;
                    if (overlap && !myMath.tooSmall(A)) {
                        if ((overlap.w * overlap.h) / A >= 0.5)  {
                            return item;
                        }
                    }
                }
            }
        }

        return null;
    }

    prepareFrameAnimations() {
        // This function is needed because animations for frame player can be triggered from two places:
        // a) by clicking play button
        // b) by calling "Play Frames" function in behavior actions
        this.prepareFrameAnimationsForItems(this.scheme.items);
    }

    prepareFrameAnimationsForItems(items) {
        this.frameAnimations = {};
        forEach(items, rootItem => {
            traverseItems(rootItem, item => {
                if (item.shape !== 'frame_player') {
                    return;
                }
                const compiledAnimations = compileAnimations(item, this);
                this.frameAnimations[item.id] = new FrameAnimation(item.shapeProps.fps, item.shapeProps.totalFrames, compiledAnimations);
            });
        });
    }

    getFrameAnimation(itemId) {
        return this.frameAnimations[itemId];
    }

    attachSchemeToComponentItem(componentItem, scheme) {
        const childItems = this.cloneItems(scheme.items);

        const bBox = this.getBoundingBoxOfItems(childItems);
        forEach(childItems, item => {
            item.area.x -= bBox.x;
            item.area.y -= bBox.y;
        });

        let scale = 1.0, dx = 0, dy = 0;
        const sx = componentItem.area.w / bBox.w;
        const sy = componentItem.area.h / bBox.h;
        let w = bBox.w;
        let h = bBox.h;

        if (bBox.w > 0 && bBox.h > 0) {
            scale = Math.min(sx, sy, 1.0);
            
            if (sx > 1) {
                dx = (componentItem.area.w - bBox.w) / 2;
            } else if (sx > sy) {
                dx = (componentItem.area.w - bBox.w * scale) / 2;
                w = bBox.w / Math.max(0.00001, sx);
            }

            if (sy > 1) {
                dy = (componentItem.area.h - bBox.h) / 2;
            } else if (sx < sy) {
                dy = (componentItem.area.h - bBox.h * scale) / 2;
                h = bBox.h / Math.max(0.00001, sy);
            }
        }

        const rectItem = createDefaultRectItem();
        rectItem.id = shortid.generate();
        rectItem.area.x = dx;
        rectItem.area.y = dy;

        rectItem.area.w = w;
        rectItem.area.h = h;

        rectItem.area.sx = scale;
        rectItem.area.sy = scale;
        rectItem.shapeProps.fill = {type: 'none'};
        rectItem.shapeProps.strokeSize = 0;

        rectItem.childItems = childItems;

        componentItem.childItems = [rectItem];

        this.reindexChildItems(componentItem);
    }
}


export default SchemeContainer;
