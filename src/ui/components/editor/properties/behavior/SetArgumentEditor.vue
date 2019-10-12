<template>
    <div>
        <input v-if="argumentType === 'string' || argumentType === 'number' || argumentType === 'image'"
            style="width: 100px" :value="argumentValue" @input="emitValue"/>

        <color-picker v-if="argumentType === 'color'" :color="argumentValue" @input="emitValue"></color-picker>

        <input v-if="argumentType === 'boolean'" type="checkbox" v-model="argumentValue"/>

        <select v-if="argumentType === 'stroke-pattern'" v-model="argumentValue" @input="emitValue">
            <option v-for="knownPattern in knownStrokePatterns" :key="knownPattern">{{knownPattern}}</option>
        </select>
    </div>
</template>
<script>
import Dropdown from '../../../Dropdown.vue';
import Shape from '../../items/shapes/Shape.js';
import ColorPicker from '../../../editor/ColorPicker.vue';
import StrokePattern from '../../items/StrokePattern.js';


const SHAPE_PROPS_PREFIX = 'shapeProps.';

export default {
    props: ['argumentType', 'argumentValue'],

    components: {Dropdown, ColorPicker},

    data() {
        return {
            knownStrokePatterns: _.map(StrokePattern.getPatternsList(), pattern => {return {id: pattern, name: pattern}})
        };
    },

    methods: {
        emitValue(value) {
            this.$emit('changed', value);
        }
    }
}
</script>