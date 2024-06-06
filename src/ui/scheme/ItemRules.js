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
    id: H_CENTER,
    name: 'Horizontally centered',
    description: 'Centered horizontally inside of the item it is attached to',
    stage: 0,
    useValue: false,
    useRef: false,
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!parentItem) {
            return null;
        }
        const lpy = item.area.y + item.area.h / 2;
        return [{
            t: 'line',
            pattern: 'solid',
            p1: worldPointOnItem(0, lpy, parentItem),
            p2: worldPointOnItem(item.area.x, lpy, parentItem),
        }, {
            t: 'line',
            pattern: 'solid',
            p1: worldPointOnItem(item.area.x + item.area.w, lpy, parentItem),
            p2: worldPointOnItem(parentItem.area.w, lpy, parentItem),
        }];
    }
}, {
    id: V_CENTER,
    name: 'Vertically centered',
    description: 'Centered vertically inside of the item it is attached to',
    stage: 0,
    useValue: false,
    useRef: false,
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!parentItem) {
            return null;
        }
        const lpx = item.area.x + item.area.w / 2;
        return [{
            t: 'line',
            pattern: 'solid',
            p1: worldPointOnItem(lpx, 0, parentItem),
            p2: worldPointOnItem(lpx, item.area.y, parentItem),
        }, {
            t: 'line',
            pattern: 'solid',
            p1: worldPointOnItem(lpx, item.area.y + item.area.h, parentItem),
            p2: worldPointOnItem(lpx, parentItem.area.h, parentItem),
        }];
    }
}, {
    id: INSIDE_RIGHT,
    name: 'Inside right',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the right edge',
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!parentItem) {
            return null;
        }
        const w = parentItem.area.w - item.area.w - item.area.x;
        if (w <= 0) {
            return [];
        }

        const lpy = item.area.y + item.area.h / 2;
        const p1 = worldPointOnItem(item.area.x + item.area.w, lpy, parentItem);
        const p2 = worldPointOnItem(parentItem.area.w, lpy, parentItem);
        const guides = [ {
            t: 'line',
            pattern: 'solid',
            p1,
            p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];

        return guides;
    }
}, {
    id: INSIDE_LEFT,
    name: 'Inside left',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the left edge',
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!parentItem) {
            return null;
        }
        const w = item.area.x;
        if (w <= 0) {
            return [];
        }

        const lpy = item.area.y + item.area.h / 2;
        const p1 = worldPointOnItem(item.area.x, lpy, parentItem);
        const p2 = worldPointOnItem(0, lpy, parentItem);
        const guides = [ {
            t: 'line',
            pattern: 'solid',
            p1,
            p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];
        return guides;
    }
}, {
    id: INSIDE_TOP,
    name: 'Inside top',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the top edge',
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!parentItem) {
            return null;
        }
        const w = item.area.y;
        if (w <= 0) {
            return [];
        }

        const lpx = item.area.x + item.area.w / 2;
        const p1 = worldPointOnItem(lpx, item.area.y, parentItem);
        const p2 = worldPointOnItem(lpx, 0, parentItem);
        const guides = [ {
            t: 'line',
            pattern: 'solid',
            p1,
            p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];
        return guides;
    }
}, {
    id: INSIDE_BOTTOM,
    name: 'Inside bottom',
    useValue: true,
    useRef: false,
    stage: 0,
    description: 'Inside its parent from the bottom edge',
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!parentItem) {
            return null;
        }
        const w = parentItem.area.h - item.area.h - item.area.y;
        if (w <= 0) {
            return [];
        }

        const lpx = item.area.x + item.area.w / 2;
        const p1 = worldPointOnItem(lpx, item.area.y + item.area.h, parentItem);
        const p2 = worldPointOnItem(lpx, parentItem.area.h, parentItem);
        const guides = [ {
            t: 'line',
            pattern: 'solid',
            p1,
            p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];

        return guides;
    }
}, {
    id: LEFT_OF,
    name: 'Left of',
    stage: 1,
    useRef: true,
    useValue: true,
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!refItem || !refBox) {
            return null;
        }
        const w = itemBox.x - refBox.x - refBox.w
        if (w <= 0) {
            return [];
        }

        const lpy = itemBox.y + itemBox.h / 2;
        const p1 = { x: refBox.x + refBox.w,    y: lpy };
        const p2 = { x :itemBox.x,              y: lpy };
        const guides = [ {
            t: 'line', pattern: 'solid', p1, p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];
        return guides;
    }
}, {
    id: RIGHT_OF,
    name: 'Right of',
    stage: 1,
    useValue: true,
    useRef: true,
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!refItem || !refBox) {
            return null;
        }
        const w = refBox.x - itemBox.x - itemBox.w;
        if (w <= 0) {
            return [];
        }

        const lpy = itemBox.y + itemBox.h / 2;
        const p1 = { x: itemBox.x + itemBox.w,  y: lpy };
        const p2 = { x: refBox.x,               y: lpy };
        const guides = [ {
            t: 'line', pattern: 'solid', p1, p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];
        return guides;
    }
}, {
    id: ABOVE,
    name: 'Above',
    stage: 1,
    useValue: true,
    useRef: true,
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!refItem || !refBox) {
            return null;
        }
        const w = refBox.y - itemBox.y - itemBox.h;
        if (w <= 0) {
            return [];
        }

        const lpx = itemBox.x + itemBox.w / 2;
        const p1 = { x: lpx,  y: itemBox.y + itemBox.h };
        const p2 = { x: lpx,  y: refBox.y };
        const guides = [ {
            t: 'line', pattern: 'solid', p1, p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];
        return guides;
    }
}, {
    id: BELOW,
    name: 'Below',
    stage: 1,
    useValue: true,
    useRef: true,
    createGuides(rule, item, itemBox, parentItem, refItem, refBox) {
        if (!refItem || !refBox) {
            return null;
        }
        const w = itemBox.y - refBox.y - refBox.h;
        if (w <= 0) {
            return [];
        }

        const lpx = itemBox.x + itemBox.w / 2;
        const p1 = { x: lpx,  y: refBox.y + refBox.h};
        const p2 = { x: lpx,  y: itemBox.y };
        const guides = [ {
            t: 'line', pattern: 'solid', p1, p2,
        }, {
            t: 'label',
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
            limit: myMath.distanceBetweenPoints(p1.x, p1.y, p2.x, p2.y),
            text: '' + Math.floor(rule.v),
        }];
        return guides;
    }
}, {
    id: MAX_WIDTH,
    name: 'Max width',
    stage: 2,
    useValue: true,
    useRef: false
}, {
    id: MIN_WIDTH,
    name: 'Min width',
    stage: 2,
    useValue: true,
    useRef: false
}, {
    id: MAX_HEIGHT,
    name: 'Max height',
    stage: 2,
    useValue: true,
    useRef: false
}, {
    id: MIN_HEIGHT,
    name: 'Min height',
    stage: 2,
    useValue: true,
    useRef: false
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
 */
export function generateItemRuleGuides(item, schemeContainer) {
    const allGuides = [];

    if (!item.rules || item.rules.length === 0) {
        return [];
    }

    const itemBox = getBoundingBoxOfItems([item]);
    const parentItem = (item.meta && item.meta.parentId) ? schemeContainer.findItemById(item.meta.parentId) : null;

    item.rules.forEach((rule, ruleIdx) => {
        const ruleDef = getItemRuleDefinitionById(rule.t);
        if (!ruleDef || !ruleDef.createGuides) {
            return;
        }

        let refBox = null;
        let refItem = null;
        if (rule.ref) {
            refItem = schemeContainer.findFirstElementBySelector(rule.ref);
            if (refItem) {
                refBox = getBoundingBoxOfItems([refItem]);
            }
        }
        const ruleGuides = ruleDef.createGuides(rule, item, itemBox, parentItem, refItem, refBox);
        if (ruleGuides) {
            ruleGuides.forEach(ruleGuide => {
                ruleGuide.ruleIdx = ruleIdx;
                allGuides.push(ruleGuide);
            });
        }
    });

    return allGuides;
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyLeftOf(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyRightOf(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyAbove(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyBelow(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyMaxWidth(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyMinWidth(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyMaxHeight(item, edges, rule, parentItem, refItem, refBox) {
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
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyMinHeight(item, edges, rule, parentItem, refItem, refBox) {
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


/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyHorizontalCentered(item, edges, rule, parentItem, refItem, refBox) {
    if (!parentItem) {
        return;
    }
    item.area.x = parentItem.area.w / 2 - item.area.w / 2;
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyVerticallyCentered(item, edges, rule, parentItem, refItem, refBox) {
    if (!parentItem) {
        return;
    }
    item.area.y = parentItem.area.h / 2 - item.area.h / 2;
}


/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyInsideLeft(item, edges, rule, parentItem, refItem, refBox) {
    if (!parentItem) {
        return;
    }
    item.area.x = rule.v;
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyInsideTop(item, edges, rule, parentItem, refItem, refBox) {
    if (!parentItem) {
        return;
    }
    item.area.y = rule.v;
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyInsideRight(item, edges, rule, parentItem, refItem, refBox) {
    if (!parentItem) {
        return;
    }
    item.area.x = parentItem.area.w - item.area.w - rule.v;
}

/**
 * @param {Item} item
 * @param {ItemEdges} edges
 * @param {ItemRule} rule
 * @param {Item} parentItem
 * @param {Item} refItem
 * @param {Area} refBox
 * @returns
 */
function applyInsideBottom(item, edges, rule, parentItem, refItem, refBox) {
    if (!parentItem) {
        return;
    }
    item.area.y = parentItem.area.h - item.area.h - rule.v;
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
ruleHandlers[H_CENTER] = applyHorizontalCentered;
ruleHandlers[V_CENTER] = applyVerticallyCentered;
ruleHandlers[INSIDE_LEFT] = applyInsideLeft;
ruleHandlers[INSIDE_RIGHT] = applyInsideRight;
ruleHandlers[INSIDE_TOP] = applyInsideTop;
ruleHandlers[INSIDE_BOTTOM] = applyInsideBottom;


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
                const parentItem = item.meta && item.meta.parentId ? schemeContainer.findItemById(item.meta.parentId) : null;
                if (ruleHandlers.hasOwnProperty(rule.t)) {
                    ruleHandlers[rule.t](item, edges, rule, parentItem, refItem, refBox);
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
