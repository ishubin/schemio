/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {forEach, map, filter, findIndex, find, indexOf} from '../collections';
import { SpatialIndex } from '../SpatialIndex';

import '../typedef';
import {giveUniqueName} from '../collections';
import myMath from '../myMath.js';
import utils from '../utils.js';
import shortid from 'shortid';
import Shape from '../components/editor/items/shapes/Shape.js';
import {generateComponentGoBackButton} from '../components/editor/items/shapes/Component.vue';
import { Item, traverseItems, defaultItemDefinition, defaultItem, findFirstItemBreadthFirst} from './Item';
import { enrichItemWithDefaults } from './ItemFixer';
import { enrichSchemeWithDefaults } from './Scheme';
import { Debugger, Logger } from '../logger';
import Functions from '../userevents/functions/Functions';
import { compileAnimations, FrameAnimation } from '../animations/FrameAnimation';
import { enrichObjectWithDefaults } from '../../defaultify';
import AnimationFunctions from '../animations/functions/AnimationFunctions';
import EditorEventBus from '../components/editor/EditorEventBus';
import { processJSONTemplate } from '../templater/templater';

const log = new Logger('SchemeContainer');

// for now putting it here until I figure out a more elegant way of indexing item outline points
// There is a problem when the items are scaled too litle and when user zooms in to that downscaled item
// In that case it would not be able to find points in the quad tree as the generated points are too sparse
// Therefore we need to compensate for that and use this const value as the minimum search range
const minSpatialIndexDistance = 20;

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

