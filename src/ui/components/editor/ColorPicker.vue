<template lang="html">
    <div class="color-picker">
        <span class="color-picker-toggle-button"
            :style="{'background': pickerColor}"
            @click="toggleColorPicker()"
            ></span>


        <transition name="modal" v-if="showColorPicker">
            <div class="modal-mask modal-mask-transparent">
                <div class="modal-wrapper">
                    <div class="modal-container" style="width: 300px; background: #fff;">
                        <div class="modal-body">
                            <chrome-picker v-model="chromePickerColor" @input="updateColor"></chrome-picker>
                        </div>
                        <div class="modal-body">
                            <span class="btn btn-primary" v-on:click="applyColor()">Ok</span>
                            <span class="btn btn-secondary" v-on:click="cancelColorPicker()">Cancel</span>
                        </div>
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
            showColorPicker: false,
            oldColor: null
        }
    },
    methods: {
        toggleColorPicker() {
            this.oldColor = this.color;
            this.chromePickerColor = {hex: this.color};
            this.showColorPicker = true;
        },
        updateColor(color) {
            this.pickerColor = color.hex;
            this.$emit('input', color.hex);
        },
        applyColor() {
            this.showColorPicker = false;
        },
        cancelColorPicker() {
            this.pickerColor = this.oldColor;
            this.$emit('input', this.oldColor);
            this.showColorPicker = false;
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
