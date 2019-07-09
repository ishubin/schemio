<template>
    <div style="display: inline-block;">

        <dropdown v-if="argument.type === 'choice'" :options="argument.options" @selected="onChange">
            <span class="behavior-action-argument">{{argument.displayValue}}</span>
        </dropdown>
        <input v-if="argument.type === 'text' || argument.type === 'number'" v-model="argument.value" @input="onInputChange"/>
        <color-picker v-if="argument.type === 'color'" :color="argument.value" @input="onChange"></color-picker>

        <dropdown v-if="argument.type === 'stroke-pattern'" :options="knownStrokePatterns" @selected="onChange">
            <span class="behavior-action-argument">{{argument.value}}</span>
        </dropdown>
    </div>
</template>
<script>
import Dropdown from '../../Dropdown.vue';
import ColorPicker from '../ColorPicker.vue';
import StrokePattern from '../items/StrokePattern.js';
import _ from 'lodash';

export default {
    props: ['argument'],
    components: {Dropdown, ColorPicker},

    data() {
        return {
            knownStrokePatterns: _.map(StrokePattern.getPatternsList(), pattern => {return {id: pattern, name: pattern}})
        };
    },

    methods: {
        onChange(newValue) {
            this.argument.value = newValue;
            this.$emit('change', newValue);
            this.$forceUpdate();
        },
        onInputChange(event) {
            this.$emit('change', event.srcElement.value);
        }
    }
   
}
</script>

