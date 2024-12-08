import Shape from "../editor/items/shapes/Shape";
import { svgElement } from "./SvgBuilder";

const $ = svgElement;

export default {
    name: 'Glow',
    supportsCascade: false,
    description: 'Some shapes do not support this effect',
    args: {
        color  : {type: 'color', value: 'rgba(126,237,255,1.0)', name: 'Color'},
        size   : {type: 'number', value: 3, name: 'Size', min: 0, max: 100},
        blur   : {type: 'number', value: 5, name: 'Blur', min: 0, max: 100},
        opacity: {type: 'number', value: 50, name: 'Opacity (%)', min: 0, max: 100},
    },

    applyEffect(item, effectIdx, effectArgs) {
        const shape = Shape.find(item.shape);
        if (!shape) {
            return null;
        }

        const path = shape.computeOutline(item);
        if (!path) {
            return null;
        }

        const filterId =  `item-effect-glow-${item.id}-${effectIdx}`;
        let strokeSize = effectArgs.size;
        const strokeSizeArgDef = Shape.getShapePropDescriptor(shape, 'strokeSize');
        if (strokeSizeArgDef && strokeSizeArgDef.type === 'number') {
            strokeSize = effectArgs.size + item.shapeProps['strokeSize'];
        }

        return {
            kind: 'front',
            html: $('g', {}, [
                $('defs', {}, [
                    $('filter', {id: filterId, x: '-500%', y: '-500%', width: '2000%', height: '2000%'}, [
                        $('feGaussianBlur', {
                            in: 'SourceGraphic',
                            stdDeviation: effectArgs.blur
                        })
                    ])
                ]),

                $('path', {
                    d: path,
                    'data-item-id': item.id,
                    stroke: effectArgs.color,
                    'stroke-width': `${strokeSize}px`,
                    fill: 'none',
                    style: `opacity: ${effectArgs.opacity / 100.0}`,
                    filter: `url(#${filterId})`
                })
            ]).innerHTML
        };
    }
};