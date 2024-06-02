/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { forEach } from "../collections";
import myMath from "../myMath";
import  { getBoundingBoxOfItems, localPointOnItem, worldPointOnItem } from "./ItemMath";


/**
 * @typedef {Object} ItemEdge
 * @property {Number} value
 */

/**
 * @typedef {Object} ItemEdges
 * @property {ItemEdge} left
 * @property {ItemEdge} right
 * @property {ItemEdge} top
 * @property {ItemEdge} bottom
 */


const LEFT_OF = 'left-of';
const RIGHT_OF = 'right-of';
const ABOVE = 'above';
const BELOW = 'below';

const H_CENTER = 'hcenter';
const V_CENTER = 'vcenter';

const MAX_WIDTH = 'max-width';
const MIN_WIDTH = 'min-width';
const MAX_HEIGHT = 'max-height';
const MIN_HEIGHT = 'min-height';

export const knownRuleTypes = [{
    id: LEFT_OF,
    name: 'Left of',
}, {
    id: RIGHT_OF,
    name: 'Right of',
}, {
    id: ABOVE,
    name: 'Above',
}, {
    id: BELOW,
    name: 'Below',
}, {
    id: H_CENTER,
    name: 'Horizontally centered on',
}, {
    id: V_CENTER,
    name: 'Vertically centered on',
}, {
    id: MAX_WIDTH,
    name: 'Max width',
}, {
    id: MIN_WIDTH,
    name: 'Min width',
}, {
    id: MAX_HEIGHT,
    name: 'Max height',
}, {
    id: MIN_HEIGHT,
    name: 'Min height',
}];


/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyLeftOf(item, edges, rule, refItem, refBox) {
    if (!refBox) {
        return;
    }

    edges.left = { value: refBox.x + refBox.w + rule.v };
    if (!edges.right) {
        edges.right = { value: edges.left.value + item.area.w };
    }
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyRightOf(item, edges, rule, refItem, refBox) {
    if (!refBox) {
        return;
    }

    edges.right = { value: refBox.x - rule.v };
    if (!edges.left) {
        edges.left = { value: edges.right.value - item.area.w };
    }
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyAbove(item, edges, rule, refItem, refBox) {
    if (!refBox) {
        return;
    }

    edges.bottom = { value: refBox.y - rule.v };
    if (!edges.top) {
        edges.top = { value: edges.bottom.value - item.area.h };
    }
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyBelow(item, edges, rule, refItem, refBox) {
    if (!refBox) {
        return;
    }

    edges.top = { value: refBox.y + refBox.h + rule.v };
    if (!edges.bottom) {
        edges.bottom = { value: edges.top.value + item.area.h };
    }
}

const ruleHandlers = {};
ruleHandlers[LEFT_OF] = applyLeftOf;
ruleHandlers[RIGHT_OF] = applyRightOf;
ruleHandlers[ABOVE] = applyAbove;
ruleHandlers[BELOW] = applyBelow;


/**
 * @param {Item} item
 * @param {Array<ItemRule>} rules
 * @param {SchemeContainer} schemeContainer
 */
export function readjustItemAreaByRules(item, rules, schemeContainer) {

    /** @type {ItemEdges} */
    const edges = {
        left: null,
        right: null,
        top: null,
        bottom: null
    };


    rules.forEach(rule => {
        let refItem = null;
        let refBox = null;
        if (rule.ref) {
            refItem = schemeContainer.findFirstElementBySelector(rule.ref);
        }
        if (refItem) {
            refBox = getBoundingBoxOfItems([refItem]);
        }
        if (ruleHandlers.hasOwnProperty(rule.t)) {
            ruleHandlers[rule.t](item, edges, rule, refItem, refBox);
        }
    });

    if (edges.left && edges.right) {
        const wp = worldPointOnItem(0, 0, item);
        const np = myMath.findTranslationMatchingWorldPoint(edges.left.value, wp.y, 0, 0, item.area, item.meta.transformMatrix);
        if (np) {
            item.area.x = np.x;
        }
        const worldWidth = Math.max(0, edges.right.value - edges.left.value);
        item.area.w = worldWidth;
    }


    if (edges.top && edges.bottom) {
        const wp = worldPointOnItem(0, 0, item);
        const np = myMath.findTranslationMatchingWorldPoint(wp.x, edges.top.value, 0, 0, item.area, item.meta.transformMatrix);
        if (np) {
            item.area.y = np.y;
        }
        const worldHeight = Math.max(0, edges.bottom.value - edges.top.value);
        item.area.h = worldHeight;
    }
}
