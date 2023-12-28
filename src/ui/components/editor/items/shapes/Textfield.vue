<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgFill"></path>

        <foreignObject
            v-if="mode === 'view'"
            :x="item.shapeProps.cornerRadius"
            :y="0"
            :width="Math.max(0, item.area.w - 2 * item.shapeProps.cornerRadius)"
            :height="item.area.h">
            <textarea v-if="item.shapeProps.multiline" :id="`textfield-item-${item.id}`"
                :style="inputStyle"
                @blur="onBlur"
                :value="itemInputValue"
                @input="onTextfieldInput"
                />
            <input v-else :id="`textfield-item-${item.id}`" :type="item.shapeProps.type"
                :style="inputStyle"
                @blur="onBlur"
                :value="itemInputValue"
                @input="onTextfieldInput"
                />
        </foreignObject>

        <foreignObject
            v-if="hideTextSlot !== 'placeholder' && (!item.args || !item.args._textfieldInput)"
            @click="onPlaceholderClick"
            :x="item.shapeProps.cornerRadius"
            :y="0"
            :width="Math.max(0, item.area.w - 2 * item.shapeProps.cornerRadius)"
            :height="item.area.h">
            <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="placeholderTextStyle" v-html="sanitizedBodyText"></div>
        </foreignObject>
    </g>
</template>
<script>
import {getStandardRectPins} from './ShapeDefaults'
import AdvancedFill from '../AdvancedFill.vue';
import { generateTextStyle } from '../../text/ItemText';
import EditorEventBus from '../../EditorEventBus';
import htmlSanitize from '../../../../../htmlSanitize';

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);
    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};


export function setTextfieldValue(item, value) {
    if (!item.args) {
        item.args = {};
    }
    item.args._textfieldInput = value;
    EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id, 'args._textfieldInput');
}

export function getTextfieldValue(item) {
    if (!item.args) {
        return '';
    }
    if (!item.args._textfieldInput) {
        return '';
    }
    return item.args._textfieldInput;
}

export default {
    props: ['item', 'editorId', 'mode'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'textfield',

        menuItems: [{
            group: 'General',
            name: 'Textfield',
            iconUrl: '/assets/images/items/textfield.svg',
            item: {
                cursor: 'text',
                textSlots: {
                    placeholder: {
                        text: '',
                        color: 'rgba(160,160,160,1.0)',
                        halign: 'left'
                    }
                }
            },
            previewArea: { x: 5, y: 5, w: 200, h: 40},
            size: {w: 200, h: 40}
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        getTextSlots(item) {
            const r = Math.max(0, item.shapeProps.cornerRadius);
            return [{
                name: 'placeholder',
                area: {x: r, y: 0, w: Math.max(0, item.area.w-2*r), h: item.area.h}
            }];
        },

        computePath,

        editorProps: {
            customTextRendering: true,
            disableEventLayer: true
        },

        controlPoints: {
            make(item) {
                return {
                    cornerRadius: {
                        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
                        y: 0
                    }
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                }
            }
        },

        args: {
            fill        : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1.0)'}, name: 'Fill'},
            textColor   : {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Text color'},
            strokeColor : {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Stroke color'},
            strokeSize  : {type: 'number', value: 1, name: 'Stroke size'},
            cornerRadius: {type: 'number', value: 5, name: 'Corner radius', min: 0},
            multiline   : {type: 'boolean', value: false, name: 'Multiline'},
            type        : {type: 'choice', value: 'text', name: 'Type', options: ['text', 'number'], depends: {multiline: false}},
        },
    },

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.textSlot.triggered.specific.$on(this.editorId, this.item.id, this.onItemTextSlotEditTriggered);
        EditorEventBus.textSlot.canceled.specific.$on(this.editorId, this.item.id, this.onItemTextSlotEditCanceled);
    },

    beforeDestroy() {
        EditorEventBus.textSlot.triggered.specific.$off(this.editorId, this.item.id, this.onItemTextSlotEditTriggered);
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.textSlot.canceled.specific.$off(this.editorId, this.item.id, this.onItemTextSlotEditCanceled);
    },

    data() {
        return {
            hideTextSlot: null,
            placeholderTextStyle: this.createPlaceholderTextStyle(),
            inputStyle: this.createInputStyle(),
        };
    },

    methods: {
        createInputStyle() {
            let style = {};
            const r = Math.max(0, this.item.shapeProps.cornerRadius);
            if (this.item.textSlots && this.item.textSlots.placeholder) {
                style = generateTextStyle(this.item.textSlots.placeholder);
            }

            style.display = 'block';
            style.width = '100%';
            style.height = '100%';
            style.color = this.item.shapeProps.color;
            style.border = 'none';
            style.background = 'none';
            style.outline = 'none';
            return style;
        },
        onPlaceholderClick() {
            if (this.mode !== 'view') {
                return;
            }
            this.hideTextSlot = 'placeholder';
            document.getElementById(`textfield-item-${this.item.id}`).focus();
        },

        onBlur(event) {
            if (this.mode !== 'view') {
                return;
            }
            if (!event.target.value) {
                this.hideTextSlot = null;
            }
        },

        onItemTextSlotEditTriggered(item, slotName, area, markupDisabled) {
            this.hideTextSlot = slotName;
        },
        onItemTextSlotEditCanceled(item, slotName) {
            this.hideTextSlot = null;
        },
        onItemChanged() {
            this.placeholderTextStyle = this.createPlaceholderTextStyle();
            this.$forceUpdate();
        },
        createPlaceholderTextStyle() {
            let style = {};
            const r = Math.max(0, this.item.shapeProps.cornerRadius);
            if (this.item.textSlots && this.item.textSlots.placeholder) {
                style = generateTextStyle(this.item.textSlots.placeholder);
                style.width = `${Math.max(0, this.item.area.w-2*r)}px`;
                style.height = `${this.item.area.h}px`;
                style.cursor = this.item.cursor;
            }
            return style;
        },
        onTextfieldInput(event) {
            if (!this.item.args) {
                this.item.args = {};
            }
            this.item.args._textfieldInput = event.target.value;
        }
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return AdvancedFill.computeStandardFill(this.item);
        },

        sanitizedBodyText() {
            if (this.item.textSlots && this.item.textSlots.placeholder) {
                return htmlSanitize(this.item.textSlots.placeholder.text);
            }
            return '';
        },

        itemInputValue() {
            if (this.item.args && this.item.args._textfieldInput) {
                return this.item.args._textfieldInput;
            }
            return '';
        }
    },

}
</script>
