<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>
        
        <path :d="`M 0 ${nameLineTop}  L ${item.area.w} ${nameLineTop}`" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
        />

        <foreignObject
            x="0" :y="item.shapeProps.strokeSize" :width="item.area.w" :height="Math.max(0, nameLineTop - 2*item.shapeProps.strokeSize)">
            <div class="item-text-container" v-html="item.name"
                style="padding-top: 4px; text-align: center;"
                :style="{'color': item.shapeProps.nameColor}"
            ></div>
        </foreignObject>

        <foreignObject v-if="item.text"
            x="0" :y="nameLineTop + item.shapeProps.strokeSize" :width="item.area.w" :height="item.area.h - nameLineTop - 2*item.shapeProps.strokeSize">
            <div class="item-text-container" v-html="item.text"
                :style="{'font-size': item.shapeProps.fontSize + 'px', 'padding-left': item.shapeProps.textPaddingLeft+'px', 'padding-right': item.shapeProps.textPaddingRight+'px', 'padding-top': item.shapeProps.textPaddingTop+'px', 'padding-bottom': item.shapeProps.textPaddingBottom+'px' }"
                ></div>
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
export default {
    props: ['item'],

    computePath,
    args: {
        strokeColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(255,125,125,0.5)', name: 'Fill color'},
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        fontSize: {type: 'number', value: 16, name: 'Text font size'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },

    computed: {
        nameLineTop() {
            return Math.min(this.item.area.h/2, Math.max(30, this.item.shapeProps.cornerRadius));
        },

        shapePath() { return computePath(this.item); }
    }
    
}
</script>

