import EventBus from '../../components/editor/EventBus';
import myMath from '../../myMath';
import {forEach} from 'lodash';
import ValueAnimation from '../../animations/ValueAnimation';
import AnimationRegistry from '../../animations/AnimationRegistry';

function calculateBoundingBox(item, offset) {
    const points = [
        { x: 0, y: 0 },
        { x: item.area.w, y: 0 },
        { x: item.area.w, y: item.area.h },
        { x: 0, y: item.area.h },
    ];
    let minPoint = null;
    let maxPoint = null;
    let transform = {x: 0, y: 0, r: 0};
    if (item.meta.transform) {
        transform = item.meta.transform;
    }

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
        x: minPoint.x - offset,
        y: minPoint.y - offset,
        w: maxPoint.x - minPoint.x + offset*2,
        h: maxPoint.y - minPoint.y + offset*2
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

export default {
    name: 'Zoom To It',
    args: {
        closeEnough         : {name: 'Close Enough', type: 'boolean', value: false, description: 'If checked, then it will only zoom to item just enough for it to appear fully inside the screen. Otherwise it will bring it to the center of the screen'},
        animated            : {name: 'Animated', type: 'boolean', value: true},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item || !item.area) {
            resultCallback();
            return;
        }

        const area = calculateBoundingBox(item, 50);

        let newZoom = 1.0;
        const width = schemeContainer.screenSettings.width;
        const height = schemeContainer.screenSettings.height;
        if (area.w > 0 && area.h > 0 && width > 0 && height > 0) {
            newZoom = 100.0 * Math.min(width/area.w, height/area.h);
            newZoom = Math.max(0.05, Math.min(newZoom, 1.0));
        }

        let destX = width/2  - (area.x + area.w/2) * newZoom;
        let destY = height/2 - (area.y + area.h/2) * newZoom;

        if (args.closeEnough) {
            const transform = findCloseEnoughTransform(area, width, height, 60, schemeContainer.screenTransform.x, schemeContainer.screenTransform.y, schemeContainer.screenTransform.scale, destX, destY, newZoom);
            destX = transform.x;
            destY = transform.y;
            newZoom = transform.scale;
        }

        if (args.animated) {
            const oldX = schemeContainer.screenTransform.x;
            const oldY = schemeContainer.screenTransform.y;
            const oldZoom = schemeContainer.screenTransform.scale;

            AnimationRegistry.play(new ValueAnimation({
                durationMillis: args.animationDuration * 1000.0,
                animationType: 'ease-in-out',
                update: (t) => {
                    schemeContainer.screenTransform.scale = (oldZoom * (1.0-t) + newZoom * t);
                    schemeContainer.screenTransform.x = oldX * (1.0-t) + destX * t;
                    schemeContainer.screenTransform.y = oldY * (1.0-t) + destY * t;
                }, 
                destroy: () => {
                    if (!args.inBackground) {
                        resultCallback();
                    }
                    EventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, schemeContainer.screenTransform);
                }
            }));
            if (args.inBackground) {
                resultCallback();
            }
        } else {
            schemeContainer.screenTransform.zoom = newZoom;;
            schemeContainer.screenTransform.x = destX;
            schemeContainer.screenTransform.y = destY;
            resultCallback();
            EventBus.$emit(EventBus.SCREEN_TRANSFORM_UPDATED, schemeContainer.screenTransform);
        }
    }
};

