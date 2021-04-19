
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
    const Ax = Vx;
    const Ay = Vy;
    const Bx = Vy;
    const By = -Vx / (2*ratio);

    const x1 = x + Ax / 2 - Bx;
    const y1 = y + Ay / 2 - By;

    const x2 = x + Ax;
    const y2 = y + Ay;

    const x3 = x + Ax / 2 + Bx;
    const y3 = y + Ay / 2 + By;

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
    var Pax = x + (Vx * 2 - Vy);
    var Pay = y + (Vy * 2 + Vx);
    var Pbx = x + (Vx * 2 + Vy);
    var Pby = y + (Vy * 2 - Vx);
    var path = `M ${Pax} ${Pay} L ${x} ${y} L ${Pbx} ${Pby}`;
    if (close) {
        path += ' z';
    }
    return {
        path: path,
        fill: close ? capFill : 'none'
    };
}