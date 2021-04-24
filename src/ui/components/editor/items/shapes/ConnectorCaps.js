import keys from 'lodash/keys';

function standard(func) {
    return {
        lightFill: false,
        renderFunc: func
    };
}
function light(func) {
    return {
        lightFill: true,
        renderFunc: func
    };
}

const allCaps = {
    'empty': null,

    'circle': standard((x, y, Vx, Vy, capFill) => {
        const squaredD = Vx * Vx + Vy * Vy;
        if (squaredD > 0.01) {
            let r = Math.sqrt(squaredD) / 2;
            const cx = x + Vx/2;
            const cy = y + Vy/2;
            return {
                path: ` M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0`,
                fill: capFill
            };
        }
        return null;
    }),
    'circle-cross': light((x, y, Vx, Vy, capFill) => {
        const squaredD = Vx * Vx + Vy * Vy;

        if (squaredD > 0.01) {
            let r = Math.sqrt(squaredD) / 2;
            const cx = x + Vx/2;
            const cy = y + Vy/2;

            const d = Math.cos(Math.PI / 4) * r;

            return {
                path: ` M ${cx - r}, ${cy} a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0 z M ${cx - d} ${cy - d} L ${cx + d} ${cy + d}  M ${cx + d} ${cy - d} L ${cx - d} ${cy + d}`,
                fill: capFill
            };
        }
        return null;
    }),

    'arrow':        standard((x, y, Vx, Vy, capFill) => createArrowCap(x, y, Vx, Vy, capFill, false)),
    'triangle':     standard((x, y, Vx, Vy, capFill) => createArrowCap(x, y, Vx, Vy, capFill, true)),

    'diamond':      standard((x, y, Vx, Vy, capFill) => createDiamondCap(x, y, Vx, Vy, capFill, 0.5)),
    'diamond-1':    standard((x, y, Vx, Vy, capFill) => createDiamondCap(x, y, Vx, Vy, capFill, 1)),
    'diamond-2':    standard((x, y, Vx, Vy, capFill) => createDiamondCap(x, y, Vx, Vy, capFill, 1.5)),
    'diamond-l':    light((x, y, Vx, Vy, capFill) => createDiamondCap(x, y, Vx, Vy, capFill, 0.5)),
    'diamond-l-1':  light((x, y, Vx, Vy, capFill) => createDiamondCap(x, y, Vx, Vy, capFill, 1)),
    'diamond-l-2':  light((x, y, Vx, Vy, capFill) => createDiamondCap(x, y, Vx, Vy, capFill, 1.5)),
};


const _capTypes = keys(allCaps);

export function getCapDefaultFill(capType, strokeColor) {
    const cap = allCaps[capType];
    if (cap) {
        if (cap.lightFill) {
            return '#ffffff';
        }
    }
    if (strokeColor) {
        return strokeColor;
    }
    return '#111111';
}

export function getCapTypes() {
    return _capTypes;
}

export function createConnectorCap(x, y, Vx, Vy, capType, capFill) {
    const cap = allCaps[capType];
    if (cap) {
        return cap.renderFunc(x, y, Vx, Vy, capFill);
    }
    return null;
}

function createArrowCap(x, y, Vx, Vy, capFill, close) {
    const ratio = 2;
    const Bx = Vy / (2*ratio);
    const By = -Vx / (2*ratio);
    const x1 = x + Vx + Bx;
    const y1 = y + Vy + By;
    const x2 = x + Vx - Bx;
    const y2 = y + Vy - By;

    var path = `M ${x1} ${y1} L ${x} ${y} L ${x2} ${y2}`;
    if (close) {
        path += ' z';
    }
    return {
        path: path,
        fill: close ? capFill : 'none'
    };
}

function createDiamondCap(x, y, Vx, Vy, capFill, ratio) {
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
        fill: capFill
    };
}