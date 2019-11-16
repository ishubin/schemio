<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <path :d="`M0 0 L ${brickWidth} 0`"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <foreignObject v-if="hiddenTextProperty !== 'name'"
            x="0" :y="item.shapeProps.strokeSize" :width="item.area.w" :height="Math.max(0, item.area.h - item.shapeProps.strokeSize)">
            <div class="item-text-container" :style="nameStyle"
            >{{item.name}}</div>
        </foreignObject>
    </g>
</template>
<script>
const brickWidth = (item) => {
   return Math.max(0, item.area.w/3);
};
const brickHeight = (item) => {
    return Math.max(0, item.area.h/8);
};
const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const BW = brickWidth(item);
    const BH = brickHeight(item);
    return `M 0 0  L 0 ${-BH}  L ${BW} ${-BH}  L ${BW} 0  L ${W} 0  L ${W} ${H} L 0 ${H} Z`;
};

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'name',
        style: generateNameStyle(item)
    }
};

function generateNameStyle(item) {
    return {
        'color': item.shapeProps.nameColor,
        'padding-top': '4px',
        'text-align': 'center',
        'font-weight': 'bold',
        'font-size': item.shapeProps.fontSize + 'px'
    };
}

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,
    identifyTextEditArea,
    args: {
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(240,240,240, 1.0)', name: 'Fill color'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
        namePosition: {type:'choice', value: 'center', options: ['top', 'bottom', 'center'], name: 'Name position'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },

    computed: {
        shapePath() { return computePath(this.item); },
        brickWidth() {
            return Math.max(0, this.item.area.w/3);
        },
        nameStyle() {
            return generateNameStyle(this.item);
        },

        brickHeight() {
            return Math.max(0, this.item.area.h/8);
        }
    }
}
</script>

