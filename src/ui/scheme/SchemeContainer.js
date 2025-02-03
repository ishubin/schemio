/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {forEach, map, findIndex, find, indexOf} from '../collections';
import { SpatialIndex } from '../SpatialIndex';

import '../typedef';
import {giveUniqueName} from '../collections';
import myMath from '../myMath.js';
import utils from '../utils.js';
import shortid from 'shortid';
import Shape from '../components/editor/items/shapes/Shape.js';
import { traverseItems, defaultItemDefinition, defaultItem, findFirstItemBreadthFirst} from './Item';
import { enrichItemWithDefaults } from './ItemFixer';
import { enrichSchemeWithDefaults } from './Scheme';
import { Debugger, Logger } from '../logger';
import Functions from '../userevents/functions/Functions';
import { compileAnimations, FrameAnimation } from '../animations/FrameAnimation';
import { enrichObjectWithDefaults } from '../../defaultify';
import AnimationFunctions from '../animations/functions/AnimationFunctions';
import EditorEventBus from '../components/editor/EditorEventBus';
import { compileItemTemplate, compileTemplateFromDoc, generateItemFromTemplate, regenerateTemplatedItem, regenerateTemplatedItemWithPostBuilder } from '../components/editor/items/ItemTemplate.js';
import { worldAngleOfItem, worldPointOnItem, localPointOnItem, getBoundingBoxOfItems, itemCompleteTransform, getItemOutlineSVGPath } from './ItemMath.js';
import { autoLayoutGenerateEditBoxRuleGuides, generateItemAreaByAutoLayoutRules } from './AutoLayout.js';
import Events from '../userevents/Events.js';
import { compileActions } from '../userevents/Compiler.js';

const log = new Logger('SchemeContainer');

// for now putting it here until I figure out a more elegant way of indexing item outline points
// There is a problem when the items are scaled too litle and when user zooms in to that downscaled item
// In that case it would not be able to find points in the quad tree as the generated points are too sparse
// Therefore we need to compensate for that and use this const value as the minimum search range
const minSpatialIndexDistance = 20;

// When connector is moved by an edit box or if its points are moved partially by edit box
// and it tries to reattach it to previously attached item, there should be some threshold that gives
// user a possibility to completelly dettach the connector
const connectorStickyThreshold = 50;


const WORLD_AREA = { x: 0, y: 0, w: 1, h: 1, r: 0, sx: 1, sy: 1, px: 0, py: 0 };

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


export function isItemInHUD(item) {
    return item.shape === 'hud' || item.meta.isInHUD;
}


/**
 * This function is only used for calculating bounds of reference items
 * so that they can be properly fit inside of an component
 * @param {Array} items
 * @returns {Area}
 */
