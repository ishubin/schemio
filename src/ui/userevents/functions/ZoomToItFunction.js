/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from '../../myMath';
import {forEach} from '../../collections';
import ValueAnimation from '../../animations/ValueAnimation';
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import EditorEventBus from '../../components/editor/EditorEventBus';

/**
 * Recreating item transform because in some weird cases when some of ancestors were moved,
 * the transforms in item metas are not properly recalculated.
 */
function createItemTransform(item, schemeContainer) {
    let transform = myMath.identityMatrix();

    if (item.meta.ancestorIds) {
        for (let i = 0; i < item.meta.ancestorIds.length; i++) {
            const ancestorItem = schemeContainer.findItemById(item.meta.ancestorIds[i]);
            if (ancestorItem) {
                transform = myMath.standardTransformWithArea(transform, ancestorItem.area);
            }
        }
    }
    return transform;
}


function calculateBoundingBox(item, schemeContainer) {
    const points = [
        { x: 0, y: 0 },
        { x: item.area.w, y: 0 },
        { x: item.area.w, y: item.area.h },
        { x: 0, y: item.area.h },
    ];
    let minPoint = null;
    let maxPoint = null;
    let transform = createItemTransform(item, schemeContainer);

    forEach(points, point => {
        const localPoint = myMath.worldPointInArea(point.x, point.y, item.area, transform);
        if (!minPoint) {
            minPoint = {x: localPoint.x, y: localPoint.y};
            maxPoint = {x: localPoint.x, y: localPoint.y};
        } else {
            minPoint.x = Math.min(minPoint.x, localPoint.x);
            minPoint.y = Math.min(minPoint.y, localPoint.y);
            maxPoint.x = Math.max(maxPoint.x, localPoint.x);
            maxPoint.y = Math.max(maxPoint.y, localPoint.y);
        }
    })

    return {
        x: minPoint.x,
        y: minPoint.y,
        w: maxPoint.x - minPoint.x,
        h: maxPoint.y - minPoint.y
    };
}

/**
 * This function searches (binary search) for position on screen where the element is visible close enough
 * @param {*} area - are in world which needs to be brought into screen
 * @param {*} width  - screen width
 * @param {*} height  - screen height
 * @param {*} screenOffset - offset in pixels from each side of the screen. This is needed in order to make it visualy more pleasant
 * @param {*} oldX  - old x of screen transform
 * @param {*} oldY  - old y of screen transform
 * @param {*} oldZoom  - old scale of screen transform
 * @param {*} destX - x on screen transform in which area is fully centered and inside the view
 * @param {*} destY - y on screen transform in which area is fully centered and inside the view
 * @param {*} destZoom - scale on screen transform in which area is fully centered and inside the view
 */
function findCloseEnoughTransform(area, width, height, screenOffset, oldX, oldY, oldZoom, destX, destY, destZoom) {
    const distance = Math.sqrt((destX - oldX)*(destX - oldX) + (destY - oldY)*(destY - oldY));
    if (distance < 1) {
        return {
            x: destX,
            y: destY,
            scale: destZoom
        };
    }

    //testing it in the middle point
    const midX = oldX + (destX - oldX) / 2;
    const midY = oldY + (destY - oldY) / 2;
    const midZoom = (destZoom + oldZoom) / 2;

    if (isAreaInsideScreen(area, width, height, screenOffset, midX, midY, midZoom)) {
        return findCloseEnoughTransform(area, width, height, screenOffset, oldX, oldY, oldZoom, midX, midY, midZoom);
    } else {
        return findCloseEnoughTransform(area, width, height, screenOffset, midX, midY, midZoom, destX, destY, destZoom);
    }
}

function isAreaInsideScreen(area, width, height, screenOffset, screenX, screenY, scale) {
    const x1 = area.x * scale + screenX;
    const y1 = area.y * scale + screenY;
    const x2 = (area.x + area.w) * scale + screenX;
    const y2 = (area.y + area.h) * scale + screenY;

    return (x1 >= screenOffset && x1 <= width - screenOffset)
            && (x2 >= screenOffset && x2 <= width - screenOffset)
            && (y1 >= screenOffset && y1 <= height - screenOffset)
            && (y2 >= screenOffset && y2 <= height - screenOffset);
}