export function localPointOnItemToLocalPointOnOtherItem(x, y, srcItem, dstItem) {
    const worldPoint = worldPointOnItem(x, y, srcItem);
    return localPointOnItem(worldPoint.x, worldPoint.y, dstItem);
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
 * This function is only used for calculating bounds of reference items
 * so that they can be properly fit inside of an component
 * @param {Array} items
 * @returns {Area}
 */
function getLocalBoundingBoxOfItems(items) {
    const boundsItem = findFirstItemBreadthFirst(items, item => item.shape === 'dummy' && item.shapeProps.screenBounds);

    const filteredItems = boundsItem ? [boundsItem] : items;

    if (!filteredItems || filteredItems.length === 0) {
        return {x: 0, y: 0, w: 0, h: 0};
    }

    let range = null;

    forEach(filteredItems, item => {
        const points = [
            {x: item.area.x, y: item.area.y},
            {x: item.area.x + item.area.w, y: item.area.y},
            {x: item.area.x + item.area.w, y: item.area.y + item.area.h},
            {x: item.area.x, y: item.area.y + item.area.h},
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
 *
 * @param {Array<Item>} items
 * @returns {Area}
 */
export function getBoundingBoxOfItems(items) {
    if (!items || items.length === 0) {
        return {x: 0, y: 0, w: 0, h: 0};
    }

    let range = null;

    forEach(items, item => {
        const points = [
            worldPointOnItem(0, 0, item),
            worldPointOnItem(item.area.w, 0, item),
            worldPointOnItem(item.area.w, item.area.h, item),
            worldPointOnItem(0, item.area.h, item),
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

/**
 * Creates svg path element for item outline
 * @param {Item} item
 * @returns {SVGPathElement}
 */
export function getItemOutlineSVGPath(item) {
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
}


function createDefaultRectItem() {
    const item = utils.clone(defaultItem);
    item.shape = 'rect';

    enrichItemWithDefaults(item);
    return item;
}


function updateItemRevision(item) {
    item.meta.revision = ((item.meta.revision || 0) + 1) % 1000;
}

function visitItems(items, callback, transformMatrix, parentItem, ancestorIds, isIndexable) {
    if (!items) {
        return;
    }
    if (!transformMatrix) {
        transformMatrix = myMath.identityMatrix();
    }
    if (!ancestorIds) {
        ancestorIds = [];
    }

    if (isIndexable === undefined) {
        isIndexable = true;
    }

    for (let i = 0; i < items.length; i++) {
        // this has to be done here as the item might not yet be fully enriched
        // also the app optimizes schemes on saving and removes fields with default values
        enrichObjectWithDefaults(items[i].area, defaultItemDefinition.area);

        callback(items[i], transformMatrix, parentItem, ancestorIds, isIndexable);

        const itemTransform = myMath.standardTransformWithArea(transformMatrix, items[i].area);

        if (items[i].childItems) {
            visitItems(items[i].childItems, callback, itemTransform, items[i], ancestorIds.concat([items[i].id]), isIndexable);
        }
        if (items[i]._childItems) {
            visitItems(items[i]._childItems, callback, itemTransform, items[i], ancestorIds.concat([items[i].id]), false);
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

        return this.forceUpdate(item);
    }

    forceUpdate(item) {
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
     */
    constructor(scheme, editorId, listener) {
        Debugger.register('SchemioContainer', this);

        this.editorId = editorId;
        this.listener = listener;
        this.scheme = scheme;
        this.screenTransform = {x: 0, y: 0, scale: 1.0};
        this.screenSettings = {width: 700, height: 400, x1: -1000000, y1: -1000000, x2: 1000000, y2: 1000000};
        // contains an array of items that were selected
        this.selectedItems = [];
        // used to quick access to item selection state
        this.selectedItemsMap = {};
        this.activeBoundaryBox = null;
        this.itemMap = {};
        this._itemArray = []; // stores all flatten items (all sub-items are stored as well). it only stores indexable items
        this.revision = 0;
        this.hudItems = []; //used for storing hud items that are supposed to be rendered in the viewport transform
        this.worldItems = []; // used for storing top-level items with default area
        this.worldItemAreas = new Map(); // used for storing rough item bounding areas in world transform (used for finding suitable parent)
        this.dependencyItemMap = {}; // used for looking up items that should be re-adjusted once the item area is changed (e.g. curve item can be attached to other items)

        this.itemCloneIds = new Map(); // stores Set of item ids that were cloned and attached to the component from the reference item
        this.itemCloneReferenceIds = new Map(); // stores ids of reference items that were used for cloned items

        this._itemTagsToIds = {}; // used for quick access to item ids via item tags
        this.itemTags = []; // stores tags from all items
        this.framePlayers = []; // stores all frame players so that later it can prepare all animations

        this.spatialIndex = new SpatialIndex(); // used for indexing item path points
        this.pinSpatialIndex = new SpatialIndex(); // used for indexing item pins

        // contains mapping of frame player id to its compiled animations
        this.framesAnimations = {};

        this.componentItems = [];

        this.outlinePointsCache = new Map(); // stores points of item outlines so that it doesn't have to recompute it for items that were not changed

        this.svgOutlinePathCache = new ItemCache(getItemOutlineSVGPath);

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
                const parentItem = this.findItemById(mainItem.meta.parentId);
                if (parentItem) {
                    parentTransform = itemCompleteTransform(parentItem);
                }
            }

            const recalculatedTransform = myMath.standardTransformWithArea(parentTransform, mainItem.area);

            const callback = (item, transformMatrix, parentItem, ancestorIds) => {
                if (!item.meta) {
                    item.meta = {};
                }
                item.meta.transformMatrix = transformMatrix;
            };

            visitItems(mainItem.childItems, callback, recalculatedTransform, mainItem, mainItem.meta.ancestorIds);
        }
    }

    reindexItems() {
        log.info('reindexItems()', this);
        log.time('reindexItems');

        this.itemMap = {};
        this._itemArray = [];
        this.worldItems = [];
        this._itemTagsToIds = {};
        this.worldItemAreas = new Map();
        this.relativeSnappers.horizontal = [];
        this.relativeSnappers.vertical = [];
        this.spatialIndex = new SpatialIndex();
        this.pinSpatialIndex = new SpatialIndex();
        this.dependencyItemMap = {};
        this.itemCloneIds = new Map();
        this.itemCloneReferenceIds = new Map();
        this.framePlayers = [];

        this.componentItems = [];

        if (!this.scheme.items) {
            return;
        }

        this.reindexSpecifiedItems(this.scheme.items);
        this.reindexComponents();
        this.fixComponentCyclicDependencies();

        log.timeEnd('reindexItems');
    }

    reindexComponents() {
        forEach(this.componentItems, item => this.reindexEmbeddedComponent(item));
    }

    reindexEmbeddedComponent(item) {
        item.meta.referenceItemId = null;
        if (item.shapeProps.kind === 'embedded' && item.shapeProps.referenceItem) {
            const referenceItem = this.findFirstElementBySelector(item.shapeProps.referenceItem);
            if (referenceItem) {
                item.meta.referenceItemId = referenceItem.id;

                const rootItem = {
                    ...referenceItem,
                    meta: {
                        ...referenceItem.meta,
                        componentRoot: true
                    },
                    visible: true,
                };

                this.attachItemsToComponentItem(item, [rootItem]);
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
            }
        }
    }

    fixComponentCyclicDependencies() {
        this.componentItems.forEach(component => component.meta.cyclicComponent = false);
        this.componentItems.forEach(component => {
            if (component.shapeProps.kind === 'embedded') {
                this.checkComponentForCyclicDependencies(component);
            }
        });
    }

    checkComponentForCyclicDependencies(componentItem) {
        if (componentItem.shapeProps.kind !== 'embedded') {
            return;
        }

        const mainReferenceItem = this.findItemById(componentItem.meta.referenceItemId);
        if (!mainReferenceItem) {
            return;
        }

        const queue = [componentItem];

        const planForTraverse = (childItems) => {
            forEach(childItems, childItem => {
                queue.push(childItem);
            });
        };

        let isFirstMatch = true;

        // doing a breadth first search in order to protect from the cyclic loops in the lower stack.
        // Technically this should not be possible but that is only in case each component is check in the correct order
        while(queue.length > 0) {
            const item = queue.shift();
            if (item.meta.referenceItemId === mainReferenceItem.id) {
                if (!isFirstMatch) {
                    componentItem.meta.cyclicComponent = true;
                    componentItem._childItems = [];
                    return;
                }
                isFirstMatch = false;
            }

            if (item.shape === 'component' && item.shapeProps.kind === 'embedded') {
                const referenceItem = this.findItemById(item.meta.referenceItemId);
                if (referenceItem) {
                    queue.push(referenceItem);
                }
            }
            planForTraverse(item.childItems);
            planForTraverse(item._childItems);
        }
    }


    /*
        Traverses all items and makes their tags and tag selectors unique.
        This is needed so that behavior actions defined inside components affects only items within itself
    */
    isolateItemTags(items) {
        const tagConversions = new Map();
        traverseItems(items, item => {
            if (!Array.isArray(item.tags)) {
                return;
            }
            item.tags = item.tags.map(tag => {
                if (tagConversions.has(tag)) {
                    return tagConversions.get(tag);
                }
                const convertedTag = `${tag}-${shortid.generate()}`;
                tagConversions.set(tag, convertedTag);
                return convertedTag;
            });
        });

        const replaceSelector = (selector) => {
            if (!selector) {
                return selector;
            }
            const colonIndex = selector.indexOf(':');
            if (colonIndex > 0) {
                const expression = selector.substring(0, colonIndex).trim();
                if (expression === 'tag') {
                    const tag = selector.substr(colonIndex + 1).trim();
                    if (tagConversions.has(tag)) {
                        return `tag: ${tagConversions.get(tag)}`;
                    }
                }
            }
            return selector;
        };

        traverseItems(items, item => {
            if (!item.behavior || !Array.isArray(item.behavior.events)) {
                return;
            }
            item.behavior.events.forEach(event => {
                if (!Array.isArray(event.actions)) {
                    return;
                }
                event.actions.forEach(action => {
                    action.element = replaceSelector(action.element);
                    if (action.args && Functions.main.hasOwnProperty(action.method)) {
                        const argDefs = Functions.main[action.method].args;
                        forEach(argDefs, (argDef, argName) => {
                            if (argDef.type === 'element') {
                                action.args[argName] = replaceSelector(action.args[argName]);
                            }
                        });
                    }
                });
            })
        });
    }

    attachItemsToComponentItem(componentItem, referenceItems) {
        if (!referenceItems) {
            return;
        }
        const preserveOriginalNames = true;
        const shouldIndexClones = true;

        const childItems = this.cloneItems(referenceItems, preserveOriginalNames, shouldIndexClones);

        if (componentItem.shapeProps.kind === 'external') {
            this.isolateItemTags(childItems);
        }

        const bBox = getLocalBoundingBoxOfItems(referenceItems);
        forEach(childItems, item => {
            item.area.x -= bBox.x;
            item.area.y -= bBox.y;

            // resetting the visiblity of component root items
            // so that the reference item can be hidden and not effect the component
            item.opacity = 100;
            item.selfOpacity = 100;
            item.visible = true;

            // also clearing item tags for root items
            // This is needed because reference items can have tags,
            // which could be used to hide multiple items in a single event
            // We don't want that event to get triggered for cloned component root items
            item.tags = [];
        });

        let scale = 1.0, dx = 0, dy = 0;
        let w = Math.max(bBox.w, 0.00001);
        let h = Math.max(bBox.h, 0.00001);
        let sx = componentItem.area.w / w;
        let sy = componentItem.area.h / h;

        if (componentItem.shapeProps.placement === 'centered') {
            scale = Math.min(sx, sy);
            sx = scale;
            sy = scale;
            dx = (componentItem.area.w - w * sx) / 2;
            dy = (componentItem.area.h - h * sy) / 2;
        }

        const overlayRect = createDefaultRectItem();
        overlayRect.id = shortid.generate();
        overlayRect.area.x = 0;
        overlayRect.area.y = 0;
        overlayRect.area.w = componentItem.area.w;
        overlayRect.area.h = componentItem.area.h;
        overlayRect.selfOpacity = 0;
        overlayRect.meta = {isComponentContainer: true};
        overlayRect.name = 'Overlay container';

        const rectItem = createDefaultRectItem();
        rectItem.shape = 'dummy';
        rectItem.selfOpacity = 0;
        rectItem.id = shortid.generate();
        rectItem.meta = {isComponentContainer: true};
        rectItem.name = 'Scaled container';
        rectItem.area.x = dx;
        rectItem.area.y = dy;
        rectItem.area.w = w;
        rectItem.area.h = h;
        rectItem.area.px = 0;
        rectItem.area.py = 0;
        rectItem.area.sx = sx;
        rectItem.area.sy = sy;

        rectItem._childItems = childItems;
        overlayRect._childItems = [rectItem];

        if (componentItem.shapeProps.kind === 'external') {
            const backButton = generateComponentGoBackButton(componentItem, overlayRect, this.screenTransform, this.screenSettings.width, this.screenSettings.height);
            if (backButton) {
                overlayRect._childItems.push(backButton);
            }
        }

        componentItem._childItems = [overlayRect];

        const itemTransform = myMath.standardTransformWithArea(componentItem.meta.transformMatrix, componentItem.area);
        const nonIndexable = false;
        this.reindexSpecifiedItems(componentItem._childItems, itemTransform, componentItem, componentItem.meta.ancestorIds.concat([componentItem.id]), nonIndexable);
    }

    readjustComponentContainerRect(componentItem) {
        if (!componentItem._childItems || componentItem._childItems.length === 0) {
            return;
        }

        if (!componentItem._childItems[0]._childItems || componentItem._childItems[0]._childItems.length === 0) {
            return;
        }

        const componentContainer = componentItem._childItems[0]._childItems[0];
        if (componentContainer._childItems.length === 0) {
            return;
        }

        //TODO optimize this code. It is executed only during resizing of edit box. The following data can be cached since there is only one edit box at a time.
        const referenceItems = [];
        componentContainer._childItems.forEach(cloneItem => {
            const referenceItemId = this.itemCloneReferenceIds.get(cloneItem.id);
            if (referenceItemId) {
                referenceItems.push(this.findItemById(referenceItemId));
            }
        });

        const bBox = getLocalBoundingBoxOfItems(referenceItems);
        let scale = 1.0, dx = 0, dy = 0;
        let w = Math.max(bBox.w, 0.00001);
        let h = Math.max(bBox.h, 0.00001);
        let sx = componentItem.area.w / w;
        let sy = componentItem.area.h / h;

        if (componentItem.shapeProps.placement === 'centered') {
            scale = Math.min(sx, sy);
            sx = scale;
            sy = scale;
            dx = (componentItem.area.w - w * sx) / 2;
            dy = (componentItem.area.h - h * sy) / 2;
        }

        componentContainer.area.x = dx;
        componentContainer.area.y = dy;
        componentContainer.area.w = w;
        componentContainer.area.h = h;
        componentContainer.area.sx = sx;
        componentContainer.area.sy = sy;
    }

    reindexChildItems(mainItem) {
        const itemTransform = myMath.standardTransformWithArea(mainItem.meta.transformMatrix, mainItem.area);

        if (mainItem.childItems) {
            this.reindexSpecifiedItems(mainItem.childItems, itemTransform, mainItem, mainItem.meta.ancestorIds.concat([mainItem.id]));
        }
    }

    reindexSpecifiedItems(items, transformMatrix, parentItem, ancestorIds, isIndexable) {
        if (isIndexable === undefined) {
            isIndexable = true;
        }
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

        visitItems(items, (item, transformMatrix, parentItem, ancestorIds, isIndexable) => {
            if (isIndexable) {
                this._itemArray.push(item);
            }

            enrichItemWithDefaults(item);
            this.enrichItemMeta(item, transformMatrix, parentItem, ancestorIds);
            if (item.tags) {
                this.indexItemTags(item.id, item.tags);
            }

            if (parentItem && (parentItem.meta.isInHUD || parentItem.shape === 'hud')) {
                item.meta.isInHUD = true;
            }

            if (item.shape === 'component') {
                this.componentItems.push(item);
            }
            if (item.shape === 'frame_player') {
                this.framePlayers.push(item);
            }

            // only storing top-level items
            if (!parentItem) {
                this.worldItems.push(item);
            }
            if (item.shape === 'hud') {
                this.hudItems.push(item);
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

            if (isIndexable) {
                const shape = Shape.find(item.shape);
                if (shape) {
                    this.indexItemPins(item, shape);
                }
                this.indexItemOutlinePoints(item);
            }

            this.worldItemAreas.set(item.id, this.calculateItemWorldArea(item));
        }, transformMatrix, parentItem, ancestorIds, isIndexable);

        if (isIndexable) {
            this.buildDependencyItemMapFromElementSelectors(this.dependencyItemMap, dependencyElementSelectorMap);
        }

        this.itemTags = Object.keys(this._itemTagsToIds);
        this.itemTags.sort();

        this.revision = newRevision;
    }


    // Iterates recursively through all items and reindexes item tags.
    // These tags are going to be used in the element picker
    reindexTags() {
        this._itemTagsToIds = {};
        visitItems(this.scheme.items, (item, transformMatrix, parentItem, ancestorIds) => {
            if (item.tags) {
                this.indexItemTags(item.id, item.tags);
            }
        });
        this.itemTags = Object.keys(this._itemTagsToIds);
        this.itemTags.sort();
    }


    indexSingleCloneItem(referenceItemId, clonedItemId) {
        let set = null;
        if (this.itemCloneIds.has(referenceItemId)) {
            set = this.itemCloneIds.get(referenceItemId);
        } else {
            set = new Set();
            this.itemCloneIds.set(referenceItemId, set);
        }
        this.itemCloneReferenceIds.set(clonedItemId, referenceItemId);
        set.add(clonedItemId);
    }

    getItemCloneIds(referenceItemId) {
        return this.itemCloneIds.get(referenceItemId);
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
        let pointsCache = this.outlinePointsCache.get(item.id);
        if (!pointsCache) {
            pointsCache = {
                revision: -1,
                points: []
            };
            this.outlinePointsCache.set(item.id, pointsCache);
        }

        if (pointsCache.revision === item.meta.revision && pointsCache.points.length > 0) {
            forEach(pointsCache.points, p => {
                this.spatialIndex.addPoint(p[0], p[1], {
                    itemId: item.id,
                    pathDistance: p[2]
                });
            });
            return;
        }

        pointsCache.revision = item.meta.revision;

        const addPoint = (x, y, pathDistance) => {
            pointsCache.points.push([x, y, pathDistance]);
            this.spatialIndex.addPoint(x, y, {
                itemId: item.id,
                pathDistance
            });
        };


        const svgPath = this.getSvgOutlineOfItem(item);
        if (!svgPath) {
            return;
        }

        const totalLength = svgPath.getTotalLength();
        const totalPoints = Math.max(1, Math.ceil(totalLength / minSpatialIndexDistance));

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
                    pathDistance = mid * minSpatialIndexDistance;
                    if (mid > a) {
                        newSegments.push([a, mid - 1]);
                    }
                    if (mid < b) {
                        newSegments.push([mid + 1, b]);
                    }

                } else if (diff >= 1) {
                    pathDistance = b * minSpatialIndexDistance;
                    newSegments.push([a, a]);

                } else if (diff >= 0) {
                    pathDistance = a * minSpatialIndexDistance;
                }

                if (pathDistance >= 0) {
                    const point = svgPath.getPointAtLength(pathDistance);
                    const worldPoint = this.worldPointOnItem(point.x, point.y, item);
                    addPoint(worldPoint.x, worldPoint.y, pathDistance)
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
            pathDistance += minSpatialIndexDistance;
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

    indexItemTags(itemId, tags) {
        forEach(tags, tag => {
            if (!this._itemTagsToIds.hasOwnProperty(tag)) {
                this._itemTagsToIds[tag] = [];
            }
            this._itemTagsToIds[tag].push(itemId);
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

        // compensating for sparse points in the quad tree because originally,
        // when the index was created, it was using the distance of 20 between points on path
        const searchDistance = Math.max(d, minSpatialIndexDistance);


        this.spatialIndex.forEachInRange(x - searchDistance, y - searchDistance, x + searchDistance, y + searchDistance, ({itemId, pathDistance}, point) => {
            // if there are multiple points in the same item we want to select the closest ones
            // this way we late can get better precision when search for closest point on path, since we can pass the initial search range (startDistance, stopDistance)
            const squaredDistanceToPoint = (x - point.x) * (x - point.x) + (y - point.y) * (y - point.y);
            if (!items.has(itemId)) {
                items.set(itemId, {pathDistance, squaredDistanceToPoint});
            } else {
                const pathLocation = items.get(itemId);
                if (pathLocation.squaredDistanceToPoint > squaredDistanceToPoint) {
                    items.set(itemId, {pathDistance, squaredDistanceToPoint});
                }
            }
        });

        let globalPoint = {x, y};

        let foundPoint = null;
        let bestSquaredDistance = 100000;

        items.forEach((pathLocation, itemId) => {
            const item = this.findItemById(itemId);
            if (item.id === excludedId) {
                return;
            }

            if (onlyVisibleItems && !item.meta.calculatedVisibility) {
                return;
            }

            const closestPoint = this.closestPointToItemOutline(item, globalPoint, {
                startDistance: Math.max(0, pathLocation.pathDistance - searchDistance),
                stopDistance: pathLocation.pathDistance + searchDistance,
                precision: Math.min(d / 2, 0.5)
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
        return getBoundingBoxOfItems(items);
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
            updateItemRevision(item);
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
            this.svgOutlinePathCache.forceUpdate(item);
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

        if (isNaN(position)) {
            position = 0;
            if (otherItem.childItems) {
                position = otherItem.childItems.length;
            }
        }

        //checking if item is moved into its own child items. It should be protected from such move, otherwise it is going to be an eternal loop
        if (otherItem && indexOf(otherItem.meta.ancestorIds, item.id) >= 0) {
            return;
        }

        // Recalculating item area so that its world coords would match under new transform
        const topLeftWorldPoint = this.worldPointOnItem(0, 0, item);

        let previousParentWorldAngle = 0;
        let otherItemWorldAngle = 0;

        let newParentTransform = myMath.identityMatrix();
        if (otherItem) {
            newParentTransform = itemCompleteTransform(otherItem);
            otherItemWorldAngle = worldAngleOfItem(otherItem);
        }

        let previousParent = null;
        let previousParentId = null;
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            previousParent = this.findItemById(item.meta.parentId);
            if (!previousParent) {
                return;
            }
            previousParentId = previousParent.id;
            itemsArray = previousParent.childItems;
            previousParentWorldAngle = worldAngleOfItem(previousParent);
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
        if (previousParentId === newParentId && index < position) {
            // if item was located in the same parent and was above destination we need to correct its new position
            positionCorrection = -1;
        }

        newItemsArray.splice(position + positionCorrection, 0, item);

        item.area.r += previousParentWorldAngle - otherItemWorldAngle;

        const newLocalPoint = myMath.findTranslationMatchingWorldPoint(topLeftWorldPoint.x, topLeftWorldPoint.y, 0, 0, item.area, newParentTransform);
        if (newLocalPoint) {
            item.area.x = newLocalPoint.x;
            item.area.y = newLocalPoint.y;
        }

        if (previousParentId) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, previousParentId);
        }
        if (newParentId) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, newParentId);
        }
        this.listener.onSchemeChangeCommitted(this.editorId);



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
    closestPointToItemOutline(item, globalPoint, {withNormal, startDistance, stopDistance, precision}) {
        // in order to include all parent items transform into closest point finding we need to first bring the global point into local transform
        const localPoint = this.localPointOnItem(globalPoint.x, globalPoint.y, item);

        const shadowSvgPath = this.svgOutlinePathCache.get(item);
        if (!shadowSvgPath) {
            return null;
        }

        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, shadowSvgPath, {
            startDistance,
            stopDistance,
            precision
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
        const pointB = shadowSvgPath.getPointAtLength((distanceOnPath + 2) % Math.max(1, shadowSvgPath.getTotalLength()));

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
        //TODO refactor it so that it does not have to run a full reindex
        this.reindexItems();
    }

    deleteItems(items) {
        forEach(items, item => {
            this._deleteItem(item);
        })
        this.reindexItems();
    }

    _deleteItem(item) {
        if (this.outlinePointsCache.has(item.id)) {
            this.outlinePointsCache.delete(item.id);
        }
        let itemsArray = this.scheme.items;
        let parentItem = null;
        if (item.meta.parentId) {
            parentItem = this.findItemById(item.meta.parentId);
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
        if (parentItem) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, parentItem.id);
        }
    }

    deleteNonIndexableItems(items) {
        const itemSet = new Set();
        forEach(items, item => itemSet.add(item.id));

        for (let i = this.scheme.items.length - 1; i >= 0 && itemSet.size > 0; i--) {
            const item = this.scheme.items[i];
            if (this.outlinePointsCache.has(item.id)) {
                this.outlinePointsCache.delete(item.id);
            }
            if (itemSet.has(item.id)) {
                delete this.itemMap[item.id];
                this.worldItemAreas.delete(item.id);
                itemSet.delete(item.id);
                this.scheme.items.splice(i, 1);
            }
        }
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
            EditorEventBus.item.deselected.any.$emit(this.editorId);
        }
    }

    enrichItem(item) {
        enrichItemWithDefaults(item);
        if (!item.hasOwnProperty('meta')) {
            item.meta = {}
        }
        if (!item.id) {
            item.id = shortid.generate();
        }
    }

    addItem(item) {
        this.enrichItem(item);
        this.scheme.items.push(item);
        this.reindexSpecifiedItems([item]);
        if (item.shape === 'component' && item.shapeProps.kind === 'embedded') {
            this.reindexEmbeddedComponent(item);
        }
        return item;
    }

    addNonIndexableItem(item) {
        this.enrichItem(item);
        this.scheme.items.push(item);
        const nonIndexable = false;
        this.reindexSpecifiedItems([item], null, null, [], nonIndexable);
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

    /*
        Updates selection of items. This is needed if all items were replaced (e.g. document was rebased)
    */
    reselectItems() {
        const itemsForSelection = [];

        forEach(this.selectedItems, previouslySelectedItem => {
            const item = this.findItemById(previouslySelectedItem.id);
            if (item) {
                itemsForSelection.push(item);
            }
        });

        this.selectMultipleItems(itemsForSelection, false);
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
            EditorEventBus.item.selected.specific.$emit(this.editorId, item.id);
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
                EditorEventBus.item.deselected.specific.$emit(this.editorId, itemId);
            });

            this.selectItemInclusive(item);
            EditorEventBus.item.selected.specific.$emit(this.editorId, item.id);
        }
        this.updateMultiItemEditBox();
    }

    selectMultipleItems(items, inclusive) {
        if (!inclusive) {
            this.deselectAllItems();
        }
        forEach(items, item => {
            if (!this.selectedItemsMap[item.id]) {
                this.selectedItems.push(item);
                this.selectedItemsMap[item.id] = true;
                EditorEventBus.item.selected.specific.$emit(this.editorId, item.id);
            }
        });
        this.updateMultiItemEditBox();
    }

    selectAllItems() {
        this.selectMultipleItems(this._itemArray);
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
        forEach(itemIds, itemId => EditorEventBus.item.deselected.specific.$emit(this.editorId, itemId));

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

    findItemByName(name) {
        const items = this.getItems();
        for (let i = 0; i < items.length; i++) {
            if (items[i].name === name) {
                return items[i];
            }
        }
        return null;
    }

    findItemById(itemId) {
        return this.itemMap[itemId];
    }

    findItemsByTag(tag) {
        const itemIds = this._itemTagsToIds[tag];
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
                const expression = selector.substring(0, colonIndex).trim();
                if (expression === 'tag') {
                    return this.findItemsByTag(selector.substr(colonIndex + 1).trim());
                }
            }
        }
        return [];
    }

    copySelectedItems() {
        const copyBuffer = [];
        forEach(this.selectedItems, item => {
            // const itemCopy = utils.clone(item);
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

    /**
     * this is needed so that any changes applied to reference item gets immidiately reflected on all embedded component cloned items
     * @param {*} item
     * @param {*} setter
     */
    setPropertyForItem(item, setter) {
        setter(item);
        this.updatePropertyForClones(item, setter);
    }

    updatePropertyForClones(item, setter, ignoreComponentRoots) {
        const cloneIds = this.getItemCloneIds(item.id);
        if (cloneIds) {
            cloneIds.forEach(cloneId => {
                const clonedItem = this.findItemById(cloneId);
                if (!clonedItem) {
                    return;
                }
                if (ignoreComponentRoots && clonedItem.meta.componentRoot) {
                    return;
                }
                this.setPropertyForItem(clonedItem, setter);
                EditorEventBus.item.changed.specific.$emit(this.editorId, clonedItem.id);
            });
        }
    }

    updateItemClones(item) {
        const cloneIds = this.getItemCloneIds(item.id);
        if (cloneIds) {
            cloneIds.forEach(cloneId => {
                const clonedItem = this.findItemById(cloneId);
                if (clonedItem) {
                    this.updateItemClones(clonedItem);

                    const copy = utils.clone(item);

                    clonedItem.shapeProps = copy.shapeProps;
                    clonedItem.opacity = copy.opacity;
                    clonedItem.selfOpacity = copy.selfOpacity;
                    clonedItem.textSlots = copy.textSlots;
                    EditorEventBus.item.changed.specific.$emit(this.editorId, clonedItem.id);
                }
            });
        }
    }

    cloneItems(items, preserveOriginalNames, shouldIndexClones) {
        const copiedItemIds = {};
        const copiedItems = [];
        forEach(items, item => {
            // checking whether any of ancestors were already copied for this item
            // as we don't need to copy it twice
            if (!find(item.meta.ancestorIds, ancestorId => copiedItemIds[ancestorId] === 1)) {
                copiedItemIds[item.id] = 1;
                const worldPivotPoint = worldPointOnItem(item.area.px * item.area.w, item.area.py * item.area.h, item);
                const worldAngle = worldAngleOfItem(item);

                const newItem = this.copyItem(item);
                if (!preserveOriginalNames) {
                    newItem.name = this.copyNameAndMakeUnique(item.name);
                } else {
                    newItem.name = item.name;
                }

                newItem.area.r = worldAngle;

                const translation = myMath.findTranslationMatchingWorldPoint(
                    worldPivotPoint.x, worldPivotPoint.y,
                    item.area.px * item.area.w, item.area.py * item.area.h,
                    item.area, item.meta.transformMatrix
                );

                if (translation) {
                    newItem.area.x = translation.x;
                    newItem.area.y = translation.y;
                } else {
                    const worldPoint = worldPointOnItem(0, 0, item);
                    newItem.area.x = worldPoint.x;
                    newItem.area.y = worldPoint.y;
                }

                if (item.meta.componentRoot){
                    newItem.meta.componentRoot = true;
                }

                copiedItems.push(newItem);
            }
        });

        // collecting id conversions so that later it could be used for converting attached connectors
        const idOldToNewConversions = new Map();
        traverseItems(copiedItems, item => {
            idOldToNewConversions.set(item.meta.oldId, item.id);

            if (shouldIndexClones) {
                this.indexSingleCloneItem(item.meta.oldId, item.id);
            }
        });

        //TODO OPTIMIZE: we don't need to execute code below for a scheme container in edit mode
        this.fixItemsReferences(copiedItems, idOldToNewConversions);
        return copiedItems;
    }

    /**
     * Traverses all items and replaces all outdated references to the one provided in idsMapping argument
     * @param {Arrat<Item>} items - items with new ids
     * @param {Map<String, String>} idsMapping - map of old to new ids
     */
    fixItemsReferences(items, idsMapping) {
        // recreates element selector in case the source or destination was also copied together with it
        const rebuildElementSelector = (elementSelector) => {
            if (elementSelector && elementSelector.indexOf('#') === 0) {
                const oldId = elementSelector.substr(1);
                if (idsMapping.has(oldId)) {
                    return '#' + idsMapping.get(oldId);
                }
            }
            return elementSelector;
        };

        traverseItems(items, item => {
            if (item.shape === 'connector') {
                item.shapeProps.sourceItem = rebuildElementSelector(item.shapeProps.sourceItem);
                item.shapeProps.destinationItem = rebuildElementSelector(item.shapeProps.destinationItem);
            }

            if (item.shape === 'frame_player') {
                forEach(item.shapeProps.animations, animation => {
                    if (animation.kind === 'item') {
                        animation.itemId = idsMapping.get(animation.itemId);
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
        const copiedIds = new Set();

        forEach(copiedItems, item => {
            copiedIds.add(item.id);
            item.locked = false;
            this.scheme.items.push(item);
        });

        // doing the selection afterwards so that item has all meta transform calculated after re-indexing
        // and its edit box would be aligned with the item
        forEach(copiedItems, item => {
            this.selectItem(item, true);

            // the following code address issue: https://github.com/ishubin/schemio/issues/571
            if (item.shape === 'connector') {
                const isAttachedToCopiedItem = (itemSelector) => {
                    if (itemSelector[0] === '#') {
                        const itemId = itemSelector.substring(1);
                        return copiedIds.has(itemId);
                    }
                    return true;
                };
                if (item.shapeProps.sourceItem && !isAttachedToCopiedItem(item.shapeProps.sourceItem)) {
                    item.shapeProps.sourceItem = null;
                }
                if (item.shapeProps.destinationItem && !isAttachedToCopiedItem(item.shapeProps.destinationItem)) {
                    item.shapeProps.destinationItem = null;
                }
            }
        });

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
            if (field === 'childItems' || field === '_childItems') {
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

        // storing ids of dragged or rotated items in a map
        // this way we will be able to figure out whether any items ancestors were dragged already
        // so that we can skip dragging or rotating an item
        const changedItemIds = new Set();

        forEach(multiItemEditBox.items, item => {
            changedItemIds.add(item.id)


            // checking whether the item in the box list is actually a descendant of the other item that was also in the same box
            // this is needed to build proper reindexing of items and not to double rotate child items in case their parent was already rotated
            const parentWasAlreadyUpdated = (item.meta && item.meta.ancestorIds && find(item.meta.ancestorIds, id => changedItemIds.has(id)));

            const shouldSkipItemUpdate = parentWasAlreadyUpdated && (context.moved || context.rotated) && !context.resized;

            if (!item.locked && !shouldSkipItemUpdate) {
                // calculating new position of item based on their pre-calculated projections
                const itemProjection = multiItemEditBox.itemProjections[item.id];

                // this condition is needed becase there can be a situation when edit box is first rotated and only then resized
                // in this case we should skip rotation of child items if their parents were already rotated.
                if (!parentWasAlreadyUpdated) {
                    item.area.r = itemProjection.r + multiItemEditBox.area.r;
                }

                const projectBack = (point) => {
                    return myMath.worldPointInArea(point.x * multiItemEditBox.area.w, point.y * multiItemEditBox.area.h, multiItemEditBox.area);
                };

                let parentTransform = myMath.identityMatrix();
                const parent = this.findItemById(item.meta.parentId);
                if (parent) {
                    parentTransform = itemCompleteTransform(parent);
                }

                const worldTopLeft = projectBack(itemProjection.topLeft);

                const newPoint = myMath.findTranslationMatchingWorldPoint(worldTopLeft.x, worldTopLeft.y, 0, 0, item.area, parentTransform);

                if (newPoint) {
                    item.area.x = newPoint.x;
                    item.area.y = newPoint.y;
                }

                // recalculated width and height only in case multi item edit box was resized
                // otherwise it doesn't make sense
                if (context.resized) {
                    const worldBottomRight = projectBack(itemProjection.bottomRight);
                    const localBottomRight = localPointOnItem(worldBottomRight.x, worldBottomRight.y, item);
                    item.area.w = Math.max(0, localBottomRight.x);
                    item.area.h = Math.max(0, localBottomRight.y);

                    if (item.shape === 'component' && item.shapeProps.kind === 'embedded') {
                        this.readjustComponentContainerRect(item);
                    }
                }

                this.updateChildTransforms(item);

                // changing item revision so that its shape gets recomputed
                updateItemRevision(item);

                this.readjustItemAndDescendants(item.id, isSoft, context, precision);
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area');

                this.updatePropertyForClones(item, clone => {
                    clone.area.x = item.area.x;
                    clone.area.y = item.area.y;
                    clone.area.w = item.area.w;
                    clone.area.h = item.area.h;
                    clone.area.r = item.area.r;
                    clone.area.px = item.area.px;
                    clone.area.py = item.area.py;
                }, true);
            }
        });

        EditorEventBus.editBox.updated.$emit(this.editorId);
    }

    /**
     * Searches for all item names and adds numeric index so that it becomes unique in the scheme
     * @param {string} name
     */
    generateUniqueName(name) {
        const itemNames = map(this.getItems(), item => item.name);
        return giveUniqueName(name, itemNames);
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

        const pivotPoint = {
            x: 0.5,
            y: 0.5
        };

        if (items.length === 1) {
            // we want the item edit box to be aligned with item only if that item was selected
            const   p0 = this.worldPointOnItem(0, 0, items[0]),
                    p1 = this.worldPointOnItem(items[0].area.w, 0, items[0]),
                    p3 = this.worldPointOnItem(0, items[0].area.h, items[0]);

            // angle has to be calculated with taking width inot account
            // if the width is too small (e.g. vertical path line), then the computed angle will be incorrect
            let angle = 0;
            if (myMath.tooSmall(items[0].area.w)) {
                angle = myMath.fullAngleForVector(p3.x - p0.x, p3.y - p0.y) * 180 / Math.PI - 90;
            } else {
                angle = myMath.fullAngleForVector(p1.x - p0.x, p1.y - p0.y) * 180 / Math.PI;
            }

            area = {
                x: p0.x,
                y: p0.y,
                r: angle,
                w: myMath.distanceBetweenPoints(p0.x, p0.y, p1.x, p1.y),
                h: myMath.distanceBetweenPoints(p0.x, p0.y, p3.x, p3.y),
                px: 0,
                py: 0,
                sx: 1.0,
                sy: 1.0
            };
            pivotPoint.x = items[0].area.px;
            pivotPoint.y = items[0].area.py;


        } else {
            // otherwise item edit box area will be an average of all other items
            area = this.createMultiItemEditBoxAveragedArea(items);
        }

        const itemProjections = {};

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

            const worldTopLeftPoint = this.worldPointOnItem(0, 0, item);
            const worldBottomRightPoint = this.worldPointOnItem(item.area.w, item.area.h, item);

            const projectPoint = (x, y) => {
                const localPoint = myMath.localPointInArea(x, y, area);
                if (area.w > 0) {
                    localPoint.x = localPoint.x / area.w;
                }
                if (area.h > 0) {
                    localPoint.y = localPoint.y / area.h;
                }
                return localPoint;
            };

            itemProjections[item.id] = {
                topLeft: projectPoint(worldTopLeftPoint.x, worldTopLeftPoint.y),
                bottomRight: projectPoint(worldBottomRightPoint.x, worldBottomRightPoint.y),
                // the following angle correction is needed in case only one item is selected,
                // in that case the initial edit box area might have a starting angle that matches item area
                // in all other cases the initial angle will be 0
                r: item.area.r - area.r,
            };

            if (item.shape === 'path') {
                // storing original points so that they can be readjusted in case the item is resized
                itemData[item.id].originalCurvePaths = utils.clone(item.shapeProps.paths);
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
            pivotPoint,

            // the sole purpose of this point is for the user to be able to rotate edit box via number textfield in Position panel
            // because there we have to readjust edit box position to make sure its pivot point stays in the same place relatively to the world
            // I tried to rewrite the entire edit box calculation to make it simpler. I tried matching pivot point in edit box area to the ones of the item
            // It turned out a lot better in the beginning, but later I discovered that resizing of edit box becomes wonky and the same problem appears
            // when user  types x, y, width or height in number textfield in Position panel.
            // So thats why I decided to keep it as is and to perform all the trickery only for rotation control.
            worldPivotPoint: myMath.worldPointInArea(pivotPoint.x * area.w, pivotPoint.y * area.h, area)
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
     * @param {Item} area  - item that it needs to fit into another parent item (should be in world transform)
     * @param {Function} itemConsiderCallback - callback function which should return true for specified item if it should be considered
     * @returns {Item}
     */
    findItemSuitableForParent(item, itemConsiderCallback) {
        const area = this.calculateItemWorldArea(item);
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
        this.prepareFrameAnimationsForItems();
    }

    prepareFrameAnimationsForItems() {
        this.frameAnimations = {};
        forEach(this.framePlayers, item => {
            const compiledAnimations = compileAnimations(item, this);
            this.frameAnimations[item.id] = new FrameAnimation(item.shapeProps.fps, item.shapeProps.totalFrames, compiledAnimations);
        });
    }

    getFrameAnimation(itemId) {
        return this.frameAnimations[itemId];
    }

    alignItemsHorizontally(items) {
        if (items.length < 2) {
            return;
        }

        let centerSum = 0;
        const worldBoxes = [];
        forEach(items, item => {
            const bbox = this.getBoundingBoxOfItems([item]);
            worldBoxes.push({ bbox, item });

            centerSum += bbox.y + bbox.h/2;
        });

        const center = centerSum / worldBoxes.length;

        worldBoxes.sort((a, b) => {
            return a.bbox.x - b.bbox.x;
        });

        let marginSum = 0;
        let properMarginCount = 0;

        for(let i = 0; i < worldBoxes.length - 1; i++) {
            const margin = worldBoxes[i+1].bbox.x - (worldBoxes[i].bbox.x + worldBoxes[i].bbox.w);
            if (margin > 0) {
                marginSum += margin;
                properMarginCount++;
            }
        }

        const finalMargin = marginSum / Math.max(1, properMarginCount);

        let prevWorldOffset = worldBoxes[0].bbox.x;

        for(let i = 0; i < worldBoxes.length; i++) {
            const item = worldBoxes[i].item;
            let dx = 0;
            if (i > 0) {
                dx = prevWorldOffset + finalMargin - worldBoxes[i].bbox.x;
            }
            const dy = center - worldBoxes[i].bbox.y - worldBoxes[i].bbox.h / 2;

            let parentTransform = myMath.identityMatrix();
            if (item.meta.parentId) {
                const parent = this.findItemById(item.meta.parentId);
                if (parent) {
                    parentTransform = itemCompleteTransform(parent);
                }
            }
            const correction = myMath.transformVector(parentTransform, dx, dy);

            prevWorldOffset = dx + worldBoxes[i].bbox.x + worldBoxes[i].bbox.w;

            item.area.x += correction.x;
            item.area.y += correction.y;
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area');
        }
        this.listener.onSchemeChangeCommitted(this.editorId);
        this.updateMultiItemEditBox();
    }

    alignItemsVertically(items) {
        if (items.length < 2) {
            return;
        }

        let centerSum = 0;
        const worldBoxes = [];
        forEach(items, item => {
            const bbox = this.getBoundingBoxOfItems([item]);
            worldBoxes.push({ bbox, item });

            centerSum += bbox.x + bbox.w/2;
        });

        const center = centerSum / worldBoxes.length;

        worldBoxes.sort((a, b) => {
            return a.bbox.y - b.bbox.y;
        });

        let marginSum = 0;
        let properMarginCount = 0;

        for(let i = 0; i < worldBoxes.length - 1; i++) {
            const margin = worldBoxes[i+1].bbox.y - (worldBoxes[i].bbox.y + worldBoxes[i].bbox.h);
            if (margin > 0) {
                marginSum += margin;
                properMarginCount++;
            }
        }

        const finalMargin = marginSum / Math.max(1, properMarginCount);

        let prevWorldOffset = worldBoxes[0].bbox.y;

        for(let i = 0; i < worldBoxes.length; i++) {
            const item = worldBoxes[i].item;
            let dy = 0;
            if (i > 0) {
                dy = prevWorldOffset + finalMargin - worldBoxes[i].bbox.y;
            }
            const dx = center - worldBoxes[i].bbox.x - worldBoxes[i].bbox.w / 2;

            let parentTransform = myMath.identityMatrix();
            if (item.meta.parentId) {
                const parent = this.findItemById(item.meta.parentId);
                if (parent) {
                    parentTransform = itemCompleteTransform(parent);
                }
            }
            const correction = myMath.transformVector(parentTransform, dx, dy);

            prevWorldOffset = dy + worldBoxes[i].bbox.y + worldBoxes[i].bbox.h;

            item.area.x += correction.x;
            item.area.y += correction.y;
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area');
        }
        this.listener.onSchemeChangeCommitted(this.editorId);
        this.updateMultiItemEditBox();
    }

    alignItemsHorizontallyInParent(items) {
        this._alignItemsWith(items, (item, correction) => {
            item.area.x += correction.x;
        });
    }

    alignItemsVerticallyInParent(items) {
        this._alignItemsWith(items, (item, correction) => {
            item.area.y += correction.y;
        });
    }

    alignItemsCenteredInParent(items) {
        this._alignItemsWith(items, (item, correction) => {
            item.area.x += correction.x;
            item.area.y += correction.y;
        });
    }

    generateItemFromTemplate(template, templateRef, args, width, height) {
        if (!args) {
            args = {};
            // getting default values for template args
            if (template.args) {
                forEach(template.args, (arg, argName) => {
                    args[argName] = arg.value;
                });
            }
        }

        const result = processJSONTemplate({'$-eval': template.init || [], item: template.item}, {
            ...args,
            width : width || template.item.area.w,
            height: height || template.item.area.h
        });

        const item = result.item;

        traverseItems([item], it => {
            if (!it.args) {
                it.args = {};
            }
            // Storing id of every item in its args so that later, when regenerating templated item that is already in scene,
            // we can reconstruct other user made items that user attached to templated items
            it.args.templatedId = it.id;
            it.args.templated = true;
            enrichItemWithDefaults(it);
        });

        const [clonnedItem] = this.cloneItems([item], true, false);

        clonnedItem.args.templateRef = templateRef;
        clonnedItem.args.templateArgs = args;
        return clonnedItem;
    }

    regenerateTemplatedItem(item, template, templateRef, args) {
        const foreignItems = new Map();
        this.findForeignItemsInTemplate(templateRef, item, null, (it, parentItem) => {
            if (!parentItem || !parentItem.args || !parentItem.args.templated || !parentItem.args.templatedId) {
                return;
            }
            const id = parentItem.args.templatedId;

            if (!foreignItems.has(id)) {
                foreignItems.set(id, []);
            }
            foreignItems.set(id, foreignItems.get(id).concat([it]));
        });
        const result = processJSONTemplate({'$-eval': template.init || [], item: template.item}, {...args, width: item.area.w, height: item.area.h});
        const templatedItem = result.item;
        templatedItem.args = {templateRef: templateRef, templateArgs: utils.clone(args)};

        traverseItems([templatedItem], it => {
            if (!it.args) {
                it.args = {};
            }
            it.args.templated = true;
            it.args.templatedId = it.id;
        });

        this.reattachForeignItems(templateRef, templatedItem, foreignItems);
        return templatedItem;
    }

    findForeignItemsInTemplate(templateRef, item, parentItem, callback) {
        if (!item.args || !item.args.templated || (item.args.templateRef && item.args.templateRef !== templateRef)) {
            callback(item, parentItem);
            return;
        }
        if (!item.childItems) {
            return;
        }
        item.childItems.forEach(it => {
            this.findForeignItemsInTemplate(templateRef, it, item, callback);
        });
    }

    /**
     *
     * @param {*} templateRef
     * @param {*} item
     * @param {Map} foreignItems
     */
    reattachForeignItems(templateRef, item, foreignItems) {
        if (!item.args || !item.args.templatedId || (item.args.templateRef && item.args.templateRef !== templateRef)) {
            return;
        }

        if (item.childItems) {
            item.childItems.forEach(childItem => {
                this.reattachForeignItems(templateRef, childItem, foreignItems);
            });
        }
        const tId = item.args.templatedId;
        if (foreignItems.has(tId)) {
            if (!item.childItems) {
                item.childItems = [];
            }
            const items = foreignItems.get(tId);
            items.forEach(foreignItem => item.childItems.push(foreignItem));
        }
    }

    _alignItemsWith(items, correctionCallback) {
        const itemsByParent = this._breakItemsByParents(items);
        itemsByParent.forEach((items, parentId) => {
            const correction = this._findCenteringCorrection(items, parentId);
            forEach(items, item => {
                correctionCallback(item, correction);
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area');
            });
        });
        this.listener.onSchemeChangeCommitted(this.editorId);
        this.updateMultiItemEditBox();
    }

    _findCenteringCorrection(items, parentId) {
        if (items.length === 0) {
            return {x: 0, y: 0};
        }
        const parentItem = this.findItemById(parentId);
        if (!parentItem) {
            return;
        }

        let minX = items[0].area.x;
        let maxX = items[0].area.x;
        let minY = items[0].area.y;
        let maxY = items[0].area.y;

        forEach(items, item => {
            minX = Math.min(minX, item.area.x);
            maxX = Math.max(maxX, item.area.x + item.area.w);
            minY = Math.min(minY, item.area.y);
            maxY = Math.max(maxY, item.area.y + item.area.h);
        });

        const leftMargin = minX;
        const rightMargin = parentItem.area.w - maxX;

        const topMargin = minY;
        const bottomMargin = parentItem.area.h - maxY;

        return {
            x: (rightMargin - leftMargin) / 2,
            y: (bottomMargin - topMargin) / 2
        };
    }

    /**
     * @param {Array} items
     * @returns {Map}
     */
    _breakItemsByParents(items) {
        const itemsByParent = new Map();
        forEach(items, item => {
            const parentId = item.meta.parentId;
            if (parentId) {
                if (!itemsByParent.has(parentId)) {
                    itemsByParent.set(parentId, []);
                }
                itemsByParent.get(parentId).push(item);
            }
        });
        return itemsByParent;
    }
}


export default SchemeContainer;
