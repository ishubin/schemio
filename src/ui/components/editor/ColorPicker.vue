<template lang="html">
    <div class="color-picker">
        <span class="color-picker-toggle-button"
            :style="{'background': pickerColor}"
            @click="toggleColorPicker = !toggleColorPicker"
            ></span>
        <chrome-picker v-model="chromePickerColor" v-if="toggleColorPicker" @input="updateColor"></chrome-picker>
    </div>
</template>

<script>
import VueColor from 'vue-color';

export default {
    props: ['color'],
    components: {'chrome-picker': VueColor.Chrome},
    data() {
        return {
            pickerColor: this.color,
            chromePickerColor: {hex: this.color},
            toggleColorPicker: false
        }
    },
    methods: {
        updateColor(color) {
            this.pickerColor = color.hex;
            this.$emit('input', color.hex);
        }
    }
}
</script>

<style lang="css">
</style>
