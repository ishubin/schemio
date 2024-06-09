/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from "../myMath";
import  { getBoundingBoxOfItems, localPointOnItem, localPointOnItemToLocalPointOnOtherItem, worldPointOnItem } from "./ItemMath";


/**
 * @typedef {Object} ItemEdges
 * @property {Boolean} leftFixed
 * @property {Boolean} rightFixed
 * @property {Boolean} topFixed
 * @property {Boolean} bottomFixed
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

function applyRightOf(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    const dx = itemBox.x - refBox.x - refBox.w - rule.v;
    if (edges.rightFixed) {
        itemBox.x -= dx;
        itemBox.w = Math.max(0, itemBox.w + dx);
    } else {
        itemBox.x -= dx;
    }
    edges.leftFixed = true;
    return itemBox;
}

function applyLeftOf(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    const dx = refBox.x - (itemBox.x + itemBox.w) - rule.v
    if (edges.leftFixed) {
        itemBox.w += dx;
    } else {
        itemBox.x += dx;
    }
    edges.rightFixed = true;
    return itemBox;
}

function applyAbove(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    const dy = refBox.y - (itemBox.y + itemBox.h) - rule.v
    if (edges.topFixed) {
        itemBox.h += dy;
    } else {
        itemBox.y += dy;
    }
    edges.bottomFixed = true;
    return itemBox;
}

function applyBelow(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    const dy = itemBox.y - refBox.y - refBox.h - rule.v;
    if (edges.bottomFixed) {
        itemBox.y -= dy;
        itemBox.h = Math.max(0, itemBox.h + dy);
    } else {
        itemBox.y -= dy;
    }
    edges.topFixed = true;
    return itemBox;
}

function applyMaxWidth(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyMinWidth(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyMaxHeight(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyMinHeight(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyHorizontalCentered(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyVerticallyCentered(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyInsideLeft(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyInsideTop(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyInsideRight(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
}

function applyInsideBottom(item, edges, itemBox, rule, parentItem, refItem, refBox) {
    return itemBox;
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
    if (!rules || rules.length === 0) {
        return;
    }

    /** @type {ItemEdges} */
    const edges = {
        leftFixed: false,
        topFixed: false,
        rightFixed: false,
        bottomFixed: false
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

    const parentItem = item.meta && item.meta.parentId ? schemeContainer.findItemById(item.meta.parentId) : null;
    let itemBox = getBBoxRelativeToItemTransform(item, parentItem);
    const itemBoxArea = {
        ...itemBox,
        r: 0,
        px: 0,
        py: 0,
        sx: 1,
        sy: 1
    };

    // We need to project the item top-left and bottom-right points onto itemBox.
    // Once the itemBox gets modified by various rules, it project back the points in order to adjust item area

    const projectPoint = (x, y) => {
        const p = parentItem ? localPointOnItemToLocalPointOnOtherItem(x, y, item, parentItem) : worldPointOnItem(x, y, item);
        const lp = myMath.localPointInArea(p.x, p.y, itemBoxArea);
        if (itemBox.w > 0) {
            lp.x = lp.x / itemBox.w;
        }
        if (itemBox.h > 0) {
            lp.y = lp.y / itemBox.h;
        }
        return lp;
    };
    const topLeftProjection = projectPoint(0, 0);
    const bottomRightProjection = projectPoint(item.area.w, item.area.h);

    for(let i = 0; i <= maxStage; i++) {
        if (ruleStages.hasOwnProperty(i)) {
            ruleStages[i].forEach(rule => {
                let refItem = null;
                let refBox = null;
                if (rule.ref) {
                    refItem = schemeContainer.findFirstElementBySelector(rule.ref);
                }
                if (refItem) {
                    refBox = getBBoxRelativeToItemTransform(refItem, parentItem);
                }
                if (ruleHandlers.hasOwnProperty(rule.t)) {
                    itemBox = ruleHandlers[rule.t](item, edges, itemBox, rule, parentItem, refItem, refBox);
                }
            });
        }
    }

    const projectBack = (x, y) => {
        const lx = x * itemBox.w + itemBox.x;
        const ly = y * itemBox.h + itemBox.y;

        return parentItem ? worldPointOnItem(lx, ly, parentItem) : {x: lx, y: ly};
    };

    const worldTopLeft = projectBack(topLeftProjection.x, topLeftProjection.y);

    const newPoint = myMath.findTranslationMatchingWorldPoint(worldTopLeft.x, worldTopLeft.y, 0, 0, item.area, item.meta.transformMatrix);

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

    const worldBottomRight = projectBack(bottomRightProjection.x, bottomRightProjection.y);
    const localBottomRight = localPointOnItem(worldBottomRight.x, worldBottomRight.y, item);
    modifiedArea.w = Math.max(0, localBottomRight.x);
    modifiedArea.h = Math.max(0, localBottomRight.y);

    item.area.x = modifiedArea.x;
    item.area.y = modifiedArea.y;
    item.area.w = modifiedArea.w;
    item.area.h = modifiedArea.h;
}


/**
 * Calculates bounding box relative to the transform `relativeItem`
 * @param {Item} boxItem
 * @param {Item|undefined} relativeItem
 * @returns {Area}
 */
function getBBoxRelativeToItemTransform(boxItem, relativeItem) {
    const points = [
        {x: 0, y: 0},
        {x: boxItem.area.w, y: 0},
        {x: boxItem.area.w, y: boxItem.area.h},
        {x: 0, y: boxItem.area.h},
    ];

    let range = null;

    points.forEach(p => {
        const wp = worldPointOnItem(p.x, p.y, boxItem);
        const lp = relativeItem ? localPointOnItem(wp.x, wp.y, relativeItem) : wp;

        if (!range) {
            range = {
                x1: lp.x,
                x2: lp.x,
                y1: lp.y,
                y2: lp.y,
            }
        } else {
            if (range.x1 > lp.x) {
                range.x1 = lp.x;
            }
            if (range.x2 < lp.x) {
                range.x2 = lp.x;
            }
            if (range.y1 > lp.y) {
                range.y1 = lp.y;
            }
            if (range.y2 < lp.y) {
                range.y2 = lp.y;
            }
        }

    });

    return {
        x: range.x1,
        y: range.y1,
        w: range.x2 - range.x1,
        h: range.y2 - range.y1,
    };
}