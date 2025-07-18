<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <input v-if="descriptor.type === 'string'" class="textfield" :value="value" :disabled="disabled" @input="emitValue($event.target.value)"/>

        <input v-if="descriptor.type === 'image'" class="textfield" :value="value" :disabled="disabled" @input="emitValue($event.target.value)"/>

        <NumberTextfield v-if="descriptor.type === 'number'"
            :value="value"
            :disabled="disabled"
            :min="minValue"
            :max="maxValue"
            :softMax="softMaxValue"
            :slider="minValue !== null && (maxValue !== null || softMaxValue !== null)"
            :step="stepValue"
            @changed="emitValue"
            />

        <ColorPicker :editorId="editorId" v-if="descriptor.type === 'color'" :color="value" :disabled="disabled" @input="emitValue"/>

        <AdvancedColorEditor :editorId="editorId" v-if="descriptor.type === 'advanced-color'" :value="value" :disabled="disabled" @changed="emitValue" />

        <input v-if="descriptor.type === 'boolean'" type="checkbox" :checked="value" :disabled="disabled" @input="emitValue($event.srcElement.checked)"/>

        <select v-if="descriptor.type === 'choice'" :value="value" :disabled="disabled" @input="emitValue($event.target.value)">
            <option v-for="argOption in descriptor.options">{{argOption}}</option>
        </select>

        <StrokePatternDropdown v-if="descriptor.type === 'stroke-pattern'" :editorId="editorId" :value="value" :disabled="disabled" @selected="emitValue"/>

        <PathCapDropdown v-if="descriptor.type === 'path-cap'"
            :value="value"
            :is-source="!leftOriented"
            :is-thick="isThickConnector"
            width="16px"
            :height="16"
            :disabled="disabled"
            @selected="emitValue"/>

        <ElementPicker v-if="descriptor.type === 'element'"
            :editorId="editorId"
            :element="value"
            :use-self="false"
            :allow-none="true"
            :scheme-container="schemeContainer"
            :disabled="disabled"
            :excluded-item-ids="[itemId]"
            @selected="emitValue"
            />

        <DiagramPicker v-if="descriptor.type === 'scheme-ref'"
            :key="`item-props-diagram-picker-${itemId}-${value}`"
            :diagramId="value"
            :disabled="disabled"
            @diagram-selected="onDiagramPicked"
            />

        <ColorMatrix v-if="descriptor.type === 'color-matrix'" :matrix="value" @changed="emitValue"/>

        <Dropdown v-if="descriptor.type === 'font'"
            :options="allFonts"
            :value="value"
            @selected="emitValue($event.name)"/>
    </div>

</template>

<script>
import NumberTextfield from '../../NumberTextfield.vue';
import ColorPicker from '../ColorPicker.vue';
import AdvancedColorEditor from '../AdvancedColorEditor.vue';
import StrokePatternDropdown from '../StrokePatternDropdown.vue';
import PathCapDropdown from '../PathCapDropdown.vue';
import ElementPicker from '../ElementPicker.vue';
import DiagramPicker from '../DiagramPicker.vue';
import ColorMatrix from './ColorMatrix.vue';
import Dropdown from '../../Dropdown.vue';
import { getAllFonts } from '../../../scheme/Fonts';

export default {
    props: {
        editorId       : {type: String, required: true},
        descriptor     : {type: Object, required: true},
        schemeContainer: {type: Object, required: true},
        value          : [Number, String, Object, Boolean],
        disabled       : {type: Boolean, default: false},
        leftOriented   : {type: Boolean, default: false},
        itemId         : {type: String, defalut: null, required: false},
        shapeProps     : {type: Object, required: false} // this is an ugly way of propagating thick connectors into the PathCapDropdown
    },

    components: {
        NumberTextfield, ColorPicker, AdvancedColorEditor, StrokePatternDropdown,
        PathCapDropdown, ElementPicker, ColorMatrix, DiagramPicker, Dropdown
    },

    data() {
        return {
            allFonts: getAllFonts().map(font => {return {name: font.name, style: {'font-family': font.family}}}),
        };
    },

    methods: {
        emitValue(value) {
            this.$emit('input', value);
        },

        onDiagramPicked(diagram) {
            this.emitValue(diagram.id);
        },
    },

    computed: {
        stepValue() {
            if (this.descriptor.hasOwnProperty('step')) {
                return this.descriptor.step;
            }
            return 1;
        },

        minValue() {
            if (this.descriptor.hasOwnProperty('min')) {
                return this.descriptor.min;
            }
            return null;
        },

        maxValue() {
            if (this.descriptor.hasOwnProperty('max')) {
                return this.descriptor.max;
            }
            return null;
        },

        softMaxValue() {
            if (this.descriptor.hasOwnProperty('softMax')) {
                return this.descriptor.softMax;
            }
            return null;
        },

        isThickConnector() {
            if (this.shapeProps && this.shapeProps.thick) {
                return true;
            }
            return false;
        },
    }
}
</script>