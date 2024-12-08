import { svgElement } from "./SvgBuilder";

const $ = svgElement;

export default {
    name: 'Sketch',
    supportsCascade: true,
    args: {
        wave   : {type: 'number', value: 18, name: 'Wave', min: 0},
        scale  : {type: 'number', value: 120, name: 'Scale'},
    },

    applyEffect(item, effectIdx, effectArgs) {
        return {
            kind: 'svg-filter',
            html: $('g', {}, [
                $('feTurbulence', {
                    type: 'turbulence',
                    baseFrequency: '' + effectArgs.wave/100,
                    numOctaves: '2',
                    result: 'turbulence'
                }),
                $('feDisplacementMap', {
                    in2: 'turbulence',
                    in: 'SourceGraphic',
                    scale: '' + effectArgs.scale/100,
                    xChannelSelector: 'R',
                    yChannelSelector: 'G',
                }),
            ]).innerHTML
        };
    }
};
