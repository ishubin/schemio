/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from "../myMath";
import  { getBoundingBoxOfItems, worldPointOnItem } from "./ItemMath";


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
 * @property {Boolean} leftAligned - flag that specifies whether the item should be considered aligned to the left when constraining its width
 * @property {Boolean} topAligned - flag that specifies whether the item should be considered aligned to the top when constraining its height
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

const INSIDE_TOP = 'inside-top';
const INSIDE_BOTTOM = 'inside-bottom';
const INSIDE_LEFT = 'inside-left';
const INSIDE_RIGHT = 'inside-right';

export const knownRuleTypes = [{
    id: LEFT_OF,
    name: 'Left of',
    stage: 0,
    useRef: true,
    useValue: true
}, {
    id: RIGHT_OF,
    name: 'Right of',
    stage: 0,
    useValue: true,
    useRef: true
}, {
    id: ABOVE,
    name: 'Above',
    stage: 0,
    useValue: true,
    useRef: true
}, {
    id: BELOW,
    name: 'Below',
    stage: 0,
    useValue: true,
    useRef: true
}, {
    id: H_CENTER,
    name: 'Horizontally centered',
    description: 'Centered horizontally inside of the item it is attached to',
    stage: 0,
    useValue: false,
    useRef: false
}, {
    id: V_CENTER,
    name: 'Vertically centered',
    description: 'Centered vertically inside of the item it is attached to',
    stage: 0,
    useValue: false,
    useRef: false
}, {
    id: MAX_WIDTH,
    name: 'Max width',
    stage: 1,
    useValue: true,
    useRef: false
}, {
    id: MIN_WIDTH,
    name: 'Min width',
    stage: 1,
    useValue: true,
    useRef: false
}, {
    id: MAX_HEIGHT,
    name: 'Max height',
    stage: 1,
    useValue: true,
    useRef: false
}, {
    id: MIN_HEIGHT,
    name: 'Min height',
    stage: 1,
    useValue: true,
    useRef: false
}, {
    id: INSIDE_RIGHT,
    name: 'Inside right',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the right edge',
}, {
    id: INSIDE_LEFT,
    name: 'Inside left',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the left edge'
}, {
    id: INSIDE_TOP,
    name: 'Inside top',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the top edge'
}, {
    id: INSIDE_BOTTOM,
    name: 'Inside bottom',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the bottom edge'
}];

let maxStage = 0;
const rulesDefById = {};
knownRuleTypes.forEach(ruleDef => {
    rulesDefById[ruleDef.id] = ruleDef;
    if (maxStage < ruleDef.stage) {
        maxStage = ruleDef.stage;
    }
});

export function getItemRuleDefinitionById(ruleId) {
    return rulesDefById[ruleId];
}


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

    edges.leftAligned = true;

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

    edges.leftAligned = false;

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

    edges.topAligned = true;

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

    edges.topAligned = false;

    edges.top = { value: refBox.y + refBox.h + rule.v };
    if (!edges.bottom) {
        edges.bottom = { value: edges.top.value + item.area.h };
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
function applyMaxWidth(item, edges, rule, refItem, refBox) {
    if (!edges.left || !edges.right) {
        if (item.area.w > rule.v) {
            item.area.w = rule.v;
        }
        return;
    }

    const width = edges.right.value - edges.left.value;
    if (width < rule.v) {
        return;
    }

    if (edges.leftAligned) {
        edges.right.value = edges.left.value + rule.v;
    } else {
        edges.left.value = edges.right.value - rule.v;
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
function applyMinWidth(item, edges, rule, refItem, refBox) {
    if (!edges.left || !edges.right) {
        if (item.area.w < rule.v) {
            item.area.w = rule.v;
        }
        return;
    }

    const width = edges.right.value - edges.left.value;
    if (width > rule.v) {
        return;
    }

    if (edges.leftAligned) {
        edges.right.value = edges.left.value + rule.v;
    } else {
        edges.left.value = edges.right.value - rule.v;
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
function applyMaxHeight(item, edges, rule, refItem, refBox) {
    if (!edges.top || !edges.bottom) {
        if (item.area.h > rule.v) {
            item.area.h = rule.v;
        }
        return;
    }

    const height = edges.bottom.value - edges.top.value;
    if (height < rule.v) {
        return;
    }

    if (edges.topAligned) {
        edges.bottom.value = edges.top.value + rule.v;
    } else {
        edges.top.value = edges.bottom.value - rule.v;
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
function applyMinHeight(item, edges, rule, refItem, refBox) {
    if (!edges.top || !edges.bottom) {
        if (item.area.h < rule.v) {
            item.area.h = rule.v;
        }
        return;
    }

    const height = edges.bottom.value - edges.top.value;
    if (height > rule.v) {
        return;
    }

    if (edges.topAligned) {
        edges.bottom.value = edges.top.value + rule.v;
    } else {
        edges.top.value = edges.bottom.value - rule.v;
    }
}


const ruleHandlers = {};
ruleHandlers[LEFT_OF] = applyLeftOf;
ruleHandlers[RIGHT_OF] = applyRightOf;
ruleHandlers[ABOVE] = applyAbove;
ruleHandlers[BELOW] = applyBelow;
ruleHandlers[MAX_WIDTH] = applyMaxWidth;
ruleHandlers[MIN_WIDTH] = applyMinWidth;
ruleHandlers[MAX_HEIGHT] = applyMaxHeight;
ruleHandlers[MIN_HEIGHT] = applyMinHeight;


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
        bottom: null,
        leftAligned: true,
        topAligned: true
    };

    const ruleStages = {};

    rules.forEach(rule => {
        const ruleDef = rulesDefById[rule.t];
        if (!ruleDef) {
            return;
        }
        if (!ruleStages.hasOwnProperty(ruleDef.stage)) {
            ruleStages[ruleDef.stage] = [];
        }
        ruleStages[ruleDef.stage].push(rule);
    });


    for(let i = 0; i < 2; i++) {
        if (ruleStages.hasOwnProperty(i)) {
            ruleStages[i].forEach(rule => {
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
        }
    }

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
