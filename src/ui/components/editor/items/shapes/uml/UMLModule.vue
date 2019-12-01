<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <g :transform="`translate(-${moduleBrickWidth/2}, ${moduleBrickHeight})`">
            <path :d="moduleBrickPath"
                :stroke-width="item.shapeProps.strokeSize + 'px'"
                :stroke="item.shapeProps.strokeColor"
                :fill="item.shapeProps.fillColor"></path>
        </g>

        <g :transform="`translate(-${moduleBrickWidth/2}, ${3*moduleBrickHeight})`">
            <path :d="moduleBrickPath"
                :stroke-width="item.shapeProps.strokeSize + 'px'"
                :stroke="item.shapeProps.strokeColor"
                :fill="item.shapeProps.fillColor"></path>
        </g>

        <foreignObject v-if="hiddenTextProperty !== 'name'"
            x="0" :y="item.shapeProps.strokeSize" :width="item.area.w" :height="Math.max(0, item.area.h - item.shapeProps.strokeSize)">
            <div class="item-text-container"
                :style="nameStyle"
            >{{item.name}}</div>
        </foreignObject>
    </g>
</template>
<script>
const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'name',
        style: generateNameStyle(item),
    }
};

function generateNameStyle(item) {
    return {
        'color': item.shapeProps.nameColor,
        'padding-top': '4px',
        'text-align': 'center',
        'font-size': item.shapeProps.fontSize + 'px'
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
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(240,240,240,1.0)', name: 'Fill color'},
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
        namePosition: {type:'choice', value: 'center', options: ['top', 'bottom', 'center'], name: 'Name position'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },

    computed: {
        shapePath() { return computePath(this.item); },
        moduleBrickWidth() {
            return Math.max(0, this.item.area.w/3);
        },

        moduleBrickHeight() {
            return Math.max(0, this.item.area.h/8);
        },

        moduleBrickPath() {
            const w = this.moduleBrickWidth;
            const h = this.moduleBrickHeight;
            return `M 0 0  L ${w} 0  L ${w} ${h}  L 0 ${h} Z`;
        },

        nameStyle() {
            return generateNameStyle(this.item);
        }
    }
}
</script>

