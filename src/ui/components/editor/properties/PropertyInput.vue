<template>
    <div>
        <input v-if="descriptor.type === 'string'" class="textfield" :value="value" :disabled="disabled" @input="emitValue(arguments[0].target.value)"/>

        <input v-if="descriptor.type === 'image'" class="textfield" :value="value" :disabled="disabled" @input="emitValue(arguments[0].target.value)"/>

        <NumberTextfield v-if="descriptor.type === 'number'" :value="value" :disabled="disabled" @changed="emitValue(arguments[0])" :min="minValue" :max="maxValue"/>

        <ColorPicker v-if="descriptor.type === 'color'" :color="value" :disabled="disabled" @input="emitValue(arguments[0])"/>

        <AdvancedColorEditor v-if="descriptor.type === 'advanced-color'" :projectId="projectId" :value="value" :disabled="disabled" @changed="emitValue(arguments[0])" />

        <input v-if="descriptor.type === 'boolean'" type="checkbox" :checked="value" :disabled="disabled" @input="emitValue(arguments[0].srcElement.checked)"/>

        <select v-if="descriptor.type === 'choice'" :value="value" :disabled="disabled" @input="emitValue(arguments[0].target.value)">
            <option v-for="argOption in descriptor.options">{{argOption}}</option>
        </select>

        <StrokePatternDropdown v-if="descriptor.type === 'stroke-pattern'" :value="value" :disabled="disabled" @selected="emitValue( arguments[0])"/>

        <CurveCapDropdown v-if="descriptor.type === 'curve-cap'"
            :value="value"
            :is-source="!leftOriented"
            :is-fat="isFatConnector"
            width="16px"
            height="16px"
            :disabled="disabled"
            @selected="emitValue(arguments[0])"/>

        <ElementPicker v-if="descriptor.type === 'element'"
            :element="value"
            :use-self="false"
            :allow-none="true"
            :scheme-container="schemeContainer"
            :disabled="disabled"
            :excluded-item-ids="[itemId]"
            @selected="emitValue(arguments[0])"
            />

    </div>
    
</template>

<script>
import NumberTextfield from '../../NumberTextfield.vue';
import ColorPicker from '../ColorPicker.vue';
import AdvancedColorEditor from '../AdvancedColorEditor.vue';
import StrokePatternDropdown from '../StrokePatternDropdown.vue';
import CurveCapDropdown from '../CurveCapDropdown.vue';
import ElementPicker from '../ElementPicker.vue';


export default {
    props: {
        descriptor     : {type: Object, required: true},
        schemeContainer: {type: Object, required: true},
        projectId      : {type: String, required: true},
        value          : [Number, String, Object, Boolean],
        disabled       : {type: Boolean, default: false},
        leftOriented   : {type: Boolean, default: false},
        itemId         : {type: String, defalut: null},
        shapeProps     : {type: Object, required: false} // this is an ugly way of propagating fat connectors into the CurveCapDropdown
    },

    components: {
        NumberTextfield, ColorPicker, AdvancedColorEditor, StrokePatternDropdown,
        CurveCapDropdown, ElementPicker
    },

    methods: {
        emitValue(value) {
            this.$emit('input', value);
        }
    },

    computed: {
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

        isFatConnector() {
            if (this.shapeProps && this.shapeProps.fat) {
                return true;
            }
            return false;
        }
    }
}
</script>