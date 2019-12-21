<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" y="0" :width="item.area.w" :height="Math.max(0, item.area.h - item.shapeProps.tailLength)">
            <div class="item-text-container" v-html="sanitizedItemText"
                :style="textStyle"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
import shortid from 'shortid';
import htmlSanitize from '../../../../../htmlSanitize';

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
            const t = Math.max(0, Math.min(item.shapeProps.tailPosition, 100.0)) / 100.0;
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

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'text',
        style: generateTextStyle(item)
    }
};

function generateTextStyle(item) {
    return {
        'font-size': item.shapeProps.fontSize + 'px',
        'padding-left': item.shapeProps.textPaddingLeft + 'px',
        'padding-right': item.shapeProps.textPaddingRight + 'px',
        'padding-top': item.shapeProps.textPaddingTop + 'px',
        'padding-bottom': item.shapeProps.textPaddingBottom + 'px'
    };
}

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    identifyTextEditArea,

    editorProps: {
        description: 'rich',
        text: 'rich'
    },
    args: {
        cornerRadius: {type: 'number', value: 10, name: 'Corner radius'},
        tailLength: {type: 'number', value: 30, name: 'Tail Length'},
        tailWidth: {type: 'number', value: 40, name: 'Tail Width'},
        tailSide: {type: 'choice', value: 'bottom', name: 'Tail Side', options: ['top', 'bottom', 'left', 'right']},
        tailPosition: {type: 'number', value: 0, name: 'Tail Position', min: 0, max: 100.0},
        strokeColor: {type: 'color', value: 'rgba(100,100,100,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 1, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(230,230,230,1.0)', name: 'Fill color'},
        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
        fontSize: {type: 'number', value: 16, name: 'Font size'}
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },
        textStyle() {
            return generateTextStyle(this.item);
        },

        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        }
    }
}
</script>


