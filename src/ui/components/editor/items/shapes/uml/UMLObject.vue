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

        <foreignObject v-if="hiddenTextProperty !== 'name'"
            x="0" :y="item.shapeProps.strokeSize" :width="item.area.w" :height="Math.max(0, nameLineTop - 2*item.shapeProps.strokeSize)">
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

function identifyTextEditArea(item, x, y) {
    const nameLineTop = Math.min(item.area.h/2, Math.max(30, item.shapeProps.cornerRadius));

    if (y < nameLineTop) {
        return {
            property: 'name',
            style: generateNameStyle(item),
            area: {
                x: 0, y: item.shapeProps.strokeSize,
                w: item.area.w,
                h: Math.max(0, item.area.h - nameLineTop - 2*item.shapeProps.strokeSize)
            }
        };
    }
    return null;
}

function generateNameStyle(item) {
    return {
        'color': item.shapeProps.nameColor,
        'padding-top': '4px',
        'text-align': 'center',
        'font-weight': 'bold'
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
        fillColor: {type: 'color', value: 'rgba(240,240,240,0.5)', name: 'Fill color'},
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        nameFontSize: {type: 'number', value: 16, name: 'Name Font Size'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },

    computed: {
        nameLineTop() {
            return Math.min(this.item.area.h/2, Math.max(30, this.item.shapeProps.cornerRadius));
        },
        textStyle() {
            return generateTextStyle(this.item);
        },
        nameStyle() {
            return generateNameStyle(this.item);
        },

        shapePath() { return computePath(this.item); },
    }
    
}
</script>

