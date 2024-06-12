import myMath from '../myMath';
import '../typedef';

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function generateAutoLayoutForItem(item, parentItem) {
    /** @type {AutoLayoutRules} */
    const rules = {
        left   : myMath.roundPrecise1(item.area.x),
        top    : myMath.roundPrecise1(item.area.y),
        right  : myMath.roundPrecise1(parentItem.area.w - item.area.x - item.area.w),
        bottom : myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h),
    };


    if (item.area.x > parentItem.area.w * 0.6) {
        rules.width = myMath.roundPrecise1(item.area.w);
        delete rules['left'];
    }
    if (item.area.y > parentItem.area.h * 0.6) {
        rules.height = myMath.roundPrecise1(item.area.h);
        delete rules['top'];
    }
    if (item.area.w + item.area.x < parentItem.area.w * 0.4) {
        rules.width = myMath.roundPrecise1(item.area.w);
        delete rules['right'];
    }
    if (item.area.h + item.area.y < parentItem.area.h * 0.4) {
        rules.height = myMath.roundPrecise1(item.area.h);
        delete rules['bottom'];
    }

    return {
        on: true,
        rules
    };
}

/**
 * @param {Item} item
 * @param {Item} parentItem
 * @param {AutoLayoutRules} rules
 */
export function generateItemAreaByAutoLayoutRules(item, parentItem, rules) {
    const area = { x: 0, y: 0, w: 10, h: 10, r: 0, px: 0.5, py: 0.5, sx: 1, sy: 1 };

    if (rules.hasOwnProperty('width')) {
        area.w = myMath.roundPrecise1(rules.width);
    } else if (rules.hasOwnProperty('relWidth')) {
        area.w = myMath.roundPrecise1(rules.relWidth * parentItem.area.w / 100);
    }

    if (rules.hasOwnProperty('height')) {
        area.h = myMath.roundPrecise1(rules.height);
    } else if (rules.hasOwnProperty('relHeight')) {
        area.h = myMath.roundPrecise1(rules.relHeight * parentItem.area.h / 100);
    }

    if (rules.hcenter) {
        area.x = myMath.roundPrecise1(parentItem.area.w / 2 - area.w / 2);
    } else {
        let leftFixed = false;
        if (rules.hasOwnProperty('left')) {
            leftFixed = true;
            area.x = myMath.roundPrecise1(rules.left);
        } else if (rules.hasOwnProperty('relLeft')) {
            leftFixed = true;
            area.x = myMath.roundPrecise1(rules.relLeft * parentItem.area.w / 100);
        }

        if (rules.hasOwnProperty('right')) {
            if (leftFixed) {
                area.w = myMath.roundPrecise1(parentItem.area.w - rules.right - area.x);
            } else {
                area.x = myMath.roundPrecise1(parentItem.area.w - rules.right - area.w);
            }
        } else if (rules.hasOwnProperty('relRight')) {
            const right = rules.relRight * parentItem.area.w / 100;
            if (leftFixed) {
                area.w = myMath.roundPrecise1(parentItem.area.w - right - area.x);
            } else {
                area.x = myMath.roundPrecise1(parentItem.area.w - right - area.w);
            }
        }
    }

    if (rules.vcenter) {
        area.y = myMath.roundPrecise1(parentItem.area.h / 2 - area.h / 2);
    } else {
        let topFixed = false;
        if (rules.hasOwnProperty('top')) {
            topFixed = true;
            area.y = myMath.roundPrecise1(rules.top);
        } else if (rules.hasOwnProperty('relTop')) {
            topFixed = true;
            area.y = myMath.roundPrecise1(rules.relTop * parentItem.area.h / 100);
        }

        if (rules.hasOwnProperty('bottom')) {
            if (topFixed) {
                area.h = myMath.roundPrecise1(parentItem.area.h - rules.bottom - area.y);
            } else {
                area.y = myMath.roundPrecise1(parentItem.area.h - rules.bottom - area.h);
            }
        } else if (rules.hasOwnProperty('relBottom')) {
            const bottom = rules.relBottom * parentItem.area.h / 100;
            if (topFixed) {
                area.h = myMath.roundPrecise1(parentItem.area.h - bottom - area.y);
            } else {
                area.y = myMath.roundPrecise1(parentItem.area.h - bottom - area.h);
            }
        }
    }

    if (area.w < 0) {
        area.w = 0;
    }
    if (area.h < 0)  {
        area.h = 0;
    }

    return area;
}


