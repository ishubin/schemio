<template lang="html">
    <div class="color-picker">
        <span class="color-picker-toggle-button"
            :style="{'background': pickerColor}"
            @click="toggleColorPicker = !toggleColorPicker"
            ></span>


        <transition name="modal" v-if="toggleColorPicker">
            <div class="modal-mask modal-mask-transparent" @click="toggleColorPicker = false">
                <div class="modal-wrapper">
                    <div class="modal-container" style="width: 200px; padding: 0;">
                        <chrome-picker v-model="chromePickerColor" @input="updateColor"></chrome-picker>
                    </div>
                </div>
           </div>
       </transition>
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
    },
    watch: {
        color(newColor) {
            this.pickerColor = newColor;
            this.chromePickerColor.hex = newColor;
            this.$forceUpdate();
        }
    }
}
</script>

<style lang="css">
</style>
