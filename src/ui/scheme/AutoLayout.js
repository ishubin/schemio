import myMath from '../myMath';
import '../typedef';
import { worldPointOnItem } from './ItemMath';

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
        item.autoLayout.rules.bottom = myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h);
        item.autoLayout.rules.height = myMath.roundPrecise1(item.area.h);
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
    }
    delete item.autoLayout.rules['top'];
    delete item.autoLayout.rules['relTop'];
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
    if (item.autoLayout.rules.hasOwnProperty('bottom') || item.autoLayout.rules.hasOwnProperty('relBottom')) {
        delete item.autoLayout.rules['height'];
        delete item.autoLayout.rules['relHeight'];
    }

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
        relTop = myMath.roundPrecise1(100 * item.area.y / parentItem.area.h);
    }
    item.autoLayout.rules.relTop = relTop;
    delete item.autoLayout.rules['top'];
    if (item.autoLayout.rules.hasOwnProperty('bottom') || item.autoLayout.rules.hasOwnProperty('relBottom')) {
        delete item.autoLayout.rules['height'];
        delete item.autoLayout.rules['relHeight'];
    }
}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutRemoveBottom(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        item.autoLayout.rules.top = myMath.roundPrecise1(item.area.x);
        item.autoLayout.rules.height = myMath.roundPrecise1(item.area.h);
        item.autoLayout.rules.vcenter = false;
    } else if (item.autoLayout.rules.hasOwnProperty('bottom') || item.autoLayout.rules.hasOwnProperty('relBottom')) {
        if (item.autoLayout.rules.hasOwnProperty('height') || item.autoLayout.rules.hasOwnProperty('relHeight')) {
            item.autoLayout.rules.top = myMath.roundPrecise1(item.area.x);
        } else {
            item.autoLayout.rules.height = myMath.roundPrecise1(item.area.h);
            if (!item.autoLayout.rules.hasOwnProperty('top') || !item.autoLayout.rules.hasOwnProperty('relTop')) {
                item.autoLayout.rules.top = myMath.roundPrecise1(item.area.x);
            }
        }
    }
    delete item.autoLayout.rules['bottom'];
    delete item.autoLayout.rules['relBottom'];
}


/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchBottomToAbsolute(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        item.autoLayout.rules.vcenter = false;
    }
    item.autoLayout.rules.bottom = myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h);
    if (item.autoLayout.rules.hasOwnProperty('top') || item.autoLayout.rules.hasOwnProperty('relTop')) {
        delete item.autoLayout.rules['height'];
        delete item.autoLayout.rules['relHeight'];
    }
}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchBottomToRelative(item, parentItem) {
    if (item.autoLayout.rules.vcenter) {
        item.autoLayout.rules.vcenter = false;
    }
    let relBottom = 0;
    if (!myMath.tooSmall(parentItem.area.h)) {
        relBottom = myMath.roundPrecise1(100 * (parentItem.area.h - item.area.y - item.area.h) / parentItem.area.h);
    }
    item.autoLayout.rules.relBottom = relBottom;
    delete item.autoLayout.rules['bottom'];

    if (item.autoLayout.rules.hasOwnProperty('top') || item.autoLayout.rules.hasOwnProperty('relTop')) {
        delete item.autoLayout.rules['height'];
        delete item.autoLayout.rules['relHeight'];
    }
}



/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutRemoveLeft(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        item.autoLayout.rules.right = myMath.roundPrecise1(parentItem.area.w - item.area.x - item.area.w);
        item.autoLayout.rules.width = myMath.roundPrecise1(item.area.w);
        item.autoLayout.rules.hcenter = false;
    } else if (item.autoLayout.rules.hasOwnProperty('left') || item.autoLayout.rules.hasOwnProperty('relLeft')) {
        if (item.autoLayout.rules.hasOwnProperty('width') || item.autoLayout.rules.hasOwnProperty('relWidth')) {
            item.autoLayout.rules.right = myMath.roundPrecise1(parentItem.area.w - item.area.x - item.area.w);
        } else {
            item.autoLayout.rules.width = myMath.roundPrecise1(item.area.w);
            if (!item.autoLayout.rules.hasOwnProperty('right') || !item.autoLayout.rules.hasOwnProperty('relRight')) {
                item.autoLayout.rules.right = myMath.roundPrecise1(parentItem.area.w - item.area.x - item.area.w);
            }
        }
    }
    delete item.autoLayout.rules['left'];
    delete item.autoLayout.rules['relLeft'];
}


