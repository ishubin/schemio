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

        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" :y="nameLineTop + item.shapeProps.strokeSize" :width="item.area.w" :height="Math.max(0, item.area.h - nameLineTop - 2*item.shapeProps.strokeSize)">
            <div class="item-text-container" v-html="sanitizedItemText"
                :style="textStyle"
                ></div>
        </foreignObject>

    </g>
    
</template>

<script>
import htmlSanitize from '../../../../../htmlSanitize';

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
    return {
        property: 'text',
        style: generateTextStyle(item),
        area: {
            x: 0, y: nameLineTop + item.shapeProps.strokeSize,
            w: item.area.w,
            h: Math.max(0, item.area.h - nameLineTop - 2*item.shapeProps.strokeSize)
        }
    };
}

function generateTextStyle(item) {
    return {
        'font-size': item.shapeProps.fontSize + 'px',
        'padding-left': item.shapeProps.textPaddingLeft+'px',
        'padding-right': item.shapeProps.textPaddingRight+'px',
        'padding-top': item.shapeProps.textPaddingTop+'px',
        'padding-bottom': item.shapeProps.textPaddingBottom+'px'
    };
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

    args: {
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(240,240,240,0.5)', name: 'Fill color'},
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},

        textPaddingLeft: {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight: {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop: {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom: {type: 'number', value: 10, name: 'Text Padding Bottom'},
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

        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        }
    }
    
}
</script>

