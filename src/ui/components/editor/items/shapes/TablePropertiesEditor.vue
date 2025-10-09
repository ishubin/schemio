<template>
    <div>
        <div class="row">
            <div class="col-1 padded">
                <NumberTextfield :value="item.shapeProps.columns" :min="1" :max="100" name="Columns"
                    @changed="$emit('shape-prop-changed', 'columns', 'number', $event)"/>
            </div>
            <div class="col-1 padded">
                <NumberTextfield :value="item.shapeProps.rows" :min="1" :max="100" name="Rows"
                    @changed="$emit('shape-prop-changed', 'rows', 'number', $event)"/>
            </div>
        </div>
        <div class="row">
            <div class="col-1 padded" title="Fill">
                <AdvancedColorEditor :editorId="editorId" :value="item.shapeProps.fill" :disabled="false" @changed="$emit('shape-prop-changed', 'fill', 'advanced-color', $event)" />
            </div>
            <div class="col-1 padded" title="Secondary fill">
                <AdvancedColorEditor :editorId="editorId" :value="item.shapeProps.rowSecondaryFill" :disabled="!item.shapeProps.oddEvenFill" @changed="$emit('shape-prop-changed', 'rowSecondaryFill', 'advanced-color', $event)" />
            </div>
            <div class="col-1 padded" title="Header fill">
                <AdvancedColorEditor :editorId="editorId" :value="item.shapeProps.headerFill" :disabled="item.shapeProps.header === 'none'" @changed="$emit('shape-prop-changed', 'headerFill', 'advanced-color', $event)" />
            </div>
            <div class="col-1 padded" title="Stroke color">
                <ColorPicker :editorId="editorId" :color="item.shapeProps.stroke" :disabled="item.shapeProps.style === 'flat'" @changed="$emit('shape-prop-changed', 'stroke', 'color', $event)"/>
            </div>
        </div>
        <div class="row">
            <div class="col-1 padded">
                <NumberTextfield :value="item.shapeProps.strokeSize" :min="1" :max="100" name="Stroke size"
                    :disabled="item.shapeProps.style === 'flat'"
                    @changed="$emit('shape-prop-changed', 'strokeSize', 'number', $event)"/>
            </div>
        </div>

        <div class="hint hint-small text-centered">
                Choose table style
        </div>

        <div v-for="tableStyle in tableStyles" class="toggle-button" @click="applyTableStyle(tableStyle)">
            <svg :width="`${tableStyle.iconWidth}px`" :height="`${tableStyle.iconHeight}px`">
                <g transform="translate(3,3)">
                    <rect v-for="cell in tableStyle.cells" :x="cell.x" :y="cell.y" :width="cell.w" :height="cell.h" :fill="cell.color" stroke="none"/>
                    <line v-for="line in tableStyle.gridLines" :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2" stroke="#aaaaaa"/>
                </g>
            </svg>
        </div>

        <div style="clear: both;"> </div>
    </div>
</template>

<script>
import NumberTextfield from '../../../NumberTextfield.vue';
import ColorPicker from '../../ColorPicker.vue';
import AdvancedColorEditor from '../../AdvancedColorEditor.vue';

import {forEach} from '../../../../collections';

const tableStyles = [{
    name: 'Standard',
    shapeProps: {
        style: 'simple',
        oddEvenFill: false,
        header: 'none',
        cutCorner: false,
    }
}, {
    name: 'Flat',
    shapeProps: {
        style: 'flat',
        oddEvenFill: false,
        header: 'none',
        cutCorner: false,
    }
},{
    name: 'Standard with header',
    shapeProps: {
        style: 'simple',
        oddEvenFill: false,
        header: 'columns',
        cutCorner: false,
    }
}, {
    name: 'Flat with header',
    shapeProps: {
        style: 'flat',
        oddEvenFill: false,
        header: 'columns',
        cutCorner: false,
    }
},{
    name: 'Standard with vertical header',
    shapeProps: {
        style: 'simple',
        oddEvenFill: false,
        header: 'rows',
        cutCorner: false,
    }
}, {
    name: 'Flat with vertical header',
    shapeProps: {
        style: 'flat',
        oddEvenFill: false,
        header: 'rows',
        cutCorner: false,
    }
},{
    name: 'Standard with header, odd/even',
    shapeProps: {
        style: 'simple',
        oddEvenFill: true,
        header: 'columns',
        cutCorner: false,
    }
}, {
    name: 'Flat with header, odd/even rows',
    shapeProps: {
        style: 'flat',
        oddEvenFill: true,
        header: 'columns',
        cutCorner: false,
    }
},{
    name: 'Standard with both headers',
    shapeProps: {
        style: 'simple',
        oddEvenFill: false,
        header: 'both',
        cutCorner: false,
    }
}, {
    name: 'Flat with both headers',
    shapeProps: {
        style: 'flat',
        oddEvenFill: false,
        header: 'both',
        cutCorner: false,
    }
},{
    name: 'Standard with both headers, no corner',
    shapeProps: {
        style: 'simple',
        oddEvenFill: false,
        header: 'both',
        cutCorner: true,
    }
}, {
    name: 'Flat with both headers, no corner',
    shapeProps: {
        style: 'flat',
        oddEvenFill: false,
        header: 'both',
        cutCorner: true,
    }
}];

const basicColor = '#ffffff';
const headerColor = '#bbbbbb';
const secondaryColor = '#e3e3f3';

tableStyles.forEach(style => {
    style.cells = [];
    const h = 12;
    const w = 20;
    const pad = style.shapeProps.style === 'simple' ? 0 : 1;
    const rows = 4;
    const cols = 3;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = {
                color: basicColor,
                margin: style.shapeProps.style === 'simple' ? 0 : 2,
                hasBorder: style.shapeProps.style === 'simple',

                x: col * w + pad,
                w: w - 2* pad,
                y: row * h + pad,
                h: h - 2*pad
            };
            if (style.shapeProps.oddEvenFill && row > 0) {
                if (row % 2 == 0) {
                    cell.color = secondaryColor;
                }
            }

            if ((style.shapeProps.header === 'columns' && row === 0)
                || (style.shapeProps.header === 'rows' && col === 0)
                || (style.shapeProps.header === 'both' && (row === 0 || col === 0))) {
                cell.color = headerColor;
            }
            if (!(style.shapeProps.cutCorner && row === 0 && col === 0)) {
                style.cells.push(cell);
            }
        }
    }
    style.gridLines = [];
    if (style.shapeProps.style === 'simple') {
        for (let row = 0; row <= rows; row++) {
            style.gridLines.push({
                x1: style.shapeProps.cutCorner && row === 0 ? w : 0,
                x2: w * cols,
                y1: row * h,
                y2: row * h,
            });
        }
        for (let col = 0; col <= cols; col++) {
            style.gridLines.push({
                x1: col * w,
                x2: col * w,
                y1: style.shapeProps.cutCorner && col === 0 ? h : 0,
                y2: h * rows,
            });
        }
    }

    style.iconWidth = cols * w + 6;
    style.iconHeight = rows * h + 6;
});

export default {
    props: {
        editorId: {type: String, required: true},
        item: {type: Object},
        refreshKey: {type: String}
    },

    components: {NumberTextfield, ColorPicker, AdvancedColorEditor},
    data() {
        return {
            tableStyles
        }
    },

    methods: {
        applyTableStyle(tableStyle) {
            forEach(tableStyle.shapeProps, (value, name) => {
                this.item.shapeProps[name] = value;
            });

            this.$emit('item-mutated');
        }
    },

    watch: {
        refreshKey() {
            this.$forceUpdate();
        }
    }
};
</script>