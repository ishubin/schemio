/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function standard(func) {
    return {
        hollow: false,
        renderFunc: func
    };
}
function hollow(func) {
    return {
        hollow: true,
        renderFunc: func
    };
}

const allCaps = {
    'empty': null,


    'triangle':     standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 2, true)),
    'triangle-1':   standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 1, true)),
    'triangle-2':   standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 3, true)),

    'arrow':        standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 2, false)),
    'arrow-1':      standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 1, false)),
    'arrow-2':      standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 3, false)),
    
    'triangle-h':     hollow((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 2, true)),
    'triangle-h-1':   hollow((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 1, true)),
    'triangle-h-2':   hollow((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 1, 3, true)),

    'circle': standard((x, y, Vx, Vy) => {
        const squaredD = Vx * Vx + Vy * Vy;
        if (squaredD > 0.01) {
            let r = Math.sqrt(squaredD) / 2;
            const cx = x + Vx/2;
            const cy = y + Vy/2;
            return {
                path: ` M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0`,
                hollow: false,
                entryPoint: {x: x + Vx, y: y + Vy}
            };
        }
        return null;
    }),
    'circle-cross': hollow((x, y, Vx, Vy) => {
        const squaredD = Vx * Vx + Vy * Vy;

        if (squaredD > 0.01) {
            let r = Math.sqrt(squaredD) / 2;
            const cx = x + Vx/2;
            const cy = y + Vy/2;

            const d = Math.cos(Math.PI / 4) * r;

            return {
                path: ` M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0 z M ${cx - d} ${cy - d} L ${cx + d} ${cy + d}  M ${cx + d} ${cy - d} L ${cx - d} ${cy + d}`,
                hollow: true,
                entryPoint: {x: x + Vx, y: y + Vy}
            };
        }
        return null;
    }),

    'double-arrow':  standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 2, false)),
    'double-arrow-1':standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 1, false)),
    'double-arrow-2':standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 3, false)),

    'double-triangle':     standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 2, true)),
    'double-triangle-1':   standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 1, true)),
    'double-triangle-2':   standard((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 3, true)),
    'double-triangle-h':     hollow((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 2, true)),
    'double-triangle-h-1':   hollow((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 1, true)),
    'double-triangle-h-2':   hollow((x, y, Vx, Vy) => createArrowCap(x, y, Vx, Vy, 2, 3, true)),

    'diamond':      standard((x, y, Vx, Vy) => createDiamondCap(x, y, Vx, Vy, 0.5)),
    'diamond-1':    standard((x, y, Vx, Vy) => createDiamondCap(x, y, Vx, Vy, 1)),
    'diamond-2':    standard((x, y, Vx, Vy) => createDiamondCap(x, y, Vx, Vy, 1.5)),
    'diamond-h':    hollow((x, y, Vx, Vy) => createDiamondCap(x, y, Vx, Vy, 0.5)),
    'diamond-h-1':  hollow((x, y, Vx, Vy) => createDiamondCap(x, y, Vx, Vy, 1)),
    'diamond-h-2':  hollow((x, y, Vx, Vy) => createDiamondCap(x, y, Vx, Vy, 1.5)),

    'line':        standard((x, y, Vx, Vy) => createLineCap(x, y, Vx, Vy, 1)),
    'double-line': standard((x, y, Vx, Vy) => createLineCap(x, y, Vx, Vy, 2)),
    'tripple-line':standard((x, y, Vx, Vy) => createLineCap(x, y, Vx, Vy, 3)),
};


const _capTypes = Object.keys(allCaps);

export function getCapTypes() {
    return _capTypes;
}

export function createConnectorCap(x, y, Vx, Vy, capType) {
    const cap = allCaps[capType];
    if (cap) {
        const result = cap.renderFunc(x, y, Vx, Vy);
        if (cap.hollow) {
            result.hollow = true;
        }
        return result;
    }
    return null;
}

function createLineCap(x, y, Vx, Vy, numberOfLines) {
    let path = '';
    const Bx = Vy / 2;
    const By = -Vx / 2;

    for (let i = 0; i < numberOfLines; i++) {
        const x0 = x + Vx * (i + 1) / (numberOfLines + 1);
        const y0 = y + Vy * (i + 1) / (numberOfLines + 1);

        const x1 = x0 + Bx;
        const y1 = y0 + By;
        const x2 = x0 - Bx;
        const y2 = y0 - By;

        path += `M ${x1} ${y1} L ${x2} ${y2} `;
    }

    return {
        path: path,
        hollow: true,
        prolongLine: true,
        entryPoint: {x: x + Vx, y: y + Vy}
    };
}

function createArrowCap(x, y, Vx, Vy, numberOfArrows, ratio, close) {
    let path = '';

    const Bx = Vy / (2*ratio);
    const By = -Vx / (2*ratio);
    
    for (let i = 0; i < numberOfArrows; i++) {
        const x0 = x + Vx * i / numberOfArrows;
        const y0 = y + Vy * i / numberOfArrows;

        const x1 = x0 + Vx / numberOfArrows + Bx;
        const y1 = y0 + Vy / numberOfArrows + By;
        const x2 = x0 + Vx / numberOfArrows - Bx;
        const y2 = y0 + Vy / numberOfArrows - By;

        path += `M ${x1} ${y1} L ${x0} ${y0} L ${x2} ${y2} `;
        if (close) {
            path += ' z ';
        }
        
    }
    return {
        path: path,
        hollow: !close,
        prolongLine: !close,
        entryPoint: {x: x + Vx, y: y + Vy}
    };
}

function createDiamondCap(x, y, Vx, Vy, ratio) {
    const Bx = ratio * Vy / 2;
    const By = -ratio * Vx / 2;

    const x1 = x + Vx / 2 - Bx;
    const y1 = y + Vy / 2 - By;

    const x2 = x + Vx;
    const y2 = y + Vy;

    const x3 = x + Vx / 2 + Bx;
    const y3 = y + Vy / 2 + By;

    return {
        path: `M ${x} ${y} L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} z`,
        hollow: false,
        entryPoint: {x: x + Vx, y: y + Vy}
    };
}