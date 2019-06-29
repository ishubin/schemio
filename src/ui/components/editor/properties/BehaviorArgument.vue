<template>
    <div style="display: inline-block;">

        <dropdown v-if="argument.type === 'choice'" :options="argument.options" @selected="onChange">
            <span class="behavior-action-argument">{{argument.displayValue}}</span>
        </dropdown>
        <input v-if="argument.type === 'text' || argument.type === 'number'" v-model="argument.value" @input="onInputChange"/>
        <color-picker v-if="argument.type === 'color'" :color="argument.value" @input="onChange"></color-picker>
    </div>
</template>
<script>
import Dropdown from '../../Dropdown.vue';
import ColorPicker from '../ColorPicker.vue';

export default {
    props: ['argument'],
    components: {Dropdown, ColorPicker},

    methods: {
        onChange(newValue) {
            this.argument.value = newValue;
            this.$emit('change', newValue);
        },
        onInputChange(event) {
            this.$emit('change', event.srcElement.value);
        }
    }
   
}
</script>

