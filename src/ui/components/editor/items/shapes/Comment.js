import forEach from 'lodash/forEach';
import myMath from '../../../../myMath';

function makeTailControlPoint(item) {
    let x = 0, y = 0;
    if (item.shapeProps.tailSide === 'top') {
        x = item.shapeProps.tailPosition;
        y = -item.shapeProps.tailLength;
    } else if (item.shapeProps.tailSide === 'bottom') {
        x = item.shapeProps.tailPosition;
        y = item.area.h + item.shapeProps.tailLength;
    } else if (item.shapeProps.tailSide === 'left') {
        x = -item.shapeProps.tailLength;
        y = item.shapeProps.tailPosition;
    } else if (item.shapeProps.tailSide === 'right') {
        x = item.area.w + item.shapeProps.tailLength;
        y = item.shapeProps.tailPosition;
    }
    return { x, y };
}

function handleTailControlPointDrag(item, originalX, originalY, dx, dy) {
    let x = originalX + dx;
    let y = originalY + dy;

    // here we identify from which side of the two diagonal lines does is the current point positioned
    // This way we divide the space into 4 regions which would correspond to the tail side
    const side1 = myMath.identifyPointSideAgainstLine(x, y, myMath.createLineEquation(0, 0, item.area.w, item.area.h));
    const side2 = myMath.identifyPointSideAgainstLine(x, y, myMath.createLineEquation(0, item.area.h, item.area.w, 0));
    let sideId = 3;
    if (side1 < 0) {
        sideId = sideId & 1;
    }
    if (side2 < 0) {
        sideId = sideId & 2;
    }

    if (sideId === 0) {
        item.shapeProps.tailSide = 'top';
        item.shapeProps.tailPosition = x;
        item.shapeProps.tailLength = -y;
    } else if (sideId === 3) {
        item.shapeProps.tailSide = 'bottom';
        item.shapeProps.tailPosition = x;
        item.shapeProps.tailLength = y - item.area.h;
    } if (sideId == 2) {
        item.shapeProps.tailSide = 'left';
        item.shapeProps.tailPosition = y;
        item.shapeProps.tailLength = -x;
    } else if (sideId == 1) {
        item.shapeProps.tailSide = 'right';
        item.shapeProps.tailPosition = y;
        item.shapeProps.tailLength = x - item.area.w;
    }

}

function makeTailWidthPoint(item) {
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);
    const W = item.area.w;
    const H = item.area.h;
    let x = 0, y = 0;

    const tailWidth = Math.max(0, item.shapeProps.tailWidth);

    if (item.shapeProps.tailSide === 'top') {
        let t = 0;
        const length = Math.max(0, W - 2 *R);
        if (length > 0) {
            t = myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }
        x = R + tailWidth + (length - tailWidth) * t;
        y = 0;

    } else if (item.shapeProps.tailSide === 'bottom') {
        let t = 0;
        const length = Math.max(0, W - 2 *R);
        if (length > 0) {
            t = 1 - myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }
        x = W - R - tailWidth - (length - tailWidth) * t;
        y = H;

    } else if (item.shapeProps.tailSide === 'left') {
        let t = 0;
        const length = Math.max(0, H - 2 *R);
        if (length > 0) {
            t = 1 - myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }

        x = 0;
        y = H-R - tailWidth - (length - tailWidth) * t;

    } else if (item.shapeProps.tailSide === 'right') {
        let t = 0;
        const length = Math.max(0, H - 2 *R);
        if (length > 0) {
            t = myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }

        x = W;
        y = R + tailWidth + (length - tailWidth) * t;
    }
    return { x, y };
}

function handleTailWidthControlPointDrag(item, originalX, originalY, dx, dy) {
    const x = originalX + dx;
    const y = originalY + dy;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);
    const W = item.area.w;
    const H = item.area.h;

    const tailWidth = Math.max(0, item.shapeProps.tailWidth);

    if (item.shapeProps.tailSide === 'top') {
        let t = 0;
        const length = Math.max(0, W - 2 *R);
        if (length > 0) {
            t = myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }
        const x0 = R + (length - tailWidth) * t;
        item.shapeProps.tailWidth = myMath.clamp(x - x0, 0, length / 2);

    } else if (item.shapeProps.tailSide === 'bottom') {
        let t = 0;
        const length = Math.max(0, W - 2 *R);
        if (length > 0) {
            t = 1 - myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }
        const x0 = W - R - (length - tailWidth) * t;
        item.shapeProps.tailWidth = myMath.clamp(x0 - x, 0, length / 2);

    } else if (item.shapeProps.tailSide === 'left') {
        let t = 0;
        const length = Math.max(0, H - 2 *R);
        if (length > 0) {
            t = 1 - myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }
        const y0 = H-R - (length - tailWidth) * t;
        item.shapeProps.tailWidth = myMath.clamp(y0 - y, 0, length / 2);

    } else if (item.shapeProps.tailSide === 'right') {
        let t = 0;
        const length = Math.max(0, H - 2 *R);
        if (length > 0) {
            t = myMath.clamp(item.shapeProps.tailPosition / length, 0, 1);
        }
        const y0 = R + (length - tailWidth) * t;
        item.shapeProps.tailWidth = myMath.clamp(y - y0, 0, length / 2);
    }
}

