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


export default {
    name: 'Zoom To It',
    args: {
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

        const destX = width/2  - (area.x + area.w/2) * newZoom;
        const destY = height/2 - (area.y + area.h/2) * newZoom;

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

