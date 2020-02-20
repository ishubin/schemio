import EventBus from '../../components/editor/EventBus';
import myMath from '../../myMath';
import {forEach} from 'lodash';


export default {
    name: 'Zoom To It',
    args: {},

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item && item.area) {
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
                    minPoint = localPoint;
                }
                if (!maxPoint) {
                    maxPoint = localPoint;
                }
                minPoint.x = Math.min(minPoint.x, localPoint.x);
                minPoint.y = Math.min(minPoint.y, localPoint.y);
                maxPoint.x = Math.max(maxPoint.x, localPoint.x);
                maxPoint.y = Math.max(maxPoint.y, localPoint.y);
            })

            EventBus.$emit(EventBus.BRING_TO_VIEW, {
                x: minPoint.x,
                y: minPoint.y,
                w: maxPoint.x - minPoint.x,
                h: maxPoint.y - minPoint.y
            });
        }
        resultCallback();
    }
};

