/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {map, forEach} from 'lodash';
import myMath from '../myMath.js';
import utils from '../utils.js';
import shortid from 'shortid';
import Shape from '../components/editor/items/shapes/Shape.js';
import {Item, enrichItemWithDefaults} from './Item.js';


const defaultSchemeStyle = {
    backgroundColor:    'rgba(240,240,240,1.0)',
    gridColor:          'rgba(128,128,128,0.2)',
    boundaryBoxColor:   'rgba(36, 182, 255, 0.8)'
};


/*
how to calculate item top-let corner position
i - level of children (i-1 is the parent item)
P[i]' = P[i-1]' + X[i] * K[i-1] + Y[i] * L[i-1]

how to calculate point on item
P(Xp, Yp, P[i]) = P[i]' + Xp * K[i] + Yp * L[i]
*/

const _zeroTransform = {x: 0, y: 0, r: 0};

function visitItems(items, callback, transform, parentItem, ancestorIds) {
    if (!items) {
        return;
    }
    if (!transform) {
        transform = {x: 0, y: 0, r: 0};
    }
    if (!ancestorIds) {
        ancestorIds = [];
    }
    let cosa = Math.cos(transform.r * Math.PI / 180);
    let sina = Math.sin(transform.r * Math.PI / 180);

    for (let i = 0; i < items.length; i++) {
        callback(items[i], transform, parentItem, ancestorIds);
        if (items[i].childItems) {
            visitItems(items[i].childItems, callback, {
                x:      transform.x + items[i].area.x * cosa - items[i].area.y * sina,
                y:      transform.y + items[i].area.x * sina + items[i].area.y * cosa,
                r:  transform.r + items[i].area.r
            }, items[i], ancestorIds.concat([items[i].id]));
        }
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
        if (!eventBus) {
            throw new Error('Missing eventBus');
        }
        this.scheme = scheme;
        this.screenTransform = {x: 0, y: 0, scale: 1.0};
        this.screenSettings = {width: 700, height: 400, x1: -1000000, y1: -1000000, x2: 1000000, y2: 1000000};
        this.eventBus = eventBus;
        this.selectedItems = [];
        this.activeBoundaryBox = null;
        this.itemMap = {};
        this._itemArray = []; // stores all flatten items (all sub-items are stored as well)
        this.copyBuffer = [];
        this.revision = 0;
        this.viewportItems = []; // used for storing top-level items that are supposed to be located within viewport (ignore offset and zoom)
        this.worldItems = []; // used for storing top-level items with default area
        this.dependencyItemMap = {}; // used for looking up items that should be re-adjusted once the item area is changed (e.g. curve item can be attached to other items)

        this._itemGroupsToIds = {}; // used for quick access to item ids via item groups
        this.itemGroups = []; // stores groups from all items

        // Used for calculating closest point to svg path
        this.shadowSvgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

        this.enrichSchemeWithDefaults(this.scheme);
        this.reindexItems();
    }
    
    enrichSchemeWithDefaults(scheme) {
        if (!scheme.style) {
            scheme.style = {};
        }

        forEach(defaultSchemeStyle, (value, name) => {
            if (!scheme.style[name]) {
                scheme.style[name] = value;
            }
        });
    }

    /**
     * Recalculates transform for each child item of specified item.
     * It is needed when user drags an item that has sub-items.
     * @param {Item} mainItem 
     */
    updateChildTransforms(mainItem) {
        if (mainItem.childItems && mainItem.meta && mainItem.meta.transform) {
            let cosa = Math.cos(mainItem.meta.transform.r * Math.PI / 180);
            let sina = Math.sin(mainItem.meta.transform.r * Math.PI / 180);
            const recalculatedTransform  = {
                x:      mainItem.meta.transform.x + mainItem.area.x * cosa - mainItem.area.y * sina,
                y:      mainItem.meta.transform.y + mainItem.area.x * sina + mainItem.area.y * cosa,
                r:  mainItem.meta.transform.r + mainItem.area.r
            };
            visitItems(mainItem.childItems, (item, transform, parentItem, ancestorIds) => {
                if (!item.meta) {
                    item.meta = {};
                }
                item.meta.transform = transform;
            }, recalculatedTransform, mainItem.meta.ancestorIds);
        }
    }

    reindexItems() {
        //TODO optimize itemMap to not reconstruct it with every change (e.g. reindex only effected items. This obviously needs to be specified from the caller)
        this.itemMap = {};
        this._itemArray = [];
        this.viewportItems = [];
        this.worldItems = [];
        this._itemGroupsToIds = {};

        // stores element selectors with their dependants
        // this will be used once it has visited all items
        // so that it can finally start puting ids of existing items into dependencyItemMap
        const dependencyElementSelectorMap = {};
        const registerDependant = (elementSelector, itemId) => {
            let dependants = dependencyElementSelectorMap[elementSelector] || [];
            dependants.push(itemId);
            dependencyElementSelectorMap[elementSelector] = dependants;
        };

        if (!this.scheme.items) {
            return;
        }
        visitItems(this.scheme.items, (item, transform, parentItem, ancestorIds) => {
            this._itemArray.push(item);
            enrichItemWithDefaults(item);
            this.enrichItemMeta(item, transform, parentItem, ancestorIds);
            if (item.groups) {
                this.indexItemGroups(item.id, item.groups);
            }

            // only storing top-level items 
            if (!parentItem) {
                if (item.area.type === 'viewport') {
                    this.viewportItems.push(item);
                } else {
                    this.worldItems.push(item);
                }
            }

            if (item.id) {
                this.itemMap[item.id] = item;
            }

            if (item.shape === 'curve') {
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
        });

        this.itemGroups = _.keys(this._itemGroupsToIds);
        this.itemGroups.sort();


        this.dependencyItemMap = this.buildDependencyItemMapFromElementSelectors(dependencyElementSelectorMap);
        this.revision += 1;
    }

    buildDependencyItemMapFromElementSelectors(dependencyElementSelectorMap) {
        const dependencyItemMap = {};
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
        return dependencyItemMap;
    }

    /**
     * Used in case an item was moved. This is needed so that we only update transforms (in meta) for objects that are children of this item
     * @param {Item} item - item that was moved or rotated
     */
    reindexItemTransforms(item) {
        if (!item.childItems) {
            return;
        }
        const callback = (childItem, transform, parentItem, ancestorIds) => {
            childItem.meta.transform = transform;
        };
        const parentItem = this.findItemById(item.meta.parentId);
        visitItems(item.childItems, callback, item.meta.transform, parentItem, item.meta.ancestorIds);
    }

    indexItemGroups(itemId, groups) {
        forEach(groups, group => {
            if (!this._itemGroupsToIds.hasOwnProperty(group)) {
                this._itemGroupsToIds[group] = [];
            }
            this._itemGroupsToIds[group].push(itemId);
        })
    }

    enrichItemMeta(item, transform, parentItem, ancestorIds) {
        if (!item.meta) {
            item.meta = {
                collapsed: false, // used only for item tree selector
                collapseBitMask: 0 // used in item tree selector and stores information about parent items collapse state
            };
        }

        item.meta.transform = transform;
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

        const shape = Shape.find(item.shape);
        if (shape && shape.controlPoints) {
            item.meta.controlPoints = shape.controlPoints.make(item);
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
     */
    worldPointOnItem(x, y, item) {
        return myMath.worldPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
    }

    /**
     * Converts world point to local item coords
     * @param {Number} x world position x
     * @param {Number} y world position y
     * @param {Item} item 
     */
    localPointOnItem(x, y, item) {
        return myMath.localPointInArea(x, y, item.area, (item.meta && item.meta.transform) ? item.meta.transform : _zeroTransform);
    }
    
    /**
     * Finds first item that is within specified distance to path
     * @param {Number} x - x axis of world coords
     * @param {Number} y - y axis of world coords
     * @param {Number} d - maximum distance to items path
     * @param {String} excludedId - item that should be excluded
     * @param {Boolean} onlyVisibleItems - specifies whether it should check only items that are visible
     * @param {String} areaType - if specified it will only check items in given type of placement: viewport or relative
     */
    findClosestPointToItems(x, y, d, excludedId, onlyVisibleItems, areaType) {
        // TODO: OPTIMIZE this for scheme with large amount of items. It should not search through all items
        let globalPoint = {x, y};
        let item = null;
        for (let i = 0; i < this._itemArray.length; i++) {
            item = this._itemArray[i];

            const localPoint = this.localPointOnItem(x, y, item);
            
            let doCheckItem = item.id !== excludedId;
            
            if (onlyVisibleItems) {
                doCheckItem = doCheckItem && item.meta.calculatedVisibility;
            }
            if (areaType) {
                doCheckItem = doCheckItem && item.area.type === areaType;
            }

            if (doCheckItem) {
                if (localPoint.x >= -d && localPoint.x <= item.area.w + d && localPoint.y >= -d && localPoint.y < item.area.h + d) {
                    const shape = Shape.find(item.shape);
                    if (shape) {
                        const path = shape.computeOutline(item);
                        if (path) {
                            const closestPoint = this.closestPointToSvgPath(item, path, globalPoint);
                            const squaredDistance = (closestPoint.x - globalPoint.x) * (closestPoint.x - globalPoint.x) + (closestPoint.y - globalPoint.y) * (closestPoint.y - globalPoint.y);
                            if (squaredDistance < d * d) {
                                return {
                                    x                 : closestPoint.x,
                                    y                 : closestPoint.y,
                                    distanceOnPath    : closestPoint.distanceOnPath,
                                    itemId            : item.id
                                };
                            }
                        }
                    }
                }
            }
        }
        return null;
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
        }) ;

        const schemeBoundaryBox = {
            x: range.x1,
            y: range.y1,
            w: range.x2 - range.x1,
            h: range.y2 - range.y1,
        };

        return schemeBoundaryBox;
    }

    /**
     * Should be invoked each time an area or path of item changes
     * @param {String} changedItemId
     * @param {Boolean} isSoft specifies whether this is just a preview readjustment (e.g. curve items need to readjust their area, but only when user stopped dragging)
     */
    readjustItem(changedItemId, isSoft) {
        this._readjustItem(changedItemId, {}, isSoft);
    }

    /**
     * 
     * @param {*} changedItem 
     * @param {*} visitedItems - tracks all items that were already visited. Need in order to exclude eternal loops
     */
    _readjustItem(changedItemId, visitedItems, isSoft) {
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
            shape.readjustItem(item, this, isSoft);
            this.eventBus.emitItemChanged(item.id);
        }

        // searching for items that depend on changed item
        if (this.dependencyItemMap[changedItemId]) {
            forEach(this.dependencyItemMap[changedItemId], dependantItemId => {
                this._readjustItem(dependantItemId, visitedItems, isSoft);
            });
        }

        // scanning through children of the item and readjusting them as well
        forEach(item.childItems, childItem => {
            this._readjustItem(childItem.id, visitedItems, isSoft);
        });
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
        if (otherItem && _.indexOf(otherItem.meta.ancestorIds, item.id) >= 0) {
            return;
        }

        // Recalculating item area so that its world coords would match under new transform
        const worldPoint = this.worldPointOnItem(0, 0, item);
        let newLocalPoint = {
            x: worldPoint.x, y: worldPoint.y
        }
        if (otherItem) {
            newLocalPoint = this.localPointOnItem(worldPoint.x, worldPoint.y, otherItem);
        }

        let parentItem = null;
        let angleCorrection = 0;
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            parentItem = this.findItemById(item.meta.parentId);
            if (!parentItem) {
                return;
            }
            angleCorrection += parentItem.meta.transform.r + parentItem.area.r;
            itemsArray = parentItem.childItems;
        }
        if (otherItem && otherItem.meta && otherItem.meta.transform) {
            angleCorrection -= otherItem.meta.transform.r + otherItem.area.r;
        }

        const index = _.findIndex(itemsArray, it => it.id === itemId);
        if (index < 0) {
            return;
        }

        // removing item from its original position in array
        itemsArray.splice(index, 1);

        let newItemsArray = this.scheme.items;
        if (otherItem) {
            if (!otherItem.childItems) {
                otherItem.childItems = [];
            }
            newItemsArray = otherItem.childItems;
        }
        newItemsArray.splice(position, 0, item);

        item.area.x = newLocalPoint.x;
        item.area.y = newLocalPoint.y;
        item.area.r += angleCorrection;

        this.reindexItems();
    }

    remountItemAfterOtherItem(itemId, otherItemId) {
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

        const index = _.findIndex(itemsArray, it => it.id === otherItemId);
        if (index < 0) {
            return;
        }

        let parentId = null;
        if (parent) {
            parentId = parent.id;
        }
        this.remountItemInsideOtherItem(itemId, parentId, index + 1);
    }

    closestPointToSvgPath(item, path, globalPoint) {
        // in order to include all parent items transform into closest point finding we need to first bring the global point into local transform
        const localPoint = this.localPointOnItem(globalPoint.x, globalPoint.y, item);

        if (!this.shadowSvgPath) {
            this.shadowSvgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        }
        this.shadowSvgPath.setAttribute('d', path);
        const closestPoint = myMath.closestPointOnPath(localPoint.x, localPoint.y, this.shadowSvgPath);
        const worldPoint = this.worldPointOnItem(closestPoint.x, closestPoint.y, item);
        worldPoint.distanceOnPath = closestPoint.distance;
        return worldPoint;
    }

    getSelectedItems() {
        return this.selectedItems;
    }


    deleteItem(item) {
        let itemsArray = this.scheme.items;
        if (item.meta.parentId) {
            const parentItem = this.findItemById(item.meta.parentId);
            if (!parentItem || !parentItem.childItems) {
                return;
            }
            itemsArray = parentItem.childItems;
        }

        const index = _.findIndex(itemsArray, it => it.id === item.id);
        if (index < 0) {
            return;
        }

        itemsArray.splice(index, 1);
    }

    deleteSelectedItems() {
        if (this.selectedItems && this.selectedItems.length > 0) {
            forEach(this.selectedItems, item => {
                this.deleteItem(item);
            });

            this.selectedItems = [];
            this.reindexItems();
        }
    }

    addItem(item) {
        if (!item.hasOwnProperty('meta')) {
            item.meta = {}
        }
        item.meta.hovered = false;
        item.meta.selected = false;
        item.meta.controlPoints = [];
        if (!item.id) {
            item.id = shortid.generate();
        }
        this.scheme.items.push(item);
        this.reindexItems();
        return item;
    }

    getItems() {
        return this._itemArray;
    }

    setActiveBoundaryBox(area) {
        this.activeBoundaryBox = area;
    }

    isItemSelected(item) {
        return item.meta.selected || false;
    }

    /**
     * Selects a specified item and deselects any other items that were selected previously
     * @param {SchemeItem} item 
     * @param {boolean} inclusive Flag that specifies whether it should deselect other items
     */
    selectItem(item, inclusive) {
        if (inclusive) {
            this.selectItemInclusive(item);
            this.eventBus.emitItemSelected(item.id);
        } else {
            const deselectedItemIds = [];
            forEach(this.selectedItems, selectedItem => {
                if (selectedItem.id !== item.id) {
                    selectedItem.meta.selected = false;
                    deselectedItemIds.push(selectedItem.id);
                }
            });
            item.meta.selected = true;
            this.selectedItems = [];
            forEach(deselectedItemIds, itemId => this.eventBus.emitItemDeselected(itemId));

            this.selectItemInclusive(item);
            this.eventBus.emitItemSelected(item.id);
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
            item.meta.selected = false;
        });
        this.selectedItems = [];

        // First we should reset selectedItems array and only then emit event for each event
        // Some components check selectedItems array to get information whether item is selected or not
        forEach(itemIds, itemId => this.eventBus.emitItemDeselected(itemId));
    }

    selectByBoundaryBox(box) {
        forEach(this.getItems(), item => {
            const points = [ 
                {x: 0, y: 0}, 
                {x: item.area.w, y: 0},
                {x: item.area.w, y: item.area.h},
                {x: 0, y: item.area.h},
            ];

            let isInArea = true;

            for(let i = 0; i < points.length && isInArea; i++) {
                const wolrdPoint = this.worldPointOnItem(points[i].x, points[i].y, item);
                isInArea = myMath.isPointInArea(wolrdPoint.x, wolrdPoint.y, box);
            }

            if (isInArea) {
                this.selectedItems.push(item);
                item.meta.selected = true;
            }
        });
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

            if (itemArray[i].meta.selected) {
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

            if (itemArray[i].meta.selected) {
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
        this.copyBuffer = [].concat(this.selectedItems);
        this.copyBuffer = [];
        forEach(this.selectedItems, item => {
            this.copyBuffer.push(utils.clone(item));
        });
    }

    pasteSelectedItems() {
        if (!this.copyBuffer || this.copyBuffer.length === 0) {
            return;
        }
        this.deselectAllItems();

        let preserveParent = true;
        let i = 1;
        while(i < this.copyBuffer.length && preserveParent) {
            if (this.copyBuffer[i].id !== this.copyBuffer[0].id) {
                preserveParent = false;
            }
            i += 1;
        }

        const copiedItemIds = {};
        forEach(this.copyBuffer, item => {
            // checking whether any of ancestors were already copied for this item
            // as we don't need to copy it twice
            if (!_.find(item.meta.ancestorIds, ancestorId => copiedItemIds[ancestorId] === 1)) {
                copiedItemIds[item.id] = 1;
                const worldPoint = this.worldPointOnItem(0, 0, item);

                const newItem = this.copyItem(item);
                newItem.name = item.name + ' copy';
                newItem.area.x = worldPoint.x;
                newItem.area.y = worldPoint.y;
                if (item.meta.transform) {
                    newItem.area.r += item.meta.transform.r;
                }

                let parentItems = this.scheme.items;
                if (preserveParent) {
                    if (item.meta && item.meta.parentId) {
                        const parentItem = this.findItemById(item.meta.parentId);
                        if (parentItem) {
                            parentItems = parentItem.childItems;
                            // modifying area back since we keep the same parent
                            newItem.area = utils.clone(item.area);
                        }
                    }
                }

                parentItems.push(newItem);
                this.selectItem(newItem, true);
            }
        });

        this.reindexItems();
    }

    copyItem(oldItem) {
        const newItem = {
            id: shortid.generate(),
            meta: {
                hovered: false,
                selected: false
            }
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
}


export default SchemeContainer;