/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchLeftToAbsolute(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        item.autoLayout.rules.hcenter = false;
    }
    item.autoLayout.rules.left = myMath.roundPrecise1(item.area.x);
    if (item.autoLayout.rules.hasOwnProperty('right') || item.autoLayout.rules.hasOwnProperty('relRight')) {
        delete item.autoLayout.rules['width'];
        delete item.autoLayout.rules['relWidth'];
    }

}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchLeftToRelative(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        item.autoLayout.rules.hcenter = false;
    }
    let relLeft = 0;
    if (!myMath.tooSmall(parentItem.area.w)) {
        relLeft = myMath.roundPrecise1(100 * item.area.x / parentItem.area.w);
    }
    item.autoLayout.rules.relLeft = relLeft;
    delete item.autoLayout.rules['left'];
    if (item.autoLayout.rules.hasOwnProperty('right') || item.autoLayout.rules.hasOwnProperty('relRight')) {
        delete item.autoLayout.rules['width'];
        delete item.autoLayout.rules['relWidth'];
    }
}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutRemoveRight(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        item.autoLayout.rules.left = myMath.roundPrecise1(item.area.x);
        item.autoLayout.rules.width = myMath.roundPrecise1(item.area.w);
        item.autoLayout.rules.hcenter = false;
    } else if (item.autoLayout.rules.hasOwnProperty('right') || item.autoLayout.rules.hasOwnProperty('relRight')) {
        if (item.autoLayout.rules.hasOwnProperty('width') || item.autoLayout.rules.hasOwnProperty('relWidth')) {
            item.autoLayout.rules.left = myMath.roundPrecise1(item.area.x);
        } else {
            item.autoLayout.rules.width = myMath.roundPrecise1(item.area.w);
            if (!item.autoLayout.rules.hasOwnProperty('left') || !item.autoLayout.rules.hasOwnProperty('relLeft')) {
                item.autoLayout.rules.left = myMath.roundPrecise1(item.area.x);
            }
        }
    }
    delete item.autoLayout.rules['right'];
    delete item.autoLayout.rules['relRight'];
}


/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchRightToAbsolute(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        item.autoLayout.rules.hcenter = false;
    }
    item.autoLayout.rules.right = myMath.roundPrecise1(parentItem.area.w - item.area.x - item.area.w);
    if (item.autoLayout.rules.hasOwnProperty('left') || item.autoLayout.rules.hasOwnProperty('relLeft')) {
        delete item.autoLayout.rules['width'];
        delete item.autoLayout.rules['relWidth'];
    }

}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchRightToRelative(item, parentItem) {
    if (item.autoLayout.rules.hcenter) {
        item.autoLayout.rules.hcenter = false;
    }
    let relRight = 0;
    if (!myMath.tooSmall(parentItem.area.w)) {
        relRight = myMath.roundPrecise1(100 * (parentItem.area.w - item.area.x - item.area.w) / parentItem.area.w);
    }
    item.autoLayout.rules.relRight = relRight;
    delete item.autoLayout.rules['right'];
    if (item.autoLayout.rules.hasOwnProperty('left') || item.autoLayout.rules.hasOwnProperty('relLeft')) {
        delete item.autoLayout.rules['width'];
        delete item.autoLayout.rules['relWidth'];
    }
}


/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutRemoveWidth(item, parentItem) {
    item.autoLayout.rules.hcenter = false;
    if (!item.autoLayout.rules.hasOwnProperty('left') && !item.autoLayout.rules.hasOwnProperty('relLeft')) {
        item.autoLayout.rules.left = myMath.roundPrecise1(item.area.x);
    }
    if (!item.autoLayout.rules.hasOwnProperty('right') && !item.autoLayout.rules.hasOwnProperty('relRight')) {
        item.autoLayout.rules.right = myMath.roundPrecise1(parentItem.area.w - item.area.x - item.area.w);
    }

    delete item.autoLayout.rules['width'];
    delete item.autoLayout.rules['relWidth'];
}

