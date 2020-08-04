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

    getTextSlots(item) {
        return [{
            name: 'title',
            area: {x: 0, y: 0, w: item.area.w, h: item.shapeProps.headerHeight}
        }, {
            name: 'body',
            area: {x: 0, y: item.shapeProps.headerHeight, w: item.area.w, h: Math.max(10, item.area.h - item.shapeProps.headerHeight)}
        }];
    },

    args: {
        fillColor: {type: 'color', value: 'rgba(240,240,240,1.0)', name: 'Fill color'},
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        headerHeight: {type: 'number', value: 30, name: 'Header Height'}
    },

    computed: {
        nameLineTop() {
            return Math.min(this.item.area.h, Math.max(this.item.shapeProps.headerHeight, this.item.shapeProps.cornerRadius));
        },
        shapePath() { return computePath(this.item); },
    }
    
}
</script>

