<template>
    <div class="text-style-control">
        <div v-if="supportsTextSlots"
            class="text-style-control-toggle-button"
            :style="{'border-bottom': `4px solid ${textColor}`}"
            @click="toggleDropdown"
            title="Stroke"
            >A</div>
        <div class="text-style-control-dropdown" v-if="toggled">
            <div class="text-style-control-color-container">
                <color-picker v-model="vuePickerColor" @input="updateColor"/>
            </div>
            <div class="text-style-control-other-controls">
                <div>
                    <dropdown :options="allFonts" :value="font" @selected="onFontChange(arguments[0].name)"/>
                </div>
                <div>
                    <NumberTextfield name="Font Size" :value="fontSize" @changed="onFontSizeChange(arguments[0])" :min="0"/>
                </div>
                <div>
                    <ul class="button-group">
                        <li v-for="opt in halignOptions">
                            <span class="toggle-button" :class="{toggled: halign === opt.value}"
                                :title="opt.name"
                                @click="onHAlignChange(opt.value)">
                                <i :class="opt.iconCss"></i>
                            </span>
                        </li>
                    </ul>
                </div>
                <div>
                    <ul class="button-group">
                        <li v-for="opt in valignOptions">
                            <span class="toggle-button" :class="{toggled: valign === opt.value}"
                                :title="opt.name"
                                @click="onVAlignChange(opt.value)">
                                <i :class="opt.iconCss"></i>
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>


<script>
import Shape from './items/shapes/Shape';
import VueColor from 'vue-color';
import NumberTextfield from '../NumberTextfield.vue';
import Dropdown from '../Dropdown.vue';
import { getAllFonts, getDefaultFont } from '../../scheme/Fonts';
import map from 'lodash/map';
import EditorEventBus from './EditorEventBus';

export default {
    props: {
        editorId: {type: String, required: true},
        item: {type: Object, required: true},
    },

    components: {'color-picker': VueColor.Sketch, NumberTextfield, Dropdown},

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChange);
        document.body.addEventListener('click', this.onBodyClick);
    },

    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChange);
        document.body.removeEventListener('click', this.onBodyClick);
    },

    data() {
        const props = this.buildAllProps();

        return {
            toggled          : false,
            textColor        : props.textColor,
            fontSize         : props.fontSize,
            font             : props.font,
            halign           : props.halign,
            valign           : props.valign,
            supportsTextSlots: props.supportsTextSlots,
            vuePickerColor   : {hex: props.textColor},
            allFonts         : map(getAllFonts(), font => {return {name: font.name, style: {'font-family': font.family}}}),

            halignOptions: [{
                name: 'Left', value: 'left', iconCss: 'fas fa-align-left'
            }, {
                name: 'Center', value: 'center', iconCss: 'fas fa-align-center'
            }, {
                name: 'Right', value: 'right', iconCss: 'fas fa-align-right'
            }],

            valignOptions: [{
                name: 'Top', value: 'top', iconCss: 'schemio-icon schemio-icon-valign-top'
            }, {
                name: 'Middle', value: 'middle', iconCss: 'schemio-icon schemio-icon-valign-middle'
            }, {
                name: 'Bottom', value: 'bottom', iconCss: 'schemio-icon schemio-icon-valign-bottom'
            }],
        };
    },

    methods: {
        buildAllProps() {
            let supportsTextSlots = false;
            let textColor = 'rgba(0, 0, 0, 1.0)';
            let fontSize = 14;
            let font = getDefaultFont();
            let halign = 'left';
            let valign = 'top';

            const shape = Shape.find(this.item.shape);
            if (shape && shape.getTextSlots) {
                const textSlots = shape.getTextSlots(this.item);
                if (textSlots && textSlots.length > 0) {
                    const slotName = textSlots[0].name;
                    if (this.item.textSlots && this.item.textSlots[slotName]) {
                        if (this.item.textSlots[slotName].font) {
                            font = this.item.textSlots[slotName].font;
                        }
                        if (this.item.textSlots[slotName].color) {
                            textColor = this.item.textSlots[slotName].color;
                        }
                        if (this.item.textSlots[slotName].fontSize) {
                            fontSize = this.item.textSlots[slotName].fontSize;
                        }
                        if (this.item.textSlots[slotName].halign) {
                            halign = this.item.textSlots[slotName].halign;
                        }
                        if (this.item.textSlots[slotName].valign) {
                            valign = this.item.textSlots[slotName].valign;
                        }
                    }
                    supportsTextSlots = true;
                }
            }

            return {
                textColor,
                fontSize,
                font,
                halign,
                valign,
                supportsTextSlots,
            };
        },

        toggleDropdown() {
            this.toggled = !this.toggled;
            this.updateProps();
        },

        updateProps() {
            const props = this.buildAllProps();
            this.textColor = props.textColor;
            this.fontSize = props.fontSize;
            this.font = props.font;
            this.halign = props.halign;
            this.valign = props.valign;
            this.supportsTextSlots = props.supportsTextSlots;
            this.vuePickerColor.hex = this.textColor;
        },

        onItemChange(propertyPath) {
            if (propertyPath && propertyPath.startsWith('textSlots.')) {
                this.updateProps();
            }
        },

        updateColor(color) {
            this.textColor = `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`;
            this.emitPropertyChange('color', this.textColor);
        },

        onFontSizeChange(fontSize) {
            this.fontSize = fontSize;
            this.emitPropertyChange('fontSize', fontSize);
        },

        onFontChange(font) {
            this.font = font;
            this.emitPropertyChange('font', font);
        },

        onHAlignChange(value) {
            this.halign = value;
            this.emitPropertyChange('halign', value);
        },

        onVAlignChange(value) {
            this.valign = value;
            this.emitPropertyChange('valign', value);
        },

        emitPropertyChange(name, value) {
            this.$emit('property-changed', name, value);
        },

        onBodyClick(event) {
            if (!event.target || !event.target.closest('.text-style-control')) {
                this.toggled = false;
            }
        }
    }
}
</script>