/**
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutCenterItemHorizontally(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        return;
    }
    let left = 0;
    let right = parentItem.area.w;

    if (item.autoLayout.rules.hasOwnProperty('left')) {
        left = item.autoLayout.rules.left;
        delete item.autoLayout.rules['left'];
    } else if (item.autoLayout.rules.hasOwnProperty('relLeft')) {
        left = myMath.roundPrecise1(item.autoLayout.rules.relLeft * parentItem.area.w / 100);
        delete item.autoLayout.rules['relLeft'];
    }

    if (item.autoLayout.rules.hasOwnProperty('right')) {
        right = parentItem.area.w - item.autoLayout.rules.right;
        delete item.autoLayout.rules['right'];
    } else if (item.autoLayout.rules.hasOwnProperty('relRight')) {
        right = parentItem.area.w - myMath.roundPrecise1(item.autoLayout.rules.relRight * parentItem.area.w / 100);
        delete item.autoLayout.rules['relRight'];
    }

    if (!item.autoLayout.rules.hasOwnProperty('width')) {
        item.autoLayout.rules.width = Math.abs(myMath.roundPrecise1(right - left));
    }
    item.autoLayout.rules.hcenter = true;
}

/**
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutCenterItemVertically(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        return;
    }

    let top = 0;
    let bottom = parentItem.area.w;

    if (item.autoLayout.rules.hasOwnProperty('top')) {
        top = item.autoLayout.rules.top;
        delete item.autoLayout.rules['top'];
    } else if (item.autoLayout.rules.hasOwnProperty('relTop')) {
        top = myMath.roundPrecise1(item.autoLayout.rules.relTop * parentItem.area.w / 100);
        delete item.autoLayout.rules['relTop'];
    }

    if (item.autoLayout.rules.hasOwnProperty('bottom')) {
        bottom = parentItem.area.h - item.autoLayout.rules.bottom;
        delete item.autoLayout.rules['bottom'];
    } else if (item.autoLayout.rules.hasOwnProperty('relBottom')) {
        bottom = parentItem.area.h - myMath.roundPrecise1(item.autoLayout.rules.relBottom * parentItem.area.w / 100);
        delete item.autoLayout.rules['relBottom'];
    }

    if (!item.autoLayout.rules.hasOwnProperty('height')) {
        item.autoLayout.rules.height = Math.abs(myMath.roundPrecise1(bottom - top));
    }
    item.autoLayout.rules.vcenter = true;

}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutRemoveTop(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        item.autoLayout.rules.top = myMath.roundPrecise1(item.area.x);
        item.autoLayout.rules.bottom = myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h);
        item.autoLayout.rules.vcenter = false;
    } else if (item.autoLayout.rules.hasOwnProperty('top') || item.autoLayout.rules.hasOwnProperty('relTop')) {
        if (item.autoLayout.rules.hasOwnProperty('height') || item.autoLayout.rules.hasOwnProperty('relHeight')) {
            item.autoLayout.rules.bottom = myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h);
        } else {
            item.autoLayout.rules.height = myMath.roundPrecise1(item.area.h);
            if (!item.autoLayout.rules.hasOwnProperty('bottom') || !item.autoLayout.rules.hasOwnProperty('relBottom')) {
                item.autoLayout.rules.bottom = myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h);
            }
        }
        delete item.autoLayout.rules['top'];
        delete item.autoLayout.rules['relTop'];
    }
}


/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchTopToAbsolute(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        item.autoLayout.rules.vcenter = false;
    }
    item.autoLayout.rules.top = myMath.roundPrecise1(item.area.y);

}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchTopToRelative(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        item.autoLayout.rules.vcenter = false;
    }
    let relTop = 0;
    if (!myMath.tooSmall(parentItem.area.h)) {
        relTop = myMath.roundPrecise1(item.area.y / parentItem.area.h);
    }
    item.autoLayout.rules.relTop = relTop;
    delete item.autoLayout.rules['top'];
}