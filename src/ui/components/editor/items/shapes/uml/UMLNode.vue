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

        <foreignObject v-if="hiddenTextProperty !== 'name'"
            x="0" :y="textarea.y" :width="textarea.w" :height="textarea.h">
            <div class="item-text-container"
                style="padding-top: 4px; text-align: center;"
                :style="nameStyle"
            >{{item.name}}</div>
        </foreignObject>

        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" :y="nameLineTop + item.shapeProps.strokeSize" :width="textarea.w" :height="Math.max(0, item.area.h - nameLineTop - 2*item.shapeProps.strokeSize)">
            <div class="item-text-container" v-html="sanitizedItemText"
                :style="textStyle"
                ></div>
        </foreignObject>
    </g>
</template>
<script>
import htmlSanitize from '../../../../../../htmlSanitize';

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

function identifyTextEditArea(item, itemX, itemY) {
    const nameLineTop = calculateNameLineTop(item);
    const textarea = calculateTextArea(item);
    if (itemY < nameLineTop) {
        return {
            property: 'name',
            style: generateNameStyle(item),
            area: textarea
        }
    } else {
        return {
            property: 'text',
            style: generateTextStyle(item),
            area: {
                x: 0, y: nameLineTop + item.shapeProps.strokeSize,
                w: textarea.w, 
                h: Math.max(0, item.area.h - nameLineTop - 2*item.shapeProps.strokeSize)
            }
        }
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

function generateTextStyle(item) {
    return {
        'color': item.shapeProps.nameColor,
        'padding-top': '4px',
        'text-align': 'center',
        'font-size': item.shapeProps.fontSize + 'px'
    };
}

function calculateTextArea(item) {
    const d = calculateD(item);
    return {
        x: item.shapeProps.strokeSize, y: d + item.shapeProps.strokeSize,
        w: Math.max(0, item.area.w - d - 2 * item.shapeProps.strokeSize),
        h: Math.max(0, item.area.h - d - 2 * item.shapeProps.strokeSize)
    };
}

function calculateNameLineTop(item) {
    return 30 + calculateD(item);
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
        depth: {type: 'number', value: 20, name: 'Depth'},
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        strokeSize: {type: 'number', value: 2, name: 'Stroke size'},
        fillColor: {type: 'color', value: 'rgba(240,240,240, 1.0)', name: 'Fill color'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
        namePosition: {type:'choice', value: 'center', options: ['top', 'bottom', 'center'], name: 'Name position'},
        nameColor: {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color'},
    },

    computed: {
        shapePath() { return computePath(this.item); },

        nameLineTop() {
            return calculateNameLineTop(this.item);
            
        },

        textarea() {
            return calculateTextArea(this.item);
        },

        edgeLinePath() {
            const W = this.item.area.w;
            const H = this.item.area.h;
            const D = calculateD(this.item);
            return `M 0 ${D}  l ${W-D} 0   l ${D} ${-D}  M ${W-D} ${D}  l 0 ${H-D}`;
        },

        textStyle() {
            return generateTextStyle(this.item);
        },

        nameStyle() {
            return generateNameStyle(this.item);
        },

        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        }
    } 
}
</script>


