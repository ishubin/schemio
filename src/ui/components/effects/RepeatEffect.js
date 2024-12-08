import { computeSvgFill } from "../editor/items/AdvancedFill.vue";
import Shape from "../editor/items/shapes/Shape";
import StrokePattern from "../editor/items/StrokePattern";
import { svgElement } from "./SvgBuilder";

const $ = svgElement;

export default {
    name: 'Repeat',
    description: 'Some shapes do not support this effect',
    args: {
        repeat: {type: 'number', value: 3, name: 'Repeat', min: 1, max: 20},
        dx    : {type: 'number', value: 10, name: 'Offset X'},
        dy    : {type: 'number', value: -10, name: 'Offset Y'},
        fade  : {type: 'number', value: 0, name: 'Fade (%)', min: 0, max: 100},
    },


    applyEffect(item, effectIdx, effectArgs) {
        const shape = Shape.find(item.shape);
        if (!shape || !shape.computeOutline) {
            return null;
        }

        const outlinePath = shape.computeOutline(item);
        if (!outlinePath) {
            return null;
        }

        const args = Shape.getShapeArgs(shape);
        let fill = 'none';
        if (item.shape === 'image') {
            fill = computeSvgFill({
                type: 'image',
                image: item.shapeProps.image,
                stretch: item.shapeProps.stretch,
                imageBox: {
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 1,
                }
            }, `effect-fill-${item.id}`);
        } else if (args.fill && args.fill.type === 'advanced-color') {
            fill = computeSvgFill(item.shapeProps.fill, `effect-fill-${item.id}`);
        } else if (args.fill && args.fill.type === 'color') {
            fill = item.shapeProps.fill;
        }
        const strokeColor = args.strokeColor && args.strokeColor.type === 'color' ? item.shapeProps.strokeColor : '#111111';
        const strokeSize = args.strokeSize && args.strokeSize.type === 'number' ? item.shapeProps.strokeSize : 1;
        let strokeDashArray = '';
        if (args.strokePattern && args.strokePattern.type === 'stroke-pattern') {
            strokeDashArray = StrokePattern.createDashArray(item.shapeProps.strokePattern, strokeSize);
        }

        const root = $('g', {});
        for (let i = 0; i < effectArgs.repeat; i++) {
            const x = (effectArgs.repeat - i) * effectArgs.dx;
            const y = (effectArgs.repeat - i) * effectArgs.dy;

            let start = 100;
            let end = 100 - effectArgs.fade;
            let t = (i + 1) / effectArgs.repeat

            let opacity = (start * t + end * (1 - t)) / 100;

            const g = $('g', {
                transform: `translate(${x}, ${y})`,
                style: `opacity: ${opacity}`
            });

            g.appendChild($('path', {
                d: outlinePath,
                fill: fill,
                stroke: strokeColor,
                'stroke-width': `${strokeSize}px`,
                'stroke-dasharray': strokeDashArray,
                'stroke-linejoin': 'round',
                'data-item-id': item.id
            }));
            root.appendChild(g);
        }
        return {
            kind: 'back',
            html: root.innerHTML
        };
    }
};