/**
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchWidthToAbsolute(item, parentItem) {
    delete item.autoLayout.rules['relWidth'];
    item.autoLayout.rules.width = myMath.roundPrecise1(item.area.w);
    if (item.autoLayout.rules.hcenter) {
        return;
    }

    const hasLeft = item.autoLayout.rules.hasOwnProperty('left') || item.autoLayout.rules.hasOwnProperty('relLeft');
    const hasRight = item.autoLayout.rules.hasOwnProperty('right') || item.autoLayout.rules.hasOwnProperty('relRight');
    if (hasLeft && hasRight) {
        delete item.autoLayout.rules['right'];
        delete item.autoLayout.rules['relRight'];
    }
}

/**
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchWidthToRelative(item, parentItem) {
    delete item.autoLayout.rules['width'];
    item.autoLayout.rules.relWidth = myMath.tooSmall(parentItem.area.w) ? 0 : myMath.roundPrecise1(100 * item.area.w / parentItem.area.w);
    if (item.autoLayout.rules.hcenter) {
        return;
    }

    const hasLeft = item.autoLayout.rules.hasOwnProperty('left') || item.autoLayout.rules.hasOwnProperty('relLeft');
    const hasRight = item.autoLayout.rules.hasOwnProperty('right') || item.autoLayout.rules.hasOwnProperty('relRight');
    if (hasLeft && hasRight) {
        delete item.autoLayout.rules['right'];
        delete item.autoLayout.rules['relRight'];
    }
}

/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutRemoveHeight(item, parentItem) {
    item.autoLayout.rules.vcenter = false;
    if (!item.autoLayout.rules.hasOwnProperty('top') && !item.autoLayout.rules.hasOwnProperty('relTop')) {
        item.autoLayout.rules.top = myMath.roundPrecise1(item.area.y);
    }
    if (!item.autoLayout.rules.hasOwnProperty('bottom') && !item.autoLayout.rules.hasOwnProperty('relBottom')) {
        item.autoLayout.rules.bottom = myMath.roundPrecise1(parentItem.area.h - item.area.y - item.area.h);
    }

    delete item.autoLayout.rules['height'];
    delete item.autoLayout.rules['relHeight'];
}

/**
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchHeightToAbsolute(item, parentItem) {
    delete item.autoLayout.rules['relHeight'];
    item.autoLayout.rules.height = myMath.roundPrecise1(item.area.h);
    if (item.autoLayout.rules.vcenter) {
        return;
    }

    const hasTop = item.autoLayout.rules.hasOwnProperty('top') || item.autoLayout.rules.hasOwnProperty('relTop');
    const hasBottom = item.autoLayout.rules.hasOwnProperty('bottom') || item.autoLayout.rules.hasOwnProperty('relBottom');
    if (hasTop && hasBottom) {
        delete item.autoLayout.rules['bottom'];
        delete item.autoLayout.rules['relBottom'];
    }
}

/**
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutSwitchHeightToRelative(item, parentItem) {
    delete item.autoLayout.rules['height'];
    item.autoLayout.rules.relHeight = myMath.tooSmall(parentItem.area.h) ? 0 : myMath.roundPrecise1(100 * item.area.h / parentItem.area.h);
    if (item.autoLayout.rules.hcenter) {
        return;
    }

    const hasTop = item.autoLayout.rules.hasOwnProperty('top') || item.autoLayout.rules.hasOwnProperty('relTop');
    const hasBottom = item.autoLayout.rules.hasOwnProperty('bottom') || item.autoLayout.rules.hasOwnProperty('relBottom');
    if (hasTop && hasBottom) {
        delete item.autoLayout.rules['bottom'];
        delete item.autoLayout.rules['relBottom'];
    }
}


/**
 *
 * @param {Item} item
 * @param {Item} parentItem
 */
