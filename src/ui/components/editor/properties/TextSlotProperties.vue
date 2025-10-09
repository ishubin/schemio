<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <div v-if="textSlot">
            <table class="properties-table">
                <tbody>
                    <tr>
                        <td class="label" width="50%">Color</td>
                        <td class="value" width="50%">
                            <ColorPicker :editorId="editorId" :color="textSlot.color" @changed="emitTextSlotPropertyChange('color', $event)"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Bold</td>
                        <td class="value" width="50%">
                            <input type="checkbox" :checked="textSlot.bold" @input="emitTextSlotPropertyChange('bold', $event.target.checked)"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font</td>
                        <td class="value" width="50%">
                            <dropdown :options="allFonts" :value="textSlot.font" @selected="emitTextSlotPropertyChange('font', $event.name)"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font Size</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.fontSize" @changed="emitTextSlotPropertyChange('fontSize', $event)" :min="0" :softMax="100" :slider="true"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Horizontal Align</td>
                        <td class="value" width="50%">
                            <ul class="button-group">
                                <li v-for="opt in halignOptions">
                                    <span class="toggle-button" :class="{toggled: textSlot.halign === opt.value}"
                                        :title="opt.name"
                                        @click="emitTextSlotPropertyChange('halign', opt.value)">
                                        <i :class="opt.iconCss"></i>
                                    </span>
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Vertical Align</td>
                        <td class="value" width="50%">
                            <ul class="button-group">
                                <li v-for="opt in valignOptions">
                                    <span class="toggle-button" :class="{toggled: textSlot.valign === opt.value}"
                                        :title="opt.name"
                                        @click="emitTextSlotPropertyChange('valign', opt.value)">
                                        <i :class="opt.iconCss"></i>
                                    </span>
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Left</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.paddingLeft" @changed="emitTextSlotPropertyChange('paddingLeft', $event)" :min="0" :softMax="100" :slider="true"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Right</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.paddingRight" @changed="emitTextSlotPropertyChange('paddingRight', $event)" :min="0" :softMax="100" :slider="true"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Top</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.paddingTop" @changed="emitTextSlotPropertyChange('paddingTop', $event)" :min="0" :softMax="100" :slider="true"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Bottom</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.paddingBottom" @changed="emitTextSlotPropertyChange('paddingBottom', $event)" :min="0" :softMax="100" :slider="true"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">White Space</td>
                        <td class="value" width="50%">
                            <select :value="textSlot.whiteSpace" @input="emitTextSlotPropertyChange('whiteSpace', $event.target.value)">
                                <option :value="option.value" v-for="option in supportedWhiteSpaceOptions">{{option.name}}</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Letter spacing</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.letterSpacing" @changed="emitTextSlotPropertyChange('letterSpacing', $event)" :min="0" :softMax="100" :slider="true"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Line height</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="textSlot.lineHeight" :step="0.1" @changed="emitTextSlotPropertyChange('lineHeight', $event)" :min="0" :softMax="10" :slider="true"/>
                        </td>
                    </tr>
                    <tr v-for="availableTextSlot in availableTextSlots" v-if="slotName !== availableTextSlot && !textSlotTabsDisabled">
                        <td colspan="2">
                            <span class="btn btn-secondary" style="width: 100%" @click="onMoveToSlotClicked(availableTextSlot)">Move to "{{availableTextSlot}}" slot</span>
                        </td>
                    </tr>
                </tbody>
            </table>

        </div>
    </div>
</template>

<script>
import {getAllFonts} from '../../../scheme/Fonts';
import {map} from '../../../collections';
import Shape from '../../editor/items/shapes/Shape';
import Dropdown from '../../Dropdown.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import ColorPicker from '../ColorPicker.vue';
import {textWhiteSpaceOptions} from '../../../scheme/Item';
import EditorEventBus from '../EditorEventBus';

export default {
    props: ['item', 'editorId', 'slotName'],
    components: {Dropdown, NumberTextfield, ColorPicker},

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },
    data() {
        const shape = Shape.find(this.item.shape);

        return {
            textSlotTabsDisabled: shape.editorProps && shape.editorProps.textSlotTabsDisabled,
            textSlot: this.item.textSlots[this.slotName],
            availableTextSlots: map(shape.getTextSlots(this.item).filter(slot => slot.kind !== 'ghost'), textSlot => textSlot.name),
            allFonts: map(getAllFonts(), font => {return {name: font.name, style: {'font-family': font.family}}}),
            supportedWhiteSpaceOptions: textWhiteSpaceOptions,

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
        onItemChanged(propertyPath) {
            if (propertyPath && propertyPath.startsWith('textSlots.')) {
                this.textSlot = this.item.textSlots[this.slotName];
                this.$forceUpdate();
            }
        },
        onMoveToSlotClicked(anotherSlotName) {
            this.$emit('moved-to-slot', anotherSlotName);
        },

        emitTextSlotPropertyChange(name, value) {
            this.$emit('property-changed', {name, value});
            this.$forceUpdate();
        }
    }
}
</script>