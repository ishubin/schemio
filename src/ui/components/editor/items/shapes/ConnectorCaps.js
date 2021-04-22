
import Path from '../../../../scheme/Path';

const capRenderFuncs = {};

capRenderFuncs[Path.CapType.CIRCLE] = (x, y, Vx, Vy, capFill) => {
    const squaredD = Vx * Vx + Vy * Vy;
    if (squaredD > 0.01) {
        let r = Math.sqrt(squaredD) / 2;
        return {
            path: `M ${x} ${y}   a ${r},${r} 0 1,0 ${r * 2},0  a ${r},${r} 0 1,0 -${r*2},0`,
            fill: capFill
        };
    }
    return null;
};

capRenderFuncs[Path.CapType.ARROW] = (x, y, Vx, Vy, capFill) => createArrowCap(x, y, Vx, Vy, capFill, false);

capRenderFuncs[Path.CapType.TRIANGLE] = (x, y, Vx, Vy, capFill) => createArrowCap(x, y, Vx, Vy, capFill, true);

capRenderFuncs[Path.CapType.DIAMOND] = (x, y, Vx, Vy, capFill) => {
    const ratio = 2;
    const Bx = Vy / (2*ratio);
    const By = -Vx / (2*ratio);

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
};

export function createConnectorCap(x, y, Vx, Vy, capType, capFill) {
    const renderFunc = capRenderFuncs[capType];
    if (renderFunc) {
        return renderFunc(x, y, Vx, Vy, capFill);
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