export function autoLayoutGenerateEditBoxRuleGuides(item, parentItem) {
    if (!item.autoLayout || !item.autoLayout.on || !item.autoLayout.rules) {
        return [];
    }

    const guides = [];

    const pt1 = worldPointOnItem(item.area.w / 2, 0, item);
    const pt2 = worldPointOnItem(item.area.x + item.area.w / 2, 0, parentItem);

    const pr1 = worldPointOnItem(item.area.w, item.area.h / 2, item);
    const pr2 = worldPointOnItem(parentItem.area.w, item.area.y + item.area.h / 2, parentItem);

    const pb1 = worldPointOnItem(item.area.w/2, item.area.h, item);
    const pb2 = worldPointOnItem(item.area.x + item.area.w/2, parentItem.area.h, parentItem);

    const pl1 = worldPointOnItem(0, item.area.h/2, item);
    const pl2 = worldPointOnItem(0, item.area.y + item.area.h/2, parentItem);

    const rules = item.autoLayout.rules;

    if (rules.hcenter) {
        guides.push({ t: 'line', p1: pl1, p2: pl2 });
        guides.push({ t: 'line', p1: pr1, p2: pr2 });
        guides.push({
            t: 'label',
            text: 'center',
            x: (pl1.x + pl2.x)/2,
            y: (pl1.y + pl2.y)/2,
            limit: myMath.distanceBetweenPoints(pl1.x, pl1.y, pl2.x, pl2.y)
        });
        guides.push({
            t: 'label',
            text: 'center',
            x: (pr1.x + pr2.x)/2,
            y: (pr1.y + pr2.y)/2,
            limit: myMath.distanceBetweenPoints(pr1.x, pr1.y, pr2.x, pr2.y)
        });
    } else {
        if (rules.hasOwnProperty('left') || rules.hasOwnProperty('relLeft')) {
            guides.push({ t: 'line', p1: pl1, p2: pl2 });
            if (rules.hasOwnProperty('relLeft')) {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.relLeft) + ' %',
                    x: (pl1.x + pl2.x)/2,
                    y: (pl1.y + pl2.y)/2,
                    limit: myMath.distanceBetweenPoints(pl1.x, pl1.y, pl2.x, pl2.y)
                });
            } else {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.left),
                    x: (pl1.x + pl2.x)/2,
                    y: (pl1.y + pl2.y)/2,
                    limit: myMath.distanceBetweenPoints(pl1.x, pl1.y, pl2.x, pl2.y)
                });
            }
        }
        if (rules.hasOwnProperty('right') || rules.hasOwnProperty('relRight')) {
            guides.push({ t: 'line', p1: pr1, p2: pr2 });
            if (rules.hasOwnProperty('relRight')) {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.relRight) + ' %',
                    x: (pr1.x + pr2.x)/2,
                    y: (pr1.y + pr2.y)/2,
                    limit: myMath.distanceBetweenPoints(pr1.x, pr1.y, pr2.x, pr2.y)
                });
            } else {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.right),
                    x: (pr1.x + pr2.x)/2,
                    y: (pr1.y + pr2.y)/2,
                    limit: myMath.distanceBetweenPoints(pr1.x, pr1.y, pr2.x, pr2.y)
                });
            }
        }
    }

    if (rules.vcenter) {
        guides.push({ t: 'line', p1: pt1, p2: pt2 });
        guides.push({ t: 'line', p1: pb1, p2: pb2 });
        guides.push({
            t: 'label',
            text: 'center',
            x: (pt1.x + pt2.x)/2,
            y: (pt1.y + pt2.y)/2,
            limit: myMath.distanceBetweenPoints(pt1.x, pt1.y, pt2.x, pt2.y)
        });
        guides.push({
            t: 'label',
            text: 'center',
            x: (pb1.x + pb2.x)/2,
            y: (pb1.y + pb2.y)/2,
            limit: myMath.distanceBetweenPoints(pb1.x, pb1.y, pb2.x, pb2.y)
        });
    } else {
        if (rules.hasOwnProperty('top') || rules.hasOwnProperty('relTop')) {
            guides.push({ t: 'line', p1: pt1, p2: pt2 });
            if (rules.hasOwnProperty('relTop')) {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.relTop) + ' %',
                    x: (pt1.x + pt2.x)/2,
                    y: (pt1.y + pt2.y)/2,
                    limit: myMath.distanceBetweenPoints(pt1.x, pt1.y, pt2.x, pt2.y)
                });
            } else {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.top),
                    x: (pt1.x + pt2.x)/2,
                    y: (pt1.y + pt2.y)/2,
                    limit: myMath.distanceBetweenPoints(pt1.x, pt1.y, pt2.x, pt2.y)
                });
            }
        }
        if (rules.hasOwnProperty('bottom') || rules.hasOwnProperty('relBottom')) {
            guides.push({ t: 'line', p1: pb1, p2: pb2 });
            if (rules.hasOwnProperty('relBottom')) {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.relBottom) + ' %',
                    x: (pb1.x + pb2.x)/2,
                    y: (pb1.y + pb2.y)/2,
                    limit: myMath.distanceBetweenPoints(pb1.x, pb1.y, pb2.x, pb2.y)
                });
            } else {
                guides.push({
                    t: 'label',
                    text: '' + myMath.roundPrecise1(rules.bottom),
                    x: (pb1.x + pb2.x)/2,
                    y: (pb1.y + pb2.y)/2,
                    limit: myMath.distanceBetweenPoints(pb1.x, pb1.y, pb2.x, pb2.y)
                });
            }
        }
    }
    return guides;
}