function isInsideHUD(item, schemeContainer) {
    if (item.shape === 'hud') {
        return true;
    }

    if (item.meta.parentId) {
        const parentItem = schemeContainer.findItemById(item.meta.parentId);
        if (parentItem) {
            return isInsideHUD(parentItem, schemeContainer);
        }
    }
    return false;
}

export default {
    name: 'Zoom To It',

    description: 'Moves scene to bring item into view so that it is centered on the screen',

    args: {
        closeEnough         : {name: 'Close Enough', type: 'boolean', value: false, description: 'If checked, then it will only zoom to item just enough for it to appear fully inside the screen. Otherwise it will bring it to the center of the screen'},
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, min: 0, depends: {animated: true}},
        minZoom             : {name: 'Minimum Zoom(%)', type: 'number', value: 0, min: 0},
        maxZoom             : {name: 'Maximum Zoom(%)', type: 'number', value: 100, min: 0},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invocation of other actions'}
    },

    argsToShortString(args) {
        if (args.animated) {
            return `animated, ${args.animationDuration} sec`
        }
        return 'instant'
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        // it doesn't make sense to zoom into HUD items since they are supposed to be rendered in viewport transform
        if (!item || !item.area || isInsideHUD(item, schemeContainer)) {
            resultCallback();
            return;
        }

        const area = calculateBoundingBox(item, schemeContainer);

        let newZoom = 1.0;
        const width = schemeContainer.screenSettings.width;
        const height = schemeContainer.screenSettings.height;
        if (area.w > 0 && area.h > 0 && width > 0 && height > 0) {
            newZoom = Math.min(width/area.w, height/area.h);
            newZoom = Math.max(args.minZoom / 100.0, Math.min(newZoom, args.maxZoom / 100.0));
        }

        let destX = width/2  - (area.x + area.w/2) * newZoom;
        let destY = height/2 - (area.y + area.h/2) * newZoom;

        if (args.closeEnough) {
            if (isAreaInsideScreen(area, width, height, 0, schemeContainer.screenTransform.x, schemeContainer.screenTransform.y, schemeContainer.screenTransform.scale)) {
                resultCallback();
                return;
            } else {
                const transform = findCloseEnoughTransform(area, width, height, 0, schemeContainer.screenTransform.x, schemeContainer.screenTransform.y, schemeContainer.screenTransform.scale, destX, destY, newZoom);
                destX = transform.x;
                destY = transform.y;
                newZoom = transform.scale;
            }
        }

        if (args.animated) {
            const oldX = schemeContainer.screenTransform.x;
            const oldY = schemeContainer.screenTransform.y;
            const oldZoom = schemeContainer.screenTransform.scale;

            playInAnimationRegistry(schemeContainer.editorId, new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: 'ease-in-out',
                update: (t) => {
                    schemeContainer.screenTransform.scale = (oldZoom * (1.0-t) + newZoom * t);
                    schemeContainer.screenTransform.x = oldX * (1.0-t) + destX * t;
                    schemeContainer.screenTransform.y = oldY * (1.0-t) + destY * t;
                },
                destroy: () => {
                    EditorEventBus.screenTransformUpdated.$emit(schemeContainer.editorId, schemeContainer.screenTransform);
                    if (!args.inBackground) {
                        resultCallback();
                    }
                }
            }), 'screen', 'screen-transform');
            if (args.inBackground) {
                resultCallback();
            }
        } else {
            schemeContainer.screenTransform.scale = newZoom;
            schemeContainer.screenTransform.x = destX;
            schemeContainer.screenTransform.y = destY;
            EditorEventBus.screenTransformUpdated.$emit(schemeContainer.editorId, schemeContainer.screenTransform);
            resultCallback();
        }
    }
};

