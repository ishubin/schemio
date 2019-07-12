<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <path :d="edgeLinePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            fill="none"></path>

        <foreignObject
            x="0" :y="textarea.y" :width="textarea.w" :height="textarea.h">
            <div class="item-text-container" v-html="item.name"
                style="padding-top: 4px; text-align: center;"
                :style="{'color': item.shapeProps.nameColor}"
            ></div>
        </foreignObject>
    </g>
</template>
<script>

const calculateD = (item) => {
    let D = item.shapeProps.depth;
    const minD = Math.min(item.area.w, item.area.h) / 4;
    if (D > minD) {
        D =  minD;
    }
    return D;
};

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const D = calculateD(item);
    return `M 0 ${D}  l ${D} ${-D}   l ${W-D} 0  l 0 ${H-D}  l ${-D} ${D}  l ${D-W} 0  Z`;
};
export default {
    props: ['item'],

    computePath,
    args: {
        depth: {type: 'number', value: 20, name: 'Depth'},
        strokeColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(250,250,250, 1.0)', name: 'Fill color'},
        fontSize: {type: 'number', value: 16, name: 'Text font size'},
        namePosition: {type:'choice', value: 'center', options: ['top', 'bottom', 'center'], name: 'Name position'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },

    computed: {
        shapePath() { return computePath(this.item); },
        brickWidth() {
            return Math.max(0, this.item.area.w/3);
        },

        brickHeight() {
            return Math.max(0, this.item.area.h/8);
        },

        textarea() {
            const d = calculateD(this.item);
            return {
                x: 0, y: d,
                w: this.item.area.w - d,
                h: this.item.area.h - d
            };
        },

        edgeLinePath() {
            const W = this.item.area.w;
            const H = this.item.area.h;
            const D = calculateD(this.item);
            return `M 0 ${D}  l ${W-D} 0   l ${D} ${-D}  M ${W-D} ${D}  l 0 ${H-D}`;
        }
    }
}
</script>