export function getLocalBoundingBoxOfItems(items) {
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

function createEditBoxAveragedArea(items) {
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
            const p = worldPointOnItem(localPoint.x, localPoint.y, item);
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
 * Copies templateRef to item meta so that it is easier to access this information in the editor components
 * @param {Item} item
 * @param {String} templateRef
 */
function markTemplateRef(item, templateRef) {
    if (!item.args || !item.args.templated || (item.args.templateRef && item.args.templateRef !== templateRef)) {
        return;
    }
    _markTemplateRef([item], templateRef, item.id);
}

/**
 * Copies templateRef to item meta so that it is easier to access this information in the editor components
 * @param {Array<Item>} items
 * @param {String} templateRef
 * @param {String} templateRootId
 */
function _markTemplateRef(items, templateRef, templateRootId) {
    items.forEach(item => {
        if (!item.args || !item.args.templated || (item.args.templateRef && item.args.templateRef !== templateRef)) {
            return;
        }

        if (!item.meta) {
            item.meta = {};
        }

        item.meta.templated = true;
        item.meta.templateRef = templateRef;
        item.meta.templateRootId = templateRootId;

        if (Array.isArray(item.childItems)) {
            _markTemplateRef(item.childItems, templateRef, templateRootId);
        }
        if (Array.isArray(item._childItems)) {
            _markTemplateRef(item._childItems, templateRef, templateRootId);
        }
    })
}

/**
 *
 * @returns {Item}
 */
export function createDefaultRectItem() {
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
     * @param {SchemioDoc} scheme
     * @param {String} editorId
     * @param {String} mode - either 'view' or 'edit'
     * @param {*} apiClient
     * @param {*} listener
     */
    constructor(scheme, editorId, mode, apiClient, listener) {
        Debugger.register('SchemioContainer', this);

        this.id = shortid.generate();
        this.scheme = scheme;
        this.editorId = editorId;
        this.mode = mode;
        this.apiClient = apiClient;
        this.listener = listener;
        this.screenTransform = {x: 0, y: 0, scale: 1.0};
        this.screenSettings = {width: 700, height: 400, x1: -1000000, y1: -1000000, x2: 1000000, y2: 1000000};
        /**
         * array of items that were selected
         * @type {Array<Item>} @private */
        this.selectedItems = [];

        /**
         * array of seleced connector points
         * @type {Array<ConnectorPointRef>} @private */
        this.selectedConnectorPoints = [];

        /**
         * Contains compiled templates for all templates used in the scene.
         * Keep in mind that we only need this in edit mode.
         * @type {Map<String, CompiledItemTemplate>} */
        this.compiledTemplates = new Map();

        // used to quick access to item selection state
        this.selectedItemsMap = {};
        this.activeBoundaryBox = null;
        this.itemMap = {};
        this._itemArray = []; // stores all flatten items (all sub-items are stored as well). it only stores indexable items
        this.revision = 0;
        this.hudItems = []; //used for storing hud items that are supposed to be rendered in the viewport transform
        this.worldItems = []; // used for storing top-level items with default area
        this.worldItemAreas = new Map(); // used for storing rough item bounding areas in world transform (used for finding suitable parent)
        this.dependencyItemMap = {}; // used for looking up items that should be re-adjusted once the item area is changed (e.g. path item can be attached to other items)

        this.itemCloneIds = new Map(); // stores Set of item ids that were cloned and attached to the component from the reference item
        this.itemCloneReferenceIds = new Map(); // stores ids of reference items that were used for cloned items

        this._itemTagsToIds = {}; // used for quick access to item ids via item tags
        this.itemTags = []; // stores tags from all items
        this.framePlayers = []; // stores all frame players so that later it can prepare all animations

        this.spatialIndex = new SpatialIndex(); // used for indexing item path points
        this.pinSpatialIndex = new SpatialIndex(); // used for indexing item pins
        this.connectorSpatialIndex = new SpatialIndex(); // stores connector points so that it is possible to multi-select individual points of connectors

        // contains mapping of frame player id to its compiled animations
        this.framesAnimations = {};

        this.componentItems = [];

        // objects and functions that were initialized in the main script during scene initialization
        this.mainScopeData = null;

        this.svgOutlinePathCache = new ItemCache(getItemOutlineSVGPath);

        // Shadow transform is used in external components and it represents the complete transformation of
        // the component item root. This is needed to correctly convert child component items
        // to the global world transform (e.g. when dragging items in view mode,
        // or converting mouse coords to local item coords)
        this.shadowTransform = null;

        // stores all snapping rules for items (used when user drags an item)
        this.relativeSnappers = {
            horizontal: [],
            vertical: [],
        };

        // Used to drag, resize and rotate multiple items
        // Since both the SvgEditor component and StateDragItem state needs access to it, it is easier to keep it here
        this.editBox = null;

        enrichSchemeWithDefaults(this.scheme);

        // used for triggering the full reindex in a delayed manner
        // this is used in order to optimize performance when user is changing templated item arguments
        this.reindexTimeoutId = null;
        this.reindexItems();
    }

    getItemNames() {
        const names = Array.from(new Set(this._itemArray.map(item => item.name)));
        names.sort();
        return names;
    }

    setShadowTransform(shadowTransform) {
        this.shadowTransform = shadowTransform;
    }

    hasDependencyOnItem(itemId, potentialDependencyItemId) {
        const dependencyIds = this.dependencyItemMap[itemId];
        if (!dependencyIds || dependencyIds.length === 0) {
            return false;
        }

        for (let i = 0; i < dependencyIds.length; i++) {
            if (dependencyIds[i] === potentialDependencyItemId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Recursively goes through all child items and updates their calculated visibility based on the mainItem visibility.
     * This is needed when items visiblity is changed by either `hide`, `show`, `set` function or by frame player
     * @param {Item} mainItem
     */
    updateVisibility(mainItem) {
        const parent = mainItem.meta && mainItem.meta.parentId ? this.findItemById(mainItem.meta.parentId) : null;
        const parentVisible = parent ? parent.visible : true;
        const parentOpacity = parent ? parent.opacity : 100;

        traverseItems([mainItem], (item, parentItem) => {
            if (item.id === mainItem.id) {
                item.meta.calculatedVisibility = parentVisible && parentOpacity > 0 && item.visible && item.opacity > 0;
            } else {
                item.meta.calculatedVisibility = parentItem.visible && parentItem.opacity > 0 && item.visible && item.opacity > 0;
            }
        });
    }

    /**
     * Recalculates transform for each child item of specified item.
     * It is needed when user drags an item that has sub-items.
     * @param {Item} mainItem
     */
    updateChildTransforms(mainItem) {
        if (!mainItem.childItems) {
            return;
        }
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

    /**
     *
     * @param {UserEventBus} userEventBus
     * @returns {Set<String>} - ids of items that are subscribed to init event
     */
    indexUserEvents(userEventBus, compilerErrorCallback) {
        return this.indexUserEventsForItems(this.scheme.items, userEventBus, compilerErrorCallback);
    }

    /**
     * @param {Array<Item>} items
     * @param {UserEventBus} userEventBus
     * @returns {Set<String>} - ids of items that are subscribed to init event
     */
    indexUserEventsForItems(items, userEventBus, compilerErrorCallback) {
        const itemsForInit = new Set();
        traverseItems(items, item => {
            if (Array.isArray(item.classes)) {
                item.classes.forEach(itemClass => {
                    const classDef = this.findClassById(itemClass.id);
                    if (!classDef) {
                        return;
                    }
                    if (classDef.shape && classDef.shape !== 'all' && classDef.shape !== item.shape) {
                        return false;
                    }

                    const itemClassArgs = {...itemClass.args};
                    const classArgDefs = {};
                    if (Array.isArray(classDef.args)) {
                        classDef.args.forEach(argDef => {
                            classArgDefs[argDef.name] = argDef;
                            if (!itemClassArgs.hasOwnProperty(argDef.name)) {
                                itemClassArgs[argDef.name] = argDef.value;
                            }
                        });
                    }

                    classDef.events.forEach(event => {
                        const eventCallback = compileActions(this, userEventBus, item, event.actions, itemClassArgs, classArgDefs, compilerErrorCallback);
                        if (event.event === Events.standardEvents.init.id) {
                            itemsForInit.add(item.id);
                        }
                        userEventBus.subscribeItemEvent(item.id, item.name, event.event, eventCallback);
                    });
                });
            }

            const noClassArgs = {};
            const noClassDefArgs = {};

            if (item.behavior && Array.isArray(item.behavior.events)) {
                item.behavior.events.forEach(event => {
                    const eventCallback = compileActions(this, userEventBus, item, event.actions, noClassArgs, noClassDefArgs, compilerErrorCallback);
                    if (event.event === Events.standardEvents.init.id) {
                        itemsForInit.add(item.id)
                    }
                    userEventBus.subscribeItemEvent(item.id, item.name, event.event, eventCallback);
                });
            }
        });

        return itemsForInit;
    }


    /**
     * @param {String} classId
     * @returns {ClassDef}
     */
    findClassById(classId) {
        if (!Array.isArray(this.scheme.scripts.classes)) {
            return null;
        }
        for (let i = 0; i < this.scheme.scripts.classes.length; i++) {
            if (this.scheme.scripts.classes[i].id === classId) {
                return this.scheme.scripts.classes[i];
            }
        }
        return null;
    }

    delayFullReindex() {
        if (this.reindexTimeoutId) {
            clearTimeout(this.reindexTimeoutId);
        }
        this.reindexTimeoutId = setTimeout(() => {
            this.reindexItems();
            this.reindexTimeoutId = null;
        }, 1000);
    }

    reindexItems() {
        log.info('reindexItems()', this);
        log.time('reindexItems');

        this.itemMap = {};
        this.itemsByName = new Map();
        this._itemArray = [];
        this.itemsByName = new Map();
        this.worldItems = [];
        this._itemTagsToIds = {};
        this.worldItemAreas = new Map();
        this.relativeSnappers.horizontal = [];
        this.relativeSnappers.vertical = [];
        this.spatialIndex = new SpatialIndex();
        this.pinSpatialIndex = new SpatialIndex();
        this.connectorSpatialIndex = new SpatialIndex();
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

        this.itemTags = Object.keys(this._itemTagsToIds);
        this.itemTags.sort();

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


    attachItemsToComponentItem(componentItem, referenceItems) {
        if (!referenceItems) {
            return;
        }
        const preserveOriginalNames = true;
        const shouldIndexClones = true;

        const childItems = this.cloneItems(referenceItems, preserveOriginalNames, shouldIndexClones);

        const bBox = getLocalBoundingBoxOfItems(referenceItems);
        forEach(childItems, item => {
            item.area.x -= bBox.x;
            item.area.y -= bBox.y;

            // resetting the visiblity of component root items
            // so that the reference item can be hidden and not effect the component
            item.opacity = 100;
            item.selfOpacity = 100;
            item.visible = true;
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
        overlayRect.name = 'Overlay container';

        const rectItem = createDefaultRectItem();
        rectItem.shape = 'dummy';
        rectItem.selfOpacity = 0;
        rectItem.id = shortid.generate();
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

            this.itemsByName.set(item.name, item);

            if (item.args && item.args.templateRef && item.args.templated) {
                markTemplateRef(item, item.args.templateRef);
                if (this.mode === 'edit') {
                    this.fetchAndCompileTemplate(item.args.templateRef);
                }
            }

            enrichItemWithDefaults(item);
            this.enrichItemMeta(item, transformMatrix, parentItem, ancestorIds);
            if (item.tags) {
                this.indexItemTags(item.id, item.tags);
            }

            if (parentItem && (parentItem.meta.isInHUD || parentItem.shape === 'hud')) {
                item.meta.isInHUD = true;
            }

            if (item.behavior.dragging !== 'none') {
                item.cursor = 'grab';
                item.meta.ancestorDraggableId = null;
            } else if (parentItem) {
                if (parentItem.behavior.dragging !== 'none') {
                    item.meta.ancestorDraggableId = parentItem.id;
                    item.cursor = 'grab';
                } else if (parentItem.meta.ancestorDraggableId) {
                    item.meta.ancestorDraggableId = parentItem.meta.ancestorDraggableId;
                    item.cursor = 'grab';
                }
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

            if (item.shape === 'connector' && item.shapeProps.autoAttach) {
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

            if (isIndexable && this.mode === 'edit') {
                const shape = Shape.find(item.shape);
                if (shape) {
                    this.indexItemPins(item, shape);
                }
                this.indexItemOutlinePoints(item);
            }

            if (item.shape === 'connector' && this.mode === 'edit') {
                this.indexConnectorPoints(item);
            }

            this.worldItemAreas.set(item.id, this.calculateItemWorldArea(item));
        }, transformMatrix, parentItem, ancestorIds, isIndexable);

        if (isIndexable) {
            this.buildDependencyItemMapFromElementSelectors(this.dependencyItemMap, dependencyElementSelectorMap);
        }

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

    fetchAndCompileTemplate(templateRef) {
        if (this.compiledTemplates.has(templateRef)) {
            return;
        }

        this.getTemplate(templateRef)
        .then(template => {
            this.compiledTemplates.set(templateRef, template);
        })
        .catch(err => {
            console.error(`Failed to compile template: ${templateRef}`, err);
        });
    }

    /**
     * @param {String} templateRef
     * @returns {Promise<CompiledItemTemplate>}
     */
    getTemplate(templateRef) {
        if (this.compiledTemplates.has(templateRef)) {
            return Promise.resolve(this.compiledTemplates.get(templateRef));
        } else {
            let promise = null;
            if (templateRef.startsWith('#doc:')) {
                const docId = templateRef.substring(5);
                promise = this.apiClient.getScheme(docId)
                .then(doc => {
                    return compileTemplateFromDoc(doc.scheme, docId, this.editorId);
                });
            } else {
                promise = this.apiClient.getTemplate(templateRef)
                .then(templateDef => {
                    return compileItemTemplate(this.editorId, templateDef, templateRef);
                });
            }
            return promise.then(template => {
                this.compiledTemplates.set(templateRef, template);
                return template;
            }).catch(err => {
                console.error(`Failed to compile template: ${templateRef}`, err);
                throw err;
            });
        }
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
        const worldPoints = map(points, point => worldPointOnItem(point.x, point.y, item));

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

    getItemWorldPinPoint(item, pinId) {
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        const pins = shape.getPins(item);
        if (!pins) {
            return null;
        }
        const pinPoint = pins[pinId];
        if (!pinPoint) {
            return null;
        };
        const worldPinPoint = worldPointOnItem(pinPoint.x, pinPoint.y, item);

        // we need to recalculate pins as the item might be rotated
        if (pinPoint.nx || pinPoint.ny) {
            const p0 = worldPointOnItem(0, 0, item);
            const p1 = worldPointOnItem(pinPoint.nx, pinPoint.ny, item);

            worldPinPoint.nx = p1.x - p0.x;
            worldPinPoint.ny = p1.y - p0.y;
        }
        return worldPinPoint;
    }

    indexConnectorPoints(item) {
        if (!Array.isArray(item.shapeProps.points)) {
            return;
        }
        item.shapeProps.points.forEach((localPoint, pointIdx) => {
            const p = worldPointOnItem(localPoint.x, localPoint.y, item);
            this.connectorSpatialIndex.addPoint(p.x, p.y, {
                itemId: item.id,
                pointIdx
            });
        });
    }

    /**
     * @param {Area} box
     * @param {Boolean} inclusive
     */
    selectByBoundaryBox(box, inclusive) {
        if (!inclusive) {
            this.deselectAllItems();
        }
        const selectedItems = [];
        const fullySelectedItemIds = new Map();

        forEach(this.getItems(), item => {
            const points = [
                {x: 0, y: 0},
                {x: item.area.w, y: 0},
                {x: item.area.w, y: item.area.h},
                {x: 0, y: item.area.h},
            ];

            let isInArea = true;

            for(let i = 0; i < points.length && isInArea; i++) {
                const wolrdPoint = worldPointOnItem(points[i].x, points[i].y, item);

                isInArea = myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box);
            }

            if (isInArea) {
                selectedItems.push(item);
                fullySelectedItemIds.set(item.id);
            }
        });

        this.connectorSpatialIndex.forEachInRange(box.x, box.y, box.x + box.w, box.y + box.h, point => {
            if (!fullySelectedItemIds.has(point.itemId)) {
                this.selectConnectorPoint(point.itemId, point.pointIdx);
            }
        });

        // in case all connector points were selected for some connectors, we need to move the connector into selected items instead

        const connectorsForReselection = new Set();
        const connectorTotalPointNumbers = new Map();
        this.selectedConnectorPoints.forEach(p => {
            if (!connectorTotalPointNumbers.has(p.itemId)) {
                const item = this.findItemById(p.itemId);
                // using arithmetic progression formula as we are going to removed each poindIdx+1 from the total sum
                // and once 0 is left - that means that all points were selected
                connectorTotalPointNumbers.set(p.itemId, item.shapeProps.points.length * (item.shapeProps.points.length + 1) / 2);
            }

            const leftSum = connectorTotalPointNumbers.get(p.itemId) - p.pointIdx - 1;
            if (leftSum <= 0) {
                connectorsForReselection.add(p.itemId);
            }

            connectorTotalPointNumbers.set(p.itemId, leftSum);
        });

        connectorsForReselection.forEach(itemId => {
            const item = this.findItemById(itemId);
            selectedItems.push(item);
        });

        for (let i = this.selectedConnectorPoints.length - 1; i >= 0; i--) {
            const p = this.selectedConnectorPoints[i];
            if (connectorsForReselection.has(p.itemId)) {
                this.selectedConnectorPoints.splice(i, 1);
                delete this.selectedItemsMap[`${p.itemId}.points.${p.pointIdx}`];
            }
        }

        this.selectMultipleItems(selectedItems, true);
    }

    /**
     * Selected specified point in a connector item, but only in case connector item itself was not yet fully selected
     * @param {*} itemId - id of connector item
     * @param {*} pointIdx - index of the point in the connector
     */
    selectConnectorPoint(itemId, pointIdx) {
        if (pointIdx < 0) {
            return;
        }
        const key = `${itemId}.points.${pointIdx}`;
        if (this.selectedItemsMap[key] || this.selectedItemsMap[itemId]) {
            return;
        }

        const item = this.findItemById(itemId);
        if (!item || item.shape !== 'connector') {
            return;
        }

        if (pointIdx >= item.shapeProps.points.length) {
            return;
        }

        this.selectedConnectorPoints.push({itemId, pointIdx});
        this.selectedItemsMap[key] = true;
    }

    indexItemPins(item, shape) {
        if (!shape) {
            return;
        }


        forEach(shape.getPins(item), (p, pinId) => {
            const worldPoint = worldPointOnItem(p.x, p.y, item);

            // checking if pin point has normals and converting normal to world transform
            if (p.hasOwnProperty('nx')) {
                const w0 = worldPointOnItem(0, 0, item);
                const worldNormal = worldPointOnItem(p.nx, p.ny, item);
                worldPoint.nx = worldNormal.x - w0.x;
                worldPoint.ny = worldNormal.y - w0.y;
            }

            this.pinSpatialIndex.addPoint(worldPoint.x, worldPoint.y, {
                itemId: item.id,
                pinId: pinId,
                worldPinPoint: worldPoint
            });
        });
    }

    indexItemOutlinePoints(item) {
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
                    const worldPoint = worldPointOnItem(point.x, point.y, item);
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
            const worldPoint = worldPointOnItem(point.x, point.y, item);
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

    indexItemTags(itemId, tags) {
        forEach(tags, tag => {
            if (!this._itemTagsToIds.hasOwnProperty(tag)) {
                this._itemTagsToIds[tag] = [];
            }
            this._itemTagsToIds[tag].push(itemId);
        });
    }

    enrichItemMeta(item, transformMatrix, parentItem, ancestorIds) {
        if (!item.meta) {
            item.meta = {
                strokeOffset: 0,
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
        return localPointOnItem(x, y, item, this.shadowTransform);
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
                return localPointOnItem(x, y, parentItem, this.shadowTransform);
            }
        }

        if (this.shadowTransform) {
            return myMath.localPointInArea(x, y, WORLD_AREA, this.shadowTransform);
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
        this.pinSpatialIndex.forEachInRange(x - d, y - d, x + d, y + d, ({itemId, pinId, worldPinPoint}, point) => {
            if (itemId !== excludedId) {
                const distance = (x - point.x) * (x - point.x) + (y - point.y) * (y - point.y);
                if (!closestPin || closestPin.distance > distance) {
                    closestPin = { itemId, pinId, point: worldPinPoint, distance };
                }
            }
        });

        if (closestPin) {
            const result = {
                x                 : closestPin.point.x,
                y                 : closestPin.point.y,
                distanceOnPath    : 0,
                itemId            : closestPin.itemId,
                pinId             : closestPin.pinId,
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
        // We want to ensure that our search distance is always bigger than the minSpatialIndexDistance
        const searchDistance = Math.max(d, minSpatialIndexDistance*2);


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
                precision: Math.min(d / 2, 0.5),
                withNormal: true,
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

                if (closestPoint.hasOwnProperty('nx')) {
                    candidatePoint.nx = closestPoint.nx;
                    candidatePoint.ny = closestPoint.ny;
                }

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
    readjustItemAndDescendants(itemId, isSoft = false, context = DEFAULT_ITEM_MODIFICATION_CONTEXT, precision = 1) {
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
    readjustItem(changedItemId, isSoft = false, context = DEFAULT_ITEM_MODIFICATION_CONTEXT, precision = 4) {
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

        this._readjustSingleItem(item, visitedItems, isSoft, context, precision);

        // searching for items that depend on changed item
        if (this.dependencyItemMap[changedItemId]) {
            forEach(this.dependencyItemMap[changedItemId], dependantItemId => {
                this._readjustItem(dependantItemId, visitedItems, isSoft, context, precision);
            });
        }

        // scanning through children of the item and readjusting them as well
        forEach(item.childItems, childItem => {
            // The following branching is used because because when template is regenerated it also readjusts all of its child items recursively
            // In order to avoid double readjustment we do it this way
            if (childItem.autoLayout && childItem.autoLayout.on && childItem.args && childItem.args.templated && childItem.args.templateRef) {
                const template = this.compiledTemplates.get(childItem.meta.templateRef);
                if (template) {
                    visitedItems[childItem.id] = true;
                    this._readjustSingleItem(childItem, visitedItems, isSoft, context, precision);
                    this.regenerateTemplatedItem(childItem, template, childItem.args.templateArgs, childItem.area.w, childItem.area.h);
                } else {
                    this._readjustItem(childItem.id, visitedItems, isSoft, context, precision);
                }
            } else {
                this._readjustItem(childItem.id, visitedItems, isSoft, context, precision);
            }
        });

        item.meta.revision = (item.meta.revision || 1) + 1;
    }

    /**
     * @param {Item} item
     * @param {*} visitedItems
     * @param {*} isSoft
     * @param {*} context
     * @param {*} precision
     */
    _readjustSingleItem(item, visitedItems, isSoft, context, precision) {
        log.info('Readjusting item', item.id, item.name);

        if (item.shape === 'connector') {
            this._readjustConnectorItem(item, context, precision);
        }

        const shape = Shape.find(item.shape);
        let readjusted = false;
        if (shape && shape.readjustItem) {
            shape.readjustItem(item, this, isSoft, context, precision);
            readjusted = true;
        }

        const parentItem = item.meta && item.meta.parentId ? this.findItemById(item.meta.parentId) : null;
        if (parentItem && item.autoLayout && item.autoLayout.on && item.autoLayout.rules) {
            item.area = generateItemAreaByAutoLayoutRules(item, parentItem, item.autoLayout.rules);
            readjusted = true;
        }

        if (readjusted) {
            updateItemRevision(item);
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
            this.svgOutlinePathCache.forceUpdate(item);
        }
    }


    /**
     *
     * @param {Item} item
     * @param {ItemModificationContext} context
     * @param {Number} precision
     * @returns
     */
    _readjustConnectorItem(item, context, precision) {
        log.info('readjusting connector item', item.id);
        const findAttachmentPoint = (attachmentSelector, positionOnPath, pinId, pointIdx) => {
            const currentPoint = item.shapeProps.points[pointIdx];

            const attachmentItem = this.findFirstElementBySelector(attachmentSelector);
            if (!attachmentItem) {
                return null;
            }

            if (pinId) {
                const shape = Shape.find(attachmentItem.shape);
                if (!shape || !shape.getPins) {
                    return null;
                }

                const pinPoint = this.getItemWorldPinPoint(attachmentItem, pinId);
                if (!pinPoint) {
                    return null;
                }

                const lp = localPointOnItem(pinPoint.x, pinPoint.y, item);
                const point = {
                    x: lp.x,
                    y: lp.y,
                };

                if (pinPoint.hasOwnProperty('nx')) {
                    point.nx = pinPoint.nx;
                    point.ny = pinPoint.ny;
                }
                return point;
            }

            const svgPath = this.getSvgOutlineOfItem(attachmentItem);
            if (!svgPath) {
                return null;
            }

            if (context.resized || context.controlPoint || attachmentItem.shape === 'connector' || attachmentItem.shape === 'path') {
                const originalPointKey = `${item.id}-points-${pointIdx}`;
                let originalPoint = currentPoint;
                if (this.editBox) {
                    if (this.editBox.cache.has(originalPointKey)) {
                        originalPoint = this.editBox.cache.get(originalPointKey);
                    } else {
                        // checking whether the item is part of the edit box
                        // in such case we don't want to take its original point and instead let user modify it

                        if (!this.editBox.itemIds.has(item.id)) {
                            this.editBox.cache.set(originalPointKey, currentPoint);
                        }
                    }
                }

                const wp = worldPointOnItem(originalPoint.x, originalPoint.y, item);

                const closestPoint = this.closestPointToItemOutline(attachmentItem, wp, {withNormal: true, precision});
                if (!closestPoint) {
                    return;
                }
                const lp = localPointOnItem(closestPoint.x, closestPoint.y, item);

                // trying to minimize jitter movements of attached items and keep it in the same spot
                if (myMath.distanceBetweenPoints(wp.x, wp.y, closestPoint.x, closestPoint.y) < 0.8) {
                    lp.x = originalPoint.x;
                    lp.y = originalPoint.y;
                }
                return {
                    x: lp.x,
                    y: lp.y,
                    nx: closestPoint.nx,
                    ny: closestPoint.ny,
                };
            }

            const lap = svgPath.getPointAtLength(positionOnPath);
            const wp = worldPointOnItem(lap.x, lap.y, attachmentItem);
            const lp = localPointOnItem(wp.x, wp.y, item);
            const normal = this.calculateNormalOnPointInItemOutline(attachmentItem, positionOnPath, svgPath);
            return {
                x: lp.x,
                y: lp.y,
                nx: normal.x,
                ny: normal.y,
            };
        };

        if (!item.shapeProps.autoAttach) {
            return;
        }

        const sourcePoint = findAttachmentPoint(item.shapeProps.sourceItem, item.shapeProps.sourceItemPosition, item.shapeProps.sourcePin, 0);
        if (sourcePoint) {
            item.shapeProps.points[0] = sourcePoint;
        }
        const dstPoint = findAttachmentPoint(item.shapeProps.destinationItem, item.shapeProps.destinationItemPosition, item.shapeProps.destinationPin, item.shapeProps.points.length - 1);
        if (dstPoint) {
            item.shapeProps.points[item.shapeProps.points.length - 1] = dstPoint;
        }
    }

    doesItemDependOn(itemId, dependantId) {
        const ids = this.dependencyItemMap[dependantId];
        if (!ids) {
            return false;
        }

        return indexOf(ids, itemId) >= 0;
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
        const topLeftWorldPoint = worldPointOnItem(0, 0, item);

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

        if (item.autoLayout && item.autoLayout.on) {
            if (previousParentId !== otherItemId) {
                item.autoLayout.on = false;
                item.autoLayout.rules = {};
            }
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

        if (previousParentId !== otherItemId) {
            item.area.r += previousParentWorldAngle - otherItemWorldAngle;

            const newLocalPoint = myMath.findTranslationMatchingWorldPoint(topLeftWorldPoint.x, topLeftWorldPoint.y, 0, 0, item.area, newParentTransform);
            if (newLocalPoint) {
                item.area.x = newLocalPoint.x;
                item.area.y = newLocalPoint.y;
            }
        }

        if (previousParentId) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, previousParentId);
        }
        if (newParentId) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, newParentId);
        }

        this.reindexItems();
        this.updateEditBox();
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
     * @returns {ItemClosestPoint}
     */
    closestPointToItemOutline(item, globalPoint, {withNormal, startDistance, stopDistance, precision}) {
        // in order to include all parent items transform into closest point finding we need to first bring the global point into local transform
        const localPoint = localPointOnItem(globalPoint.x, globalPoint.y, item);

        const shadowSvgPath = this.svgOutlinePathCache.get(item);
        if (!shadowSvgPath) {
            return null;
        }

        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, shadowSvgPath, {
            startDistance,
            stopDistance,
            precision
        });
        const worldPoint = worldPointOnItem(closestPoint.x, closestPoint.y, item);
        worldPoint.distanceOnPath = closestPoint.distance;

        if (withNormal) {
            const normal = this.calculateNormalOnPointInItemOutline(item, closestPoint.distance, shadowSvgPath);
            worldPoint.nx = normal.x;
            worldPoint.ny = normal.y;
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
        const topLeftCorner = worldPointOnItem(0, 0, item);
        const vectorOffset = worldPointOnItem(vx, vy, item);
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

    deleteItems(items) {
        forEach(items, item => {
            this._deleteItem(item);
        });
        this.reindexItems();
    }

    _deleteItem(item) {
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
            for (let i = this.selectedItems.length - 1; i >= 0; i--) {
                const item = this.selectedItems[i];
                if (item.meta.templated && item.meta.templateRootId && item.meta.templateRootId !== item.id) {
                    const rootItem = this.findItemById(item.meta.templateRootId);
                    if (rootItem && rootItem.args.templateRef) {
                        this.getTemplate(rootItem.args.templateRef).then(template => {
                            template.onDeleteItem(rootItem, item.args.templatedId, item);
                            this.regenerateTemplatedItem(rootItem, template, rootItem.args.templateArgs, rootItem.area.w, rootItem.area.h);
                        });
                    }
                } else {
                    delete this.selectedItemsMap[item.id];
                    this._deleteItem(item);
                    this.selectedItems.splice(i, 1);
                }
            }
        }

        const changedItems = new Map();
        // sorting all points by their indices so that we start deleting points from the latest one for every item
        this.selectedConnectorPoints.sort((a, b) => b.pointIdx - a.pointIdx).forEach(p => {
            const item = this.findItemById(p.itemId);
            if (!item || item.shape !== 'connector') {
                return;
            }
            item.shapeProps.points.splice(p.pointIdx, 1);

            if (item.shapeProps.points.length < 2) {
                this._deleteItem(item);
                changedItems.delete(item.id);
            } else {
                changedItems.set(item.id, item);
            }
        });

        changedItems.forEach(item => {
            updateItemRevision(item);
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id)
        });

        this.selectedConnectorPoints = [];

        this.reindexItems();

        this.editBox = null;
        // This event is needed to inform some components that they need to update their state because selection has dissapeared
        EditorEventBus.item.deselected.any.$emit(this.editorId);
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

    /**
     * Adds item to scene and returns a reference to it
     * @param {Item} item
     * @param {Item|null} parentItem
     * @returns {Item}
     */
    addItem(item, parentItem) {
        this.enrichItem(item);
        if (parentItem) {
            parentItem.childItems.push(item);
            const itemTransform = myMath.standardTransformWithArea(parentItem.meta.transformMatrix, parentItem.area);
            this.reindexSpecifiedItems([item], itemTransform, parentItem, parentItem.meta.ancestorIds.concat([parentItem.id]), true);
        } else {
            this.scheme.items.push(item);
            this.reindexSpecifiedItems([item]);
        }
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

    /**
     * @returns {Array<Item>}
     */
    getItems() {
        return this._itemArray;
    }

    getTopLevelItems() {
        return this.worldItems;
    }

    setActiveBoundaryBox(area) {
        this.activeBoundaryBox = area;
    }

    isItemSelected(item) {
        return this.selectedItemsMap[item.id] || false;
    }

    /**
     * This function is called when the document is rebased and it needs to update references to all items in the selection
     * and the edit box
     */
    rebaseScheme() {
        const newSelectedItems = [];
        this.selectedItemsMap = {};
        this.selectedItems.forEach(oldItem => {
            const item = this.findItemById(oldItem.id);
            if (!item) {
                return;
            }
            newSelectedItems.push(item);
            this.selectedItemsMap[item.id] = true;
            item.meta.selected = true;
        })
        this.selectedItems = newSelectedItems;
        this.rebaseEditBox();
    }

    rebaseEditBox() {
        // When all items are rebased we need to ensure to update all their references in the edit box
        // plus the edit box itself could have been changed, if the items were moved
        // But we don't want to reset the edit box since the user could be dragging it while it is rebased
        if (!this.editBox) {
            return;
        }
        log.info('rebasing edit box', this.editBox);
        const box = this.generateEditBox(this.selectedItems, this.selectedConnectorPoints);
        for (let key in box) {
            if (box.hasOwnProperty(key) && key !== 'id') {
                this.editBox[key] = box[key];
            }
        }
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
            item.meta.selected = true;
            EditorEventBus.item.selected.specific.$emit(this.editorId, item.id);
        } else {
            this.deselectConnectorPoints();
            const deselectedItemIds = [];
            forEach(this.selectedItems, selectedItem => {
                if (selectedItem.id !== item.id) {
                    deselectedItemIds.push(selectedItem.id);
                }
            });
            this.selectedItems = [];
            forEach(deselectedItemIds, itemId => {
                this.selectedItemsMap[itemId] = false;
                item.meta.selected = false;
                EditorEventBus.item.deselected.specific.$emit(this.editorId, itemId);
            });

            this.selectItemInclusive(item);
            EditorEventBus.item.selected.specific.$emit(this.editorId, item.id);
        }
        this.updateEditBox();
    }

    selectMultipleItems(items, inclusive) {
        if (!inclusive) {
            this.deselectAllItems();
        }
        forEach(items, item => {
            if (!this.selectedItemsMap[item.id]) {
                this.selectedItems.push(item);
                this.selectedItemsMap[item.id] = true;
                item.meta.selected = true;
                EditorEventBus.item.selected.specific.$emit(this.editorId, item.id);
            }
        });
        this.updateEditBox();
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
            item.meta.selected = true;
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

    deselectConnectorPoints() {
        forEach(this.selectedConnectorPoints, cp => {
            this.selectedItemsMap[`${cp.itemId}.points.${cp.pointIdx}`] = false;
        });
        this.selectedConnectorPoints = [];
    }

    // This function should be used for updating item properties from various components
    // It is needed as in some cases a scheme may be rebased which causes reset of all items
    // so that currently loaded components may still refer to the old item object.
    updateItem(itemId, property, callback) {
        const item = this.findItemById(itemId);
        if (!item) {
            return;
        }
        callback(item);
        EditorEventBus.item.changed.specific.$emit(this.editorId, itemId, property);
    }

    /**
     * @param {Item} item
     */
    deselectItem(item) {
        if (this.selectedItemsMap[item.id]) {
            this.selectedItemsMap[item.id] = false;
            item.meta.selected = false;
        }

        for(let i = 0; i < this.selectedItems.length; i++) {
            if (this.selectedItems[i].id === item.id) {
                this.selectedItems.splice(i, 1);
                break;
            }
        }

        EditorEventBus.item.deselected.specific.$emit(this.editorId, item.id)
        this.updateEditBox();
    }

    /**
     * Deselect all previously selected items
     */
    deselectAllItems() {
        this.deselectConnectorPoints();

        const itemIds = map(this.selectedItems, item => item.id);
        forEach(this.selectedItems, item => {
            this.selectedItemsMap[item.id] = false;
            item.meta.selected = false;
        });
        this.selectedItems = [];

        // First we should reset selectedItems array and only then emit event for each event
        // Some components check selectedItems array to get information whether item is selected or not
        forEach(itemIds, itemId => EditorEventBus.item.deselected.specific.$emit(this.editorId, itemId));

        this.updateEditBox();
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
        return this.itemsByName.get(name);
    }

    /**
     *
     * @param {String} itemId
     * @returns {Item}
     */
    findItemById(itemId) {
        return this.itemMap[itemId];
    }

    /**
     * @param {String} tag
     * @returns {Array<Item>}
     */
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

    /**
     * @param {String} selector
     * @param {Item} selfItem
     * @returns {Item}
     */
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
     * @returns {Array<Item>}
     */
    findElementsBySelector(selector, selfItem) {
        if (!selector) {
            return [];
        }
        if (selector === 'self') {
            return [selfItem];
        }

        if (selector.charAt(0) === '#') {
            const id = selector.substring(1);
            const item = this.findItemById(id);
            if (item) {
                return [item];
            }
        } else {
            const colonIndex = selector.indexOf(':');
            if (colonIndex > 0) {
                const expression = selector.substring(0, colonIndex).trim();
                if (expression === 'tag') {
                    return this.findItemsByTag(selector.substring(colonIndex + 1).trim());
                }
            }
        }
        return [];
    }

    copySelectedItems() {
        /** @type {Array<Item>} */
        const copyBuffer = [];
        // ensuring that we don't copy the same item twice
        // It could be that user has selected ites using multi-select box
        // In this case all items are flatten out in the selectedItems array
        const selectedIds = new Set();
        forEach(this.selectedItems, item => {
            if (selectedIds.has(item.id)) {
                return;
            }
            traverseItems([item], childItem => {
                selectedIds.add(childItem.id);
            });
            copyBuffer.push(utils.clone(item));
        });

        return this.triggerCopyEventForTemplatedItems(copyBuffer).then(() => {
            return JSON.stringify(copyBuffer);
        });
    }

    /**
     * @param {Array<Item>} copyBuffer
     */
    triggerCopyEventForTemplatedItems(copyBuffer) {
        const promises = [];
        copyBuffer.forEach(item => {
            if (!item.meta.templated || !item.meta.templateRootId) {
                return;
            }
            const templateRoot = this.findItemById(item.meta.templateRootId);
            if (!templateRoot || !templateRoot.args || !templateRoot.args.templateRef) {
                return;
            }

            promises.push(
                this.getTemplate(templateRoot.args.templateRef)
                .then(template => {
                    template.onCopyItem(templateRoot, item.args.templatedId, item);
                })
                .catch(err => {
                    console.error(err);
                })
            );
        });

        return Promise.all(promises);
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

    /**
     *
     * @param {Array<Item>} items
     * @returns {Array<Item>}
     */
    cloneItemsPreservingNames(items) {
        return this.cloneItems(items, true, false);
    }

    /**
     *
     * @param {Array<Item>} items
     * @param {Boolean} preserveOriginalNames
     * @param {Boolean} shouldIndexClones
     * @returns {Array<Item>}
     */
    cloneItems(items, preserveOriginalNames = false, shouldIndexClones = false) {
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

        this.fixItemsReferences(copiedItems, idOldToNewConversions);
        return copiedItems;
    }

    /**
     * Traverses all items and replaces all outdated references to the one provided in idsMapping argument
     * @param {Array<Item>} items - items with new ids
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

            if (item.behavior.dragPath) {
                item.behavior.dragPath = rebuildElementSelector(item.behavior.dragPath);
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
                    } else if (action.method.startsWith('function:')) {
                        const funcName = action.method.substring(9);
                        if (this.scheme.scripts && Array.isArray(this.scheme.scripts.functions)) {
                            const funcDef = this.scheme.scripts.functions.find(f => f.name === funcName);
                            if (funcDef && Array.isArray(funcDef.args)) {
                                funcDef.args.forEach(argDef => {
                                    if (argDef.type === 'element' && action.args[argDef.name]) {
                                        action.args[argDef.name] = rebuildElementSelector(action.args[argDef.name]);
                                    }
                                });
                            }
                        }
                    }
                });
            });

            if (Array.isArray(item.classes)) {
                item.classes.forEach(itemClass => {
                    const classDef = this.findClassById(itemClass.id);
                    if (classDef && Array.isArray(classDef.args)) {
                        classDef.args.forEach(argDef => {
                            if (argDef.type === 'element' && itemClass.args[argDef.name]) {
                                itemClass.args[argDef.name] = rebuildElementSelector(itemClass.args[argDef.name]);
                            }
                        });
                    }
                });
            }
        });
    }


    /**
     * @param {Array<Item>} items
     * @param {Item} dstItem
     */
    pasteItemsInto(items, dstItem) {
        let promise = Promise.resolve(false);
        if (dstItem.meta.templated && dstItem.meta.templateRootId && dstItem.args.templatedId) {
            const rootItem = this.findItemById(dstItem.meta.templateRootId);
            if (rootItem && rootItem.args.templated && rootItem.args.templateRef) {
                promise = this.getTemplate(rootItem.args.templateRef)
                .then(template => {
                    if (template.hasHandler('paste')) {
                        const updatedScopeData = template.onPasteItemInto(rootItem, dstItem.args.templatedId, items)
                        this.regenerateTemplatedItemWithExistingScopeData(rootItem, template, updatedScopeData, rootItem.area.w, rootItem.area.h);
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                        EditorEventBus.item.templateArgsUpdated.specific.$emit(this.editorId, rootItem.id);
                        return true;
                    }
                    return false;
                });
            }
        }

        promise.then(isPasteOverriden => {
            if (!isPasteOverriden) {
                this._pasteItemsIntoRegularItem(items, dstItem);
            }
        });
    }


    /**
     * @param {Array<Item>} items
     * @param {Item} dstItem
     */
    _pasteItemsIntoRegularItem(items, dstItem) {
        if (!items || items.length === 0) {
            return;
        }

        const copiedItems = this.cloneItems(items);
        const copiedIds = new Set();

        let minX = items[0].area.x;
        let minY = items[0].area.y;

        for (let i = 1; i < items.length; i++) {
            const p1 = {x: items[i].area.x, y: items[i].area.y};

            minX = Math.min(minX, p1.x);
            minY = Math.min(minY, p1.y);
        }

        const offsetX = Math.min(10, dstItem.area.w) - minX;
        const offsetY = Math.min(10, dstItem.area.h) - minY;

        copiedItems.forEach(item => {
            copiedIds.add(item.id);
            item.locked = false;
            this.itemMap[item.id] = item;
            item.area.x += offsetX;
            item.area.y += offsetY;
            if (!dstItem.childItems) {
                dstItem.childItems = [];
            }
            dstItem.childItems.push(item);
            this.itemMap[item.id] = item;
        });

        this.fixPastedConnectors(copiedItems, copiedIds);
        this.reindexItems();

        this.selectMultipleItems(copiedItems, false);

        EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
    }

    /**
     *
     * @param {Array<Item>} items array of items that should be copied and pasted
     * @param {Number} centerX x in relative transform for which items should put pasted to
     * @param {Number} centerY y in relative transform for which items should put pasted to
     */
    pasteItems(items, centerX, centerY) {
        if (!items || items.length === 0) {
            return;
        }

        const copiedItems = this.cloneItems(items);
        const copiedIds = new Set();

        forEach(copiedItems, item => {
            copiedIds.add(item.id);
            item.locked = false;
            this.scheme.items.push(item);
            this.itemMap[item.id] = item;
        });

        this.fixPastedConnectors(copiedItems, copiedIds);
        this.selectMultipleItems(copiedItems, false);

        //since all items are already selected, the relative multi item edit box should be centered on the specified center point
        if (this.editBox) {
            const boxArea = this.editBox.area;
            const boxCenterX = boxArea.x + boxArea.w / 2;
            const boxCenterY = boxArea.y + boxArea.h / 2;
            const dx = centerX - boxCenterX;
            const dy = centerY - boxCenterY;

            boxArea.x += dx;
            boxArea.y += dy;
            this.updateEditBoxItems(this.editBox, false, DEFAULT_ITEM_MODIFICATION_CONTEXT);
        }

        this.reindexItems();

        EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
    }

    /**
     *
     * @param {Array<Item>} copiedItems
     * @param {Set} copiedIds
     */
    fixPastedConnectors(copiedItems, copiedIds) {
        // doing the selection afterwards so that item has all meta transform calculated after re-indexing
        // and its edit box would be aligned with the item
        forEach(copiedItems, item => {
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
     * @param {EditBox} editBox
     * @param {Boolean} isSoft
     * @param {ItemModificationContext} context
     */
    updateEditBoxItems(editBox, isSoft, context, precision) {
        log.info('updateEditBoxItems', 'isSoft:', isSoft, 'precision:', precision);
        if (precision === undefined) {
            precision = 4;
        }
        if (!context) {
            context = DEFAULT_ITEM_MODIFICATION_CONTEXT;
        }

        // this is need as there is a situation when user pastes new items to the scene and the reindex was not run yet
        // It uses edit box to move the newly pasted items. Because of the missing reindex SchemeContainer
        // is not able to find these items by id
        const itemsMap = new Map();
        if (Array.isArray(editBox.items)) {
            editBox.items.forEach(item => {
                itemsMap.set(item.id, item);
            });
        }

        // storing ids of dragged or rotated items in a map
        // this way we will be able to figure out whether any items ancestors were dragged already
        // so that we can skip dragging or rotating an item
        const changedItemIds = new Set();

        /**
         * @param {Point} point
         * @returns {Point}
         */
        const projectBack = (point) => {
            return myMath.worldPointInArea(point.x * editBox.area.w, point.y * editBox.area.h, editBox.area);
        };

        // connectorAttachmentPoints is used for collecting source and destination connector points that were moved
        // since there are two ways of moving connectors with editbox (full item and partial)
        // we need to check if the attachment point was actually affected by edit box
        /** @type {Map<String,{pointIdx, item}>} */
        const connectorAttachmentPoints = new Map();


        editBox.connectorPoints.forEach(p => {
            const item = itemsMap.has(p.itemId) ? itemsMap.get(p.itemId) : this.findItemById(p.itemId);
            changedItemIds.add(item.id);
            if (p.pointIdx === 0 || p.pointIdx === item.shapeProps.points.length - 1) {
                connectorAttachmentPoints.set(`${item.id}.points.${p.pointIdx}`,{
                    item,
                    pointIdx: p.pointIdx
                });
            }

            // if we are already dragging connectors point
            // we don't need to recompute all points
            if (context.controlPoint) {
                return;
            }

            const newPoint = projectBack(p.projection);
            const localPoint = localPointOnItem(newPoint.x, newPoint.y, item);
            item.shapeProps.points[p.pointIdx].x = localPoint.x;
            item.shapeProps.points[p.pointIdx].y = localPoint.y;
        });

        forEach(editBox.items, item => {
            if (item.shape === 'connector') {
                // when generating edit box we ensure that all fully selected connectors get their points
                // added to the box.
                return;
            }
            changedItemIds.add(item.id);

            // checking whether the item in the box list is actually a descendant of the other item that was also in the same box
            // this is needed to build proper reindexing of items and not to double rotate child items in case their parent was already rotated
            const parentWasAlreadyUpdated = (item.meta && item.meta.ancestorIds && find(item.meta.ancestorIds, id => changedItemIds.has(id)));

            const shouldSkipItemUpdate = parentWasAlreadyUpdated && (context.moved || context.rotated) && !context.resized;

            if (!item.locked && !shouldSkipItemUpdate) {
                // calculating new position of item based on their pre-calculated projections
                const itemProjection = editBox.itemProjections[item.id];

                // this condition is needed because there can be a situation when edit box is first rotated and only then resized
                // in this case we should skip rotation of child items if their parents were already rotated.
                if (!parentWasAlreadyUpdated) {
                    item.area.r = itemProjection.r + editBox.area.r;
                }

                let parentTransform = myMath.identityMatrix();
                const parent = itemsMap.has(item.meta.parentId) ? itemsMap.get(item.meta.parentId) : this.findItemById(item.meta.parentId);
                if (parent) {
                    parentTransform = itemCompleteTransform(parent);
                }

                const worldTopLeft = projectBack(itemProjection.topLeft);

                const newPoint = myMath.findTranslationMatchingWorldPoint(worldTopLeft.x, worldTopLeft.y, 0, 0, item.area, parentTransform);

                const modifiedArea = {
                    x: item.area.x,
                    y: item.area.y,
                    w: item.area.w,
                    h: item.area.h
                };

                if (newPoint) {
                    modifiedArea.x = newPoint.x;
                    modifiedArea.y = newPoint.y;
                }

                // recalculated width and height only in case multi item edit box was resized
                // otherwise it doesn't make sense

                if (context.resized) {
                    const worldBottomRight = projectBack(itemProjection.bottomRight);
                    const localBottomRight = myMath.localPointInArea(worldBottomRight.x, worldBottomRight.y, {...item.area, ...modifiedArea}, (item.meta && item.meta.transformMatrix) ? item.meta.transformMatrix : null)
                    modifiedArea.w = Math.max(0, localBottomRight.x);
                    modifiedArea.h = Math.max(0, localBottomRight.y);
                }

                if (item.meta && item.meta.templated && item.meta.templateRootId && item.meta.templateRootId !== item.id && item.args && item.args.templatedId) {
                    if (item.args && (item.args.tplArea ===  'controlled' || item.args.tplArea ===  'movable')) {
                        const templateRootItem = this.findItemById(item.meta.templateRootId);
                        if (!templateRootItem || !templateRootItem.args || !templateRootItem.args.templateRef) {
                            return;
                        }
                        this.getTemplate(templateRootItem.args.templateRef)
                        .then(template => {
                            template.onAreaUpdate(templateRootItem, item.args.templatedId, item, modifiedArea);
                            item.area.x = modifiedArea.x;
                            item.area.y = modifiedArea.y;
                            item.area.w = modifiedArea.w;
                            item.area.h = modifiedArea.h;

                            this.regenerateTemplatedItem(templateRootItem, template, templateRootItem.args.templateArgs, templateRootItem.area.w, templateRootItem.area.h);
                            EditorEventBus.item.templateArgsUpdated.specific.$emit(this.editorId, templateRootItem.id);
                        });
                    }
                } else {
                    item.area.x = modifiedArea.x;
                    item.area.y = modifiedArea.y;
                    item.area.w = modifiedArea.w;
                    item.area.h = modifiedArea.h;
                }

                if (context.resized && item.shape === 'component' && item.shapeProps.kind === 'embedded') {
                    this.readjustComponentContainerRect(item);
                }
            }
        });


        // trying to reattach or detach all displaced connectors
        // but only if user is not already dragging the single connector point
        if (!context.controlPoint) {
            connectorAttachmentPoints.forEach(cap => {
                this.tryReattachingConnector(cap.item, this.editBox, cap.pointIdx);
            });
        }

        changedItemIds.forEach(itemId => {
            const item = this.findItemById(itemId);
            if (!item) {
                return;
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
        })

        EditorEventBus.editBox.updated.$emit(this.editorId);
    }

    /**
     *
     * @param {Item} item
     * @param {EditBox} editBox
     * @param {Number} pointIdx
     */
    tryReattachingConnector(item, editBox, pointIdx) {
        log.info('trying to reattach connector', 'pointIdx:', pointIdx);
        if (!item.shapeProps.autoAttach) {
            return;
        }
        // since the connector item was moved, rotated or scaled completely we need
        // to try to attach it back with the following steps:
        // 1) first try to attach it at the same spot as before (x,y not by distance on path)
        // 2) if above doesn't (distance to the attachmend point is above threshold) work try to attach it as close as possible to the same path
        // 3) if the above also didn't work - remove the attachment
        const originalAttachments = editBox.connectorOriginalAttachments.get(item.id);
        if (!originalAttachments || item.shapeProps.points.length < 2) {
            return;
        }

        const reattach = (selector, projectionPoint) => {
            const attachmentItem = this.findFirstElementBySelector(selector);
            if (!attachmentItem) {
                return null;
            }

            const originalPoint = myMath.worldPointInArea(projectionPoint.x * editBox.area.w, projectionPoint.y * editBox.area.h, editBox.area);

            const closestPoint = this.closestPointToItemOutline(attachmentItem, originalPoint, {precision: 4});
            if (!closestPoint) {
                return null;
            }

            const stickyThreshold = myMath.tooSmall(this.screenTransform.scale) ? connectorStickyThreshold : connectorStickyThreshold/this.screenTransform.scale;

            if (myMath.distanceBetweenPoints(originalPoint.x, originalPoint.y, closestPoint.x, closestPoint.y) > stickyThreshold) {
                return null;
            }
            return closestPoint;
        };

        const fieldPrefix = pointIdx === 0 ? 'source' : 'destination'
        const attachmentSelector = pointIdx === 0 ? originalAttachments.sourceItem : originalAttachments.destinationItem;
        const projection = pointIdx === 0 ? originalAttachments.sourceProjection : originalAttachments.destinationProjection;
        const result = reattach(attachmentSelector, projection);
        if (result) {
            item.shapeProps[`${fieldPrefix}Item`] = attachmentSelector;
            item.shapeProps[`${fieldPrefix}ItemPosition`] = result.distanceOnPath;
            const p = localPointOnItem(result.x, result.y, item);
            item.shapeProps.points[pointIdx].x = p.x;
            item.shapeProps.points[pointIdx].y = p.y;
        } else {
            item.shapeProps[`${fieldPrefix}Item`] = null;
            delete item.shapeProps.points[pointIdx].nx;
            delete item.shapeProps.points[pointIdx].ny;
            if (projection) {
                const correctedPoint = myMath.worldPointInArea(projection.x * editBox.area.w, projection.y * editBox.area.h, editBox.area);
                const correctedLocalPoint = localPointOnItem(correctedPoint.x, correctedPoint.y, item);
                item.shapeProps.points[pointIdx].x = correctedLocalPoint.x;
                item.shapeProps.points[pointIdx].y = correctedLocalPoint.y;
            }
        }
    }

    /**
     * Searches for all item names and adds numeric index so that it becomes unique in the scheme
     * @param {string} name
     */
    generateUniqueName(name) {
        const itemNames = map(this.getItems(), item => item.name);
        return giveUniqueName(name, itemNames);
    }

    /**
     * @param {String} name
     * @returns {String}
     */
    copyNameAndMakeUnique(name) {
        for (let i = name.length - 1; i >= 0; i--) {
            const code = name.charCodeAt(i);
            if (code < 48 || code >= 57) {
                return this.generateUniqueName(name.substring(0, i+1));
            }
        }
        return this.generateUniqueName('');
    }

    /**
     * @returns Updates positions of connector points in the edit box
     */
    updateEditBoxConnectorPoints() {
        if (!this.editBox) {
            return;
        }
        this.editBox.connectorPoints.forEach(cp => {
            const item = this.findItemById(cp.itemId);
            const point = item.shapeProps.points[cp.pointIdx];
            const worldPoint = worldPointOnItem(point.x, point.y, item);
            const localPoint = myMath.localPointInArea(worldPoint.x, worldPoint.y, this.editBox.area);
            cp.x = localPoint.x;
            cp.y = localPoint.y;
        });
    }

    updateEditBox() {
        log.info('updateEditBox');

        // making sure that items in selectedItems array and actual items in the scheme are not out of sync
        // it could happen that some items were removed by the template, when user changed template args.
        const items = this.selectedItems.map(selectedItem => this.findItemById(selectedItem.id)).filter(item => item);
        if (items.length > 0 || this.selectedConnectorPoints.length > 0) {
            this.editBox = this.generateEditBox(items, this.selectedConnectorPoints);
        } else {
            this.editBox = null;
        }
    }

    /**
     * This is needed only in case we don't want to reset edit box
     * but we do need to update its area
     */
    updateEditBoxAreaOnly() {
        if (this.editBox && this.selectedItems.length > 0) {
            const box = this.generateEditBox(this.selectedItems, this.selectedConnectorPoints);
            this.editBox.area.x = box.area.x;
            this.editBox.area.y = box.area.y;
            this.editBox.area.w = box.area.w;
            this.editBox.area.h = box.area.h;
            this.editBox.area.r = box.area.r;
            this.editBox.area.sx = box.area.sx;
            this.editBox.area.sy = box.area.sy;
        }
    }

    /**
     *
     * @param {Array<Item>} items
     * @param {Array<ConnectorPointRef} connectorPointRefs
     * @returns {EditBox}
     */
    generateEditBox(items, connectorPointRefs) {
        log.info('generating edit box', 'items:', items.length, 'connectorPointRefs:', connectorPointRefs.length);
        /** @type {ItemArea} */
        let area = null;
        let locked = true;

        const pivotPoint = {
            x: 0.5,
            y: 0.5
        };

        // this is needed as there could be a situation, when user pastes new items to the scene and the reindex was not run yet
        // It uses edit box to move the newly pasted items. Because of the missing reindex in SchemeContainer
        // is not able to find these items by id
        const connectorItemsMap = new Map();

        /** @type {Array<ConnectorPointRef>} */
        const allConnectorPointRefs = [].concat(connectorPointRefs);
        items.forEach(item => {
            connectorItemsMap.set(item.id, item);
            if (item.shape !== 'connector' || !Array.isArray(item.shapeProps.points) || item.locked) {
                return;
            }
            item.shapeProps.points.forEach((p, pointIdx) => {
                allConnectorPointRefs.push({itemId: item.id, pointIdx});
            });
        })

        if (items.length === 1 && (!items[0].meta.templated || items[0].meta.templateRootId === items[0].id)) {
            // we want the item edit box to be aligned with item only if that item was selected
            // But we need to skip this stage if the item is part of template (but not root),
            // otherwise the edit box may incorrectly calculate the positioning of template controls
            const   p0 = worldPointOnItem(0, 0, items[0]),
                    p1 = worldPointOnItem(items[0].area.w, 0, items[0]),
                    p3 = worldPointOnItem(0, items[0].area.h, items[0]);

            // angle has to be calculated with taking width into account
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
        } else if (items.length > 0) {
            // otherwise item edit box area will be an average of all other items
            area = createEditBoxAveragedArea(items);
        }


        /** @type {Array<ConnectorPointProjection>} */
        const connectorPoints = [];

        allConnectorPointRefs.forEach(pointRef => {
            const item = connectorItemsMap.has(pointRef.itemId) ? connectorItemsMap.get(pointRef.itemId) : this.findItemById(pointRef.itemId);
            if (!item || item.shape !== 'connector') {
                return;
            }

            if (pointRef.pointIdx < 0 || pointRef.pointIdx >= item.shapeProps.points.length) {
                return;
            }

            const localPoint = item.shapeProps.points[pointRef.pointIdx];
            const p = worldPointOnItem(localPoint.x, localPoint.y, item);

            if (!area) {
                area = {...p, r: 0, w: 0, h: 0, px: 0.5, py: 0.5, sx: 1.0, sy: 1.0};
            } else {
                if (area.x > p.x) {
                    area.w += area.x - p.x;
                    area.x = p.x;
                } else if (area.x + area.w < p.x) {
                    area.w = p.x - area.x;
                }
                if (area.y > p.y) {
                    area.h += area.y - p.y;
                    area.y = p.y;
                } else if (area.y + area.h < p.y) {
                    area.h = p.y - area.y;
                }
            }
            connectorPoints.push({
                ...p,
                ...pointRef
            });
        });

        if (!area) {
            throw new Error('Could not calculate edit box area');
        }

        const itemProjections = {};

        // used to store additional information that might be needed when modifying items
        const itemData = {};

        //storing ids of all items that are included in the box
        const itemIds = new Set();

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

        /** @type {Map<String,ConnectorAttachments>} */
        const connectorOriginalAttachments = new Map();
        const registerConnectorOriginalAttachments = (item) => {
            if (connectorOriginalAttachments.has(item.id)) {
                return;
            }

            if (item.shapeProps.points.length < 2) {
                return;
            }

            const firstPoint = item.shapeProps.points[0];
            const lastPoint = item.shapeProps.points[item.shapeProps.points.length - 1];
            const sourceWorldPoint = worldPointOnItem(firstPoint.x, firstPoint.y, item);
            const destinationWorldPoint = worldPointOnItem(lastPoint.x, lastPoint.y, item);

            connectorOriginalAttachments.set(item.id, {
                sourceItem: item.shapeProps.sourceItem,
                sourceItemPosition: item.shapeProps.sourceItemPosition,
                destinationItem: item.shapeProps.destinationItem,
                destinationItemPosition: item.shapeProps.destinationItemPosition,
                sourceProjection: projectPoint(sourceWorldPoint.x, sourceWorldPoint.y),
                destinationProjection: projectPoint(destinationWorldPoint.x, destinationWorldPoint.y)
            });
        };

        connectorPoints.forEach(p => {
            p.projection = projectPoint(p.x, p.y);

            // transforming connector point coords from world to edit box local coords
            const lp = myMath.localPointInArea(p.x, p.y, area);
            p.x = lp.x;
            p.y = lp.y;

            const item = connectorItemsMap.has(p.itemId) ? connectorItemsMap.get(p.itemId) : this.findItemById(p.itemId);
            registerConnectorOriginalAttachments(item);
            itemIds.add(p.itemId);
        });

        forEach(items, item => {
            itemData[item.id] = {
                originalArea: utils.clone(item.area)
            };
            itemIds.add(item.id);
            // locked and auto-layout enabled items are not allowed to moved
            if (!item.locked && (!item.autoLayout || !item.autoLayout.on)) {
                locked = false;
            }

            // caclulating projection of item world coords on the top and left edges of original edit box
            // since some items can be children of other items we need to project only their world location

            const worldTopLeftPoint = worldPointOnItem(0, 0, item);
            const worldBottomRightPoint = worldPointOnItem(item.area.w, item.area.h, item);

            // the following two checks with corrections are needed for the cases when items area is 0 on either width or height
            // in that case it is impossible to generate items area projections on the edit box
            // and user will not be able to recover the size of the item ever
            if (myMath.tooSmall(worldTopLeftPoint.x - worldBottomRightPoint.x)) {
                worldBottomRightPoint.x += 1;
            }
            if (myMath.tooSmall(worldTopLeftPoint.y - worldBottomRightPoint.y)) {
                worldBottomRightPoint.y += 1;
            }

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

        if (connectorPoints.length > 0) {
            locked = false;
        }

        let templateRef = null;
        let templateItemRoot = null;
        let rotationEnabled = true;
        let connectorStarterEnabled = true;

        if (items.length === 1) {
            const item = items[0];
            if (item.args && item.args.templated) {
                if (item.args.templateRef) {
                    templateItemRoot = item;
                    templateRef = item.args.templateRef;
                } else {
                    const ancestor = this.findAncestor(item, it => it.args && it.args.templateRef);
                    if (ancestor) {
                        templateRef = ancestor.args.templateRef;
                        templateItemRoot = ancestor;
                    }
                }

                if (templateRef && item.args.tplRotation === 'off') {
                    rotationEnabled = false;
                }
                if (templateRef && item.args.tplConnector === 'off') {
                    connectorStarterEnabled = false;
                }
            }
        }

        let ruleGuides = [];

        if (items.length === 1 && items[0].meta.parentId) {
            const parentItem = this.findItemById(items[0].meta.parentId);
            if (parentItem) {
                ruleGuides = autoLayoutGenerateEditBoxRuleGuides(items[0], parentItem);
            }
        }

        return {
            id: shortid.generate(),
            locked,
            items,
            itemIds,
            itemData,
            area,
            itemProjections,
            pivotPoint,
            rotationEnabled,
            connectorStarterEnabled,
            connectorPoints,
            connectorOriginalAttachments,
            cache: new Map(),
            templateRef: templateRef,
            templateItemRoot: templateItemRoot,
            ruleGuides,

            // the sole purpose of this point is for the user to be able to rotate edit box via number textfield in Position panel
            // because there we have to readjust edit box position to make sure its pivot point stays in the same place relatively to the world
            // I tried to rewrite the entire edit box calculation to make it simpler. I tried matching pivot point in edit box area to the ones of the item
            // It turned out a lot better in the beginning, but later I discovered that resizing of edit box becomes wonky and the same problem appears
            // when user  types x, y, width or height in number textfield in Position panel.
            // So thats why I decided to keep it as is and to perform all the trickery only for rotation control.
            worldPivotPoint: myMath.worldPointInArea(pivotPoint.x * area.w, pivotPoint.y * area.h, area)
        };
    }

    /**
     * Searches for first match in item ancestors that matches given predicate
     * @param {Item} item
     * @param {function(Item): Boolean} predicate
     */
    findAncestor(item, predicate) {
        if (!item.meta.parentId) {
            return null;
        }
        const parent = this.findItemById(item.meta.parentId);
        if (!parent) {
            return null;
        }
        if (predicate(parent)) {
            return parent;
        }
        return this.findAncestor(parent, predicate);
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
     * @param {Item} item  - item that it needs to fit into another parent item (should be in world transform)
     * @param {function(Item): Boolean} itemPredicate - callback function which should return true for specified item if it should be considered
     * @returns {Item}
     */
    findItemSuitableForParent(item, itemPredicate) {
        const area = this.calculateItemWorldArea(item);
        const items = this.getItems();

        // doing backwards search as getItems() returns a list of all items ordered by their layering position on screen
        for (let i = items.length - 1; i >= 0; i--) {
            const candidateItem = items[i];

            // connectors should not be parent of any other items
            if (candidateItem.id !== item.id && candidateItem.mount && candidateItem.visible && candidateItem.shape !== 'connector' && (!itemPredicate || itemPredicate(candidateItem))) {

                const worldArea = this.worldItemAreas.get(candidateItem.id);

                if (worldArea &&  area.w + area.h < worldArea.w + worldArea.h) {
                    const overlap = myMath.overlappingArea(worldArea, area);

                    const A = area.w * area.h;
                    if (overlap && !myMath.tooSmall(A)) {
                        if ((overlap.w * overlap.h) / A >= 0.5)  {
                            return candidateItem;
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
        if (this.listener) {
            this.listener.onSchemeChangeCommitted(this.editorId);
        }
        this.updateEditBox();
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
        if (this.listener) {
            this.listener.onSchemeChangeCommitted(this.editorId);
        }
        this.updateEditBox();
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


    /**
     * @param {CompiledItemTemplate} template
     * @param {Object} args
     * @param {Number} width
     * @param {Number} height
     * @returns {Item}
     */
    generateItemFromTemplate(template, args, width, height) {
        const item = generateItemFromTemplate(template, args, width, height);
        // ensuring that all items in the template are unique
        const [clonnedItem] = this.cloneItems([item], true, false);
        clonnedItem.args.templateRef = template.templateRef;
        clonnedItem.args.templateArgs = args;
        return clonnedItem;
    }

    /**
     *
     * @param {Item} rootItem
     * @param {*} template
     * @param {*} templateArgs
     * @param {*} width
     * @param {*} height
     */
    regenerateTemplatedItem(rootItem, template, templateArgs, width, height) {
        log.info('regenerateTemplatedItem', rootItem.id, rootItem.name, template.templateRef, templateArgs);
        const parentItem = rootItem.meta.parentId ? this.findItemById(rootItem.meta.parentId) : null;
        const idOldToNewConversions = regenerateTemplatedItem(rootItem, template, templateArgs, width, height);
        this.fixItemsReferences([rootItem], idOldToNewConversions);
        this.updateChildTransforms(rootItem);
        // It is possible that the template was updated in the background and it has more items which were not yet indexed
        this._reindexRegeneratedTemplatedItem(rootItem, parentItem);

        this.readjustItem(rootItem.id);

        traverseItems([rootItem], item => {
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
        });
    }

    regenerateTemplatedItemWithExistingScopeData(rootItem, template, scopeData, width, height) {
        log.info('regenerateTemplatedItemWithExistingScopeData', rootItem.id, rootItem.name, template.templateRef, scopeData);
        const parentItem = rootItem.meta.parentId ? this.findItemById(rootItem.meta.parentId) : null;
        const idOldToNewConversions = regenerateTemplatedItemWithPostBuilder(rootItem, template, scopeData, width, height);
        this.fixItemsReferences([rootItem], idOldToNewConversions);
        this.updateChildTransforms(rootItem);
        // It is possible that the template was updated in the background and it has more items which were not yet indexed
        this._reindexRegeneratedTemplatedItem(rootItem, parentItem);

        this.readjustItem(rootItem.id);
        traverseItems([rootItem], item => {
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
        });
    }

    /**
     * @param {Item} rootItem
     * @param {Item|undefined} parentItem
     */
    _reindexRegeneratedTemplatedItem(rootItem, parentItem) {
        this.itemMap[rootItem.id] = rootItem;
        rootItem.meta.ancestorIds = parentItem ? parentItem.meta.ancestorIds.concat([parentItem.id]) : [];
        rootItem.meta.parentId = parentItem ? parentItem.id : null;

        traverseItems([rootItem], (item, parentItem) => {
            if (item.id === rootItem.id) {
                return;
            }
            this.itemMap[item.id] = item;
            item.meta.ancestorIds = parentItem ? parentItem.meta.ancestorIds.concat([parentItem.id]) : [];
            item.meta.parentId = parentItem ? parentItem.id : null;
        });
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
        if (this.listener) {
            this.listener.onSchemeChangeCommitted(this.editorId);
        }
        this.updateEditBox();
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