function makeCornerRadiusControlPoint(item) {
    return {
        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
        y: 0
    };
}

const controlPointFuncs = {
    tail: makeTailControlPoint,
    tailWidth: makeTailWidthPoint,
    cornerRadius: makeCornerRadiusControlPoint
};

/*

Example of constructing tail shape for bottom side
 /--------------------------\
|                           |
|         Coment            |
|                           |
|                           |
| P5     P4       P2     P1 |
\<-------x<-------x<------x/ .     <---- V (side vector (vx, vy))
    b     \  TW  /    a      .             N (perpendicular vector (nx, ny))
           \    /            .             .
            \  /             .             .
             \/              .             .
             x               .             v
             P3              TL
          ........
             TW
 ...........................
           side.length

TL = tail length
TW = tail width
V1 = a * V
P2 = P1 + V1
*/


export default {
    shapeType: 'standard',

    computePath(item) {
        const W = item.area.w;
        const H = item.area.h;
        const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

        let path = `M 0 ${R} `;

        let sides = [
            {name: 'top',       length: W - 2*R, invertT: true,   p1x: R,   p1y: 0,    vx: 1,  vy: 0,     nx: 0, ny: -1,  ax: 1,  ay: -1 },
            {name: 'right',     length: H - 2*R, invertT: true,   p1x: W,   p1y: R,    vx: 0,  vy: 1,     nx: 1, ny: 0,   ax: 1,  ay: 1 },
            {name: 'bottom',    length: W - 2*R, invertT: false,  p1x: W-R, p1y: H,    vx: -1, vy: 0,     nx: 0, ny: 1,   ax: -1, ay: 1 },
            {name: 'left',      length: H - 2*R, invertT: false,  p1x: 0,   p1y: H-R,  vx: 0,  vy: -1,    nx: -1,ny: 0,   ax: -1, ay: -1 },
        ];

        const tailWidth = Math.max(0, item.shapeProps.tailWidth);

        for (let i = 0; i < sides.length; i++) {
            const side = sides[i];
            path += `a ${R} ${R} 0 0 1 ${R*side.ax} ${R*side.ay} `;
            if (item.shapeProps.tailSide === side.name) {
                const TL = item.shapeProps.tailLength;
                const TW = Math.min(Math.max(0, side.length - tailWidth), tailWidth);
                let t = 0;
                if (side.length > 0) {
                    t = myMath.clamp(item.shapeProps.tailPosition / side.length, 0, 1);
                }
                if (side.invertT) {
                    t = 1 - t;
                }
                const a = (side.length - TW) * (1 - t);
                const b = (side.length - TW) * t;
                const v1x = a * side.vx;
                const v1y = a * side.vy;
                const p2x = side.p1x + v1x;
                const p2y = side.p1y + v1y;
                const p4x = p2x + TW * side.vx;
                const p4y = p2y + TW * side.vy;
                const p5x = p4x + b * side.vx;
                const p5y = p4y + b * side.vy;

                let p3x = 0, p3y = 0;
                if (side.name === 'bottom' || side.name === 'top') {
                    p3x = item.shapeProps.tailPosition;
                    p3y = side.p1y + TL * side.ny;
                } else {
                    p3y = item.shapeProps.tailPosition;
                    p3x = side.p1x + TL * side.nx;
                }

                path += `L ${side.p1x} ${side.p1y} L ${p2x} ${p2y} L ${p3x} ${p3y}  L ${p4x} ${p4y} L ${p5x} ${p5y} `;

            } else {
                path += `l ${side.length*side.vx} ${side.length*side.vy} `
            }
        }

        path = path + ' z';
        return path;
    },

    controlPoints: {
        make(item, pointId) {
            if (!pointId) {
                const controlPoints = {};
                forEach(controlPointFuncs, (func, name) => {
                    controlPoints[name] = func(item);
                });
                return controlPoints;
            } else {
                return controlPointFuncs[pointId](item);
            }
        },
        handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
            if (controlPointName === 'tail') {
                handleTailControlPointDrag(item, originalX, originalY, dx, dy);
            } else if (controlPointName === 'cornerRadius') {
                item.shapeProps.cornerRadius = Math.max(0, item.area.w - Math.max(item.area.w/2, originalX + dx));
            } else if (controlPointName === 'tailWidth') {
                handleTailWidthControlPointDrag(item, originalX, originalY, dx, dy);
            }
        }
    },

    args: {
        cornerRadius        : {type: 'number', value: 10, name: 'Corner radius'},
        tailLength          : {type: 'number', value: 30, name: 'Tail Length'},
        tailWidth           : {type: 'number', value: 40, name: 'Tail Width'},
        tailSide            : {type: 'choice', value: 'bottom', name: 'Tail Side', options: ['top', 'bottom', 'left', 'right']},
        tailPosition        : {type: 'number', value: 0, name: 'Tail Position'},
    },
}