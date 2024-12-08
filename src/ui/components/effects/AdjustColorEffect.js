import { svgElement } from "./SvgBuilder";

const $ = svgElement;
export default {
    name: 'Adjust Color',
    supportsCascade: true,
    args: {
        matrix: {
            type: 'color-matrix',
            name: 'Color matrix',
            value: [[1, 0, 0, 0, 0],
                    [0, 1, 0, 0, 0],
                    [0, 0, 1, 0, 0],
                    [0, 0, 0, 1, 0]
            ]
        }
    },

    applyEffect(item, effectIdx, effectArgs) {
        let matrixEncoded =   '1 0 0 0 0 '
                            + '0 1 0 0 0 '
                            + '0 0 1 0 0 '
                            + '0 0 0 1 0';
        if (Array.isArray(effectArgs.matrix)) {
            matrixEncoded = '';
            effectArgs.matrix.forEach(row => {
                if (Array.isArray(row)) {
                    matrixEncoded += row.join(' ')
                } else {
                    matrixEncoded += '0 0 0 0 0';
                }
                matrixEncoded += ' ';
            });
        }
        return {
            kind: 'svg-filter',
            html: $('feColorMatrix', {
                type: 'matrix',
                values: matrixEncoded
            }).outerHTML
        };
    }
};