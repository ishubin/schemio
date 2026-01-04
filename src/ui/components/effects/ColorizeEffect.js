import { parseColor } from "../../colors";
import { svgElement } from "./SvgBuilder";

const $ = svgElement;
export default {
    name: 'Colorize',
    supportsCascade: true,
    args: {
        black: {
            type: 'color',
            name: 'Black correction',
            value: 'rgba(0,0,0,1.0)'
        },
        white: {
            type: 'color',
            name: 'White correction',
            value: 'rgba(255,255,255,1.0)'
        },
    },

    applyEffect(item, effectIdx, effectArgs) {
        const blackReplace = parseColor(effectArgs.black);
        const whiteReplace = parseColor(effectArgs.white);

        const r = (whiteReplace.r) / 255 - blackReplace.r/255;
        const g = (whiteReplace.g) / 255 - blackReplace.g/255;
        const b = (whiteReplace.b) / 255 - blackReplace.b/255;

        const matrixEncoded = `${r} 0 0 ${blackReplace.r/255} 0 `
                            + `0 ${g} 0 ${blackReplace.g/255} 0 `
                            + `0 0 ${b} ${blackReplace.b/255} 0 `
                            + `0 0 0 1 0`;
        return {
            kind: 'svg-filter',
            html: $('feColorMatrix', {
                type: 'matrix',
                values: matrixEncoded
            }).outerHTML
        };
    }
}