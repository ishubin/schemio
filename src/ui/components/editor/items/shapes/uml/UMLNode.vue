<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgFill"></path>

        <path :d="edgeLinePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            fill="none"></path>

    </g>
</template>
<script>
import AdvancedFill from '../../AdvancedFill.vue';

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

function calculateNameLineTop(item) {
    return 30 + calculateD(item);
}


export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeType: 'vue',

    computePath,

    args: {
        fill       : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Fill'},
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize : {type: 'number', value: 2, name: 'Stroke size'},
        depth      : {type: 'number', value: 20, name: 'Depth'},
    },

    computed: {
        shapePath() { return computePath(this.item); },
        svgFill() {
            return AdvancedFill.computeStandardFill(this.item);
        },

        nameLineTop() {
            return calculateNameLineTop(this.item);
            
        },

        edgeLinePath() {
            const W = this.item.area.w;
            const H = this.item.area.h;
            const D = calculateD(this.item);
            return `M 0 ${D}  l ${W-D} 0   l ${D} ${-D}  M ${W-D} ${D}  l 0 ${H-D}`;
        },

    } 
}
</script>


