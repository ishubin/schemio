<template>
    <div>
        <input v-if="argumentType === 'string' || argumentType === 'number' || argumentType === 'image'"
            style="width: 100px" :value="argumentValue" @input="onInputValue"/>

        <color-picker v-if="argumentType === 'color'" :color="argumentValue" @input="emitValue"></color-picker>

        <input v-if="argumentType === 'boolean'" type="checkbox" :checked="argumentValue" @input="onCheckboxInput"/>

        <select v-if="isChoice" :value="argumentValue" @input="onInputValue">
            <option v-for="option in choiceOptions" :key="option">{{option}}</option>
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
    props: ['argumentValue', 'argumentDescription'],

    components: {Dropdown, ColorPicker},

    data() {
        let isChoice = false;
        let choiceOptions = [];

        if (this.argumentDescription.type === 'stroke-pattern') {
            isChoice = true;
            choiceOptions = StrokePattern.getPatternsList();
        } else if (this.argumentDescription.type === 'choice') {
            isChoice = true;
            choiceOptions = this.argumentDescription.options;
        }
        return {
            isChoice,
            choiceOptions,
            argumentType: this.argumentDescription.type
        };
    },

    methods: {
        emitValue(value) {
            this.$emit('changed', value);
        },
        onInputValue(event) {
            this.emitValue(event.target.value);
        },
        onCheckboxInput(event) {
            this.emitValue(event.target.checked);
        }
    }
}
</script>