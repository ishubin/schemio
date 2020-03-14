<template>
    <g>
        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="item.shapeProps.fillColor"></path>

        <circle cx="15" cy="15" r="5" fill="#EC6762"/>
        <circle cx="30" cy="15" r="5" fill="#F4BE5E"/>
        <circle cx="45" cy="15" r="5" fill="#61C761"/>

        <foreignObject v-if="item.text && hiddenTextProperty !== 'text'"
            x="0" y="0" :width="item.area.w" :height="item.area.h">
            <pre class="syntax-markup" :class="[`syntax-theme-${item.shapeProps.theme}`]"><code :style="textStyle">{{item.text}}</code></pre>
        </foreignObject>


        <foreignObject v-if="item.name"
            :x="0" :y="0" :width="this.item.area.w" :height="25">
            <div class="item-text-container"
                :style="nameStyle"
                >{{item.name}}</div>
        </foreignObject>

    </g>
</template>
<script>
import _ from 'lodash';


const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function identifyTextEditArea(item, itemX, itemY) {
    return {
        property: 'text',
        style: generateTextStyle(item)
    }
};

function generateTextStyle(item) {
    return {
        'font-size': item.shapeProps.fontSize + 'px',
        'padding-left': item.shapeProps.textPaddingLeft + 'px',
        'padding-right': item.shapeProps.textPaddingRight + 'px',
        'padding-top': item.shapeProps.textPaddingTop + 'px',
        'padding-bottom': item.shapeProps.textPaddingBottom + 'px',
        'color': item.shapeProps.textColor,
        'width': item.area.w + 'px',
        'height': item.area.h + 'px',
    };
}

const themes = {
    dark: {
        fillColor: 'rgba(34,34,34,1.0)',
        nameColor: 'rgba(236,236,236,1.0)',
        strokeColor: 'rgba(25,25,25,1.0)'
    },
    white: {
        fillColor: 'rgba(250,250,250,1.0)',
        nameColor: 'rgba(30,30,30,1.0)',
        strokeColor: 'rgba(180,180,180,1.0)'
    }
}


export default {
    props: ['item', 'hiddenTextProperty'],
    computePath,
    identifyTextEditArea,
    editorProps: {
        description: 'disabled',
        text: 'simple'
    },
    args: {
        fillColor:          {type: 'color', value: 'rgba(240, 240, 240, 1.0)', name: 'Fill color'},
        textColor:          {type: 'color', value: 'rgba(30, 30, 30, 1.0)', name: 'Text color'},
        nameColor:          {type: 'color', value: 'rgba(30, 30, 30, 1.0)', name: 'Name color'},
        strokeColor:        {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Stroke color'},
        strokeSize:         {type: 'number', value: 1, name: 'Stroke size'},
        cornerRadius:       {type: 'number', value: 4, name: 'Corner radius'},
        fontSize:           {type: 'number', value: 14, name: 'Font Size'},
        textPaddingLeft:    {type: 'number', value: 10, name: 'Text Padding Left'},
        textPaddingRight:   {type: 'number', value: 10, name: 'Text Padding Right'},
        textPaddingTop:     {type: 'number', value: 10, name: 'Text Padding Top'},
        textPaddingBottom:  {type: 'number', value: 10, name: 'Text Padding Bottom'},
    },

    computed: {
        textStyle() {
            return generateTextStyle(this.item);
        },

        shapePath() {
            return computePath(this.item);
        },

        nameStyle() {
            return {
                'color': this.item.shapeProps.nameColor,
                'text-align': 'center',
                'vertical-align': 'middle',
                'position': 'relative',
                'padding': '4px',
                'font-size': '14px',
                'font-weight': 'bold'
            };
        }
    },
}
</script>