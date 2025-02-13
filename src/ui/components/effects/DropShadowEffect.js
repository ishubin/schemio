import { parseColor } from "../../colors";
import myMath from "../../myMath";
import { svgElement } from "./SvgBuilder";

const $ = svgElement;

export default {
    name: 'Drop Shadow',
    supportsCascade: true,
    args: {
        color  : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Color'},
        dx     : {type: 'number', value: 10, name: 'Offset X'},
        dy     : {type: 'number', value: 10, name: 'Offset Y'},
        blur   : {type: 'number', value: 5, name: 'Blur', min: 0, max: 100},
        opacity: {type: 'number', value: 50, name: 'Opacity (%)', min: 0, max: 100},
        inside : {type: 'boolean', value: false, name: 'Inside'}
    },

    applyEffect(item, effectIdx, effectArgs) {
        const opacity = myMath.clamp(effectArgs.opacity, 0, 100) / 100.0;
        if (effectArgs.inside) {
            return {
                kind: 'svg-filter',
                html: $('g', {}, [
                    $('feComponentTransfer', {in: 'SourceAlpha' }, [
                        $('feFuncA', {type: 'table', tableValues: '1 0'})
                    ]),
                    $('feGaussianBlur', {stdDeviation: effectArgs.blur}),
                    $('feOffset', {dx: effectArgs.dx, dy: effectArgs.dy, result: 'offsetblur'}),
                    $('feFlood', {'flood-color': effectArgs.color, result: 'color', 'flood-opacity': opacity}),
                    $('feComposite', {in2: 'offsetblur', operator: 'in'}),
                    $('feComposite', {in2: 'SourceAlpha', operator: 'in'}),
                    $('feMerge', {}, [
                        $('feMergeNode', {in: 'SourceGraphic'}),
                        $('feMergeNode'),
                    ])
                ]).innerHTML
            };
        } else {
            let { r, g, b, a } = parseColor(effectArgs.color);
            a = a * opacity;
            return {
                kind: 'css-filter',
                value: `drop-shadow(${effectArgs.dx}px ${effectArgs.dy}px ${effectArgs.blur}px rgba(${r},${g},${b},${a}))`
            };
        }
    }
};