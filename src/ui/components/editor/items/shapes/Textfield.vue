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
            <textarea v-if="item.shapeProps.multiline"
                :id="`textfield-item-${item.id}`"
                class="item-shape-textfield"
                :style="inputStyle"
                @blur="onBlur"
                :value="itemInputValue"
                @input="onTextfieldInput"
                />
            <input v-else :id="`textfield-item-${item.id}`"
                class="item-shape-textfield"
                :type="item.shapeProps.type"
                :style="inputStyle"
                @blur="onBlur"
                :value="itemInputValue"
                @input="onTextfieldInput"
                />
        </foreignObject>

        <foreignObject
            v-if="shouldShowPlaceholder"
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
import {computeSvgFill} from '../AdvancedFill.vue';
import { generateTextStyle } from '../../text/ItemText';
import EditorEventBus from '../../EditorEventBus';
import htmlSanitize from '../../../../../htmlSanitize';
import Events from '../../../../userevents/Events';

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);
    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};


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
            strokeSize  : {type: 'number', value: 1, name: 'Stroke size', min: 0, softMax: 100},
            cornerRadius: {type: 'number', value: 5, name: 'Corner radius', min: 0, softMax: 100},
            multiline   : {type: 'boolean', value: false, name: 'Multiline'},
            type        : {type: 'choice', value: 'text', name: 'Type', options: ['text', 'number'], depends: {multiline: false}},
        },
    },

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },

    data() {
        return {
            placeholderTextStyle: this.createPlaceholderTextStyle(),
            inputStyle: this.createInputStyle(),
            isFocused: false,
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
            style.color = this.item.shapeProps.textColor;
            style.border = 'none';
            style.background = 'none';
            style.outline = 'none';
            return style;
        },
        onPlaceholderClick() {
            if (this.mode !== 'view') {
                return;
            }
            this.isFocused = true;
            document.getElementById(`textfield-item-${this.item.id}`).focus();
        },

        onBlur(event) {
            if (this.mode !== 'view') {
                return;
            }
            if (!event.target.value) {
                this.isFocused = false;
            }
        },

        onItemChanged() {
            if (this.item.shape !== 'textfield') {
                return;
            }
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
            this.item.args.value = event.target.value;
            EditorEventBus.item.userEvent.$emit(this.editorId, this.item.id, Events.standardEvents.valueChange.id, this.item.args.value);
        }
    },

    computed: {
        shouldShowPlaceholder() {
            if (this.mode === 'edit' && this.item.meta.activeTextSlot === 'placeholder') {
                return false;
            }
            if (this.isFocused) {
                return false;
            }
            return !this.item.args || !this.item.args.value;
        },

        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        sanitizedBodyText() {
            if (this.item.textSlots && this.item.textSlots.placeholder) {
                return htmlSanitize(this.item.textSlots.placeholder.text);
            }
            return '';
        },

        itemInputValue() {
            if (this.item.args && this.item.args.hasOwnProperty('value')) {
                return this.item.args.value;
            }
            return '';
        }
    },

}
</script>
