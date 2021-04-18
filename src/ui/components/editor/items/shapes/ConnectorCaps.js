
import Path from '../../../../scheme/Path';


export function createConnectorCap(x, y, Vx, Vy, capType, capSize, capFill) {
    let r = 1;
    if (capSize) {
        r = capSize /2;
    }

    if (capType === Path.CapType.CIRCLE) {
        return {
            path: `M ${x - r} ${y}   a ${r},${r} 0 1,0 ${r * 2},0  a ${r},${r} 0 1,0 -${r*2},0`,
            fill: capFill
        };
    } else if (capType === Path.CapType.ARROW) {
        return createArrowCap(x, y, Vx, Vy, capSize, capFill, false);
    } else if (capType === Path.CapType.TRIANGLE) {
        return createArrowCap(x, y, Vx, Vy, capSize, capFill, true);
    }
    return null;
}

function createArrowCap(x, y, Vx, Vy, capSize, capFill, close) {
    var V = Vx * Vx + Vy * Vy;
    if (V !== 0) {
        V = Math.sqrt(V);
        Vx = Vx/V;
        Vy = Vy/V;

        var Pax = x + (Vx * 2 - Vy) * capSize;
        var Pay = y + (Vy * 2 + Vx) * capSize;
        var Pbx = x + (Vx * 2 + Vy) * capSize;
        var Pby = y + (Vy * 2 - Vx) * capSize;
        var path = `M ${Pax} ${Pay} L ${x} ${y} L ${Pbx} ${Pby}`;
        if (close) {
            path += ' z';
        }
        return {
            path: path,
            fill: close ? capFill : 'none'
        }
    }
    return null;
}