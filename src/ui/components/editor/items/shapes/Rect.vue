<template>
    <g>
        <defs v-if="item.shapeProps.fill.type === 'image' && item.shapeProps.fill.image">
            <pattern :id="backgroundImageId" patternUnits="userSpaceOnUse" :width="item.area.w" :height="item.area.h">
                <image :xlink:href="item.shapeProps.fill.image" x="0" y="0" :width="item.area.w" :height="item.area.h"/>
            </pattern>
        </defs>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div class="item-text-container" v-html="sanitizedItemText"
                :style="textStyle"
                ></div>
        </foreignObject>


        <foreignObject v-if="item.shapeProps.showName && item.name && hiddenTextProperty !== 'name'"
            :x="nameArea.x" :y="nameArea.y" :width="nameArea.w" :height="nameArea.h">
            <div class="item-text-container"
                :style="nameStyle"
                >{{item.name}}</div>
        </foreignObject>

    </g>
</template>
<script>
import shortid from 'shortid';
import StrokePattern from '../StrokePattern.js';
import htmlSanitize from '../../../../../htmlSanitize';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function identifyTextEditArea(item, itemX, itemY) {
    if (item.shapeProps.showName && item.shapeProps.namePosition === 'center') {
        return {
            property: 'name',
            style: generateNameStyle(item)
        };
    }
    return {
        property: 'text',
        style: generateTextStyle(item)
    };
};

function generateTextStyle(item) {
    return {
        'color'           : item.shapeProps.textColor,
        'font-size'       : item.shapeProps.fontSize + 'px',
        'padding-left'    : item.shapeProps.textPaddingLeft + 'px',
        'padding-right'   : item.shapeProps.textPaddingRight + 'px',
        'padding-top'     : item.shapeProps.textPaddingTop + 'px',
        'padding-bottom'  : item.shapeProps.textPaddingBottom + 'px',
        'text-align'      : item.shapeProps.textHorizontalAlign,
        'vertical-align'  : item.shapeProps.textVerticalAlign,
        'display'         : 'table-cell',
        'width'           : item.area.w + 'px',
        'height'          : item.area.h + 'px',
    };
}

function generateNameStyle(item) {
    let displace = 50;
    if (item.shapeProps.namePosition === 'top') {
        displace = 100;
    } else if (item.shapeProps.namePosition === 'bottom') {
        displace = 0;
    }

    return {
        color               : item.shapeProps.nameColor,
        'text-align'        : 'center',
        'font-size'         : item.shapeProps.fontSize + 'px',
        'vertical-align'    : 'middle',
        position            : 'relative',
        top                 : `${displace}%`,
        transform           : `translateY(${-displace}%)`
    };
}

function makeCornerRadiusControlPoint(item) {
    return {
        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
        y: 0
    };
}

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath,

    controlPoints: {
        make(item, pointId) {
            if (!pointId) {
                return {
                    cornerRadius: makeCornerRadiusControlPoint(item),
                };
            } else if (pointId === 'cornerRadius') {
                return makeCornerRadiusControlPoint(item);
            }
        },
        handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
            if (controlPointName === 'cornerRadius') {
                item.shapeProps.cornerRadius = Math.max(0, item.area.w - Math.max(item.area.w/2, originalX + dx));
            }
        }
    },

    identifyTextEditArea,
    editorProps: {
        description: 'rich',
        text: 'rich'
    },
    args: {
        fill               : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Fill'},
        strokeColor        : {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        textColor          : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Text color'},
        strokeSize         : {type: 'number', value: 2, name: 'Stroke size', min: 0},
        strokePattern      : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},
        cornerRadius       : {type: 'number', value: 0, name: 'Corner radius', min: 0},
        fontSize           : {type: 'number', value: 16, name: 'Font Size', min: 1},
        textPaddingLeft    : {type: 'number', value: 10, name: 'Text Padding Left', min: 0},
        textPaddingRight   : {type: 'number', value: 10, name: 'Text Padding Right', min: 0},
        textPaddingTop     : {type: 'number', value: 10, name: 'Text Padding Top', min: 0},
        textPaddingBottom  : {type: 'number', value: 10, name: 'Text Padding Bottom', min: 0},
        textHorizontalAlign: {type:'choice', value: 'center', options: ['left', 'center', 'right'], name: 'Horizontal align'},
        textVerticalAlign  : {type:'choice', value: 'middle', options: ['top', 'middle', 'bottom'], name: 'Vertical align'},
        showName           : {type: 'boolean', value: false, name: 'Show Name'},
        namePosition       : {type:'choice', value: 'bottom', options: ['top', 'center', 'bottom'], name: 'Name position', depends: {showName: true}},
        nameColor          : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Name color', depends: {showName: true}},
    },
    data() {
        return {
            backgroundImageId: `bimg-${shortid.generate()}`
        }
    },
    computed: {
        svgFill() {
            const fill = this.item.shapeProps.fill;
            if (fill.type === 'solid') {
                return this.item.shapeProps.fill.color;
            } else if (fill.type === 'image') {
                return `url(#${this.backgroundImageId})`;
            }
            return 'none';
        },

        textStyle() {
            return generateTextStyle(this.item);
        },

        shapePath() {
            return computePath(this.item);
        },

        nameStyle() {
            return generateNameStyle(this.item);
        },

        nameArea() {
            const height = 60;
            if (this.item.shapeProps.namePosition === 'top') {
                return {x: 0, y:-height, w: this.item.area.w, h: height};
            } else if (this.item.shapeProps.namePosition === 'bottom') {
                return {x: 0, y:this.item.area.h, w: this.item.area.w, h: height};
            }
            return {x: 0, y: 0, w: this.item.area.w, h: this.item.area.h};
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        }
    }
}
</script>

