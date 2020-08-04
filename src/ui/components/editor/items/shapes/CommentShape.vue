<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgFill"></path>
    </g>
</template>
<script>
import shortid from 'shortid';
import _ from 'lodash';
import AdvancedFill from '../AdvancedFill.vue';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

    let path = `M 0 ${R} `;

    let sides = [
        {name: 'top',       length: W - 2*R, vx: 1,     vy: 0,  ax: 1,  ay: -1 },
        {name: 'right',     length: H - 2*R, vx: 0,     vy: 1,  ax: 1,  ay: 1 },
        {name: 'bottom',    length: W - 2*R, vx: -1,    vy: 0,  ax: -1, ay: 1 },
        {name: 'left',      length: H - 2*R, vx: 0,     vy: -1, ax: -1, ay: -1 },
    ];

    for (let i = 0; i < sides.length; i++) {
        const side = sides[i];
        path += `a ${R} ${R} 0 0 1 ${R*side.ax} ${R*side.ay} `;
        if (item.shapeProps.tailSide === side.name) {
            const TL = item.shapeProps.tailLength;
            const TW = Math.min(Math.max(0, side.length - item.shapeProps.tailWidth), item.shapeProps.tailWidth);
            const t = (100 - Math.max(0, Math.min(item.shapeProps.tailPosition, 100.0))) / 100.0;
            const rotatedX = side.vy;
            const rotatedY = -side.vx;
            const p1x = (side.length - TW) * t * side.vx;
            const p1y = (side.length - TW) * t * side.vy;

            const p2x = TW * t * side.vx + rotatedX * TL;
            const p2y = TW * t * side.vy + rotatedY * TL;

            const p3x = TW * (1.0 - t) * side.vx - rotatedX * TL;
            const p3y = TW * (1.0 - t) * side.vy - rotatedY * TL;

            const p4x = (side.length - TW - (side.length - TW) * t) * side.vx;
            const p4y = (side.length - TW - (side.length - TW) * t) * side.vy;

            path += `l ${p1x} ${p1y} l ${p2x} ${p2y} l ${p3x} ${p3y} l ${p4x} ${p4y} `
        } else {
            path += `l ${side.length*side.vx} ${side.length*side.vy} `
        }
    }


    path = path + ' z';
    return path;
}

function makeTailControlPoint(item) {
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);
    let x = 0, y = 0;
    if (item.shapeProps.tailSide === 'top') {
        x = (item.area.w - 2 * R) * (100 - item.shapeProps.tailPosition) / 100 + R;
        y = -item.shapeProps.tailLength;
    } else if (item.shapeProps.tailSide === 'bottom') {
        x = (item.area.w - 2 * R) * item.shapeProps.tailPosition / 100 + R;
        y = item.area.h + item.shapeProps.tailLength;
    } else if (item.shapeProps.tailSide === 'left') {
        x = -item.shapeProps.tailLength;
        y = (item.area.h - 2 * R) * item.shapeProps.tailPosition / 100 + R;
    } else if (item.shapeProps.tailSide === 'right') {
        x = item.area.w + item.shapeProps.tailLength;
        y = (item.area.h - 2 * R) * (100 - item.shapeProps.tailPosition) / 100 + R;
    }
    return { x, y };
}

function makeCornerRadiusControlPoint(item) {
    return {
        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
        y: 0
    };
}

const controlPointFuncs = {
    tail: makeTailControlPoint,
    cornerRadius: makeCornerRadiusControlPoint
};

export default {
    props: ['item'],
    components: {AdvancedFill},

    computePath,

    controlPoints: {
        make(item, pointId) {
            if (!pointId) {
                const controlPoints = {};
                _.forEach(controlPointFuncs, (func, name) => {
                    controlPoints[name] = func(item);
                });
                return controlPoints;
            } else {
                return controlPointFuncs[pointId](item);
            }
        },
        handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
            if (controlPointName === 'tail') {
                const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);
                let x = originalX + dx;
                let y = originalY + dy;
                let x1 = R, x2 = item.area.w - R,
                    y1 = R, y2 = item.area.h - R;

                if (Math.abs(x2 - x1) < 1 || Math.abs(y2 - y1) < 1) {
                    return;
                }

                if (x >= x1 && x <= x2) {
                    if (y < 0) {
                        item.shapeProps.tailSide = 'top';
                        item.shapeProps.tailPosition = 100 - 100 * Math.max(0, Math.min(1.0, (x - x1) / (x2 - x1)));
                        item.shapeProps.tailLength = -y;
                    } else if (y > item.area.h) {
                        item.shapeProps.tailSide = 'bottom';
                        item.shapeProps.tailPosition = 100 * Math.max(0, Math.min(1.0, (x - x1) / (x2 - x1)));
                        item.shapeProps.tailLength = y - item.area.h;
                    }
                }
                if (y >= y1 && y <= y2) {
                    if (x < 0) {
                        item.shapeProps.tailSide = 'left';
                        item.shapeProps.tailPosition = 100 * Math.max(0, Math.min(1.0, (y - y1) / (y2 - y1)));
                        item.shapeProps.tailLength = -x;
                    } else if (x > item.area.w) {
                        item.shapeProps.tailSide = 'right';
                        item.shapeProps.tailPosition = 100 - 100 * Math.max(0, Math.min(1.0, (y - y1) / (y2 - y1)));
                        item.shapeProps.tailLength = x - item.area.w;
                    }
                }
            } else if (controlPointName === 'cornerRadius') {
                item.shapeProps.cornerRadius = Math.max(0, item.area.w - Math.max(item.area.w/2, originalX + dx));
            }
        }
    },


    editorProps: {
        description: 'rich',
        text: 'rich'
    },
    args: {
        fill                : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(230,230,230,1.0)'}, name: 'Fill'},
        strokeColor         : {type: 'color', value: 'rgba(100,100,100,1.0)', name: 'Stroke color'},
        strokeSize          : {type: 'number', value: 1, name: 'Stroke size'},
        cornerRadius        : {type: 'number', value: 10, name: 'Corner radius'},
        tailLength          : {type: 'number', value: 30, name: 'Tail Length'},
        tailWidth           : {type: 'number', value: 40, name: 'Tail Width'},
        tailSide            : {type: 'choice', value: 'bottom', name: 'Tail Side', options: ['top', 'bottom', 'left', 'right']},
        tailPosition        : {type: 'number', value: 0, name: 'Tail Position (%)', min: 0, max: 100.0},
    },

    computed: {
        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        shapePath() {
            return computePath(this.item);
        },
    }
}
</script>


