<template lang="html">
    <div class="color-picker">
        <div class="color-picker-toggle-button">
            <span class="color-picker-toggle-button-background"></span>

            <span class="color-picker-toggle-button-fill"
                :style="{'background': pickerColor, 'opacity': pickerAlpha}"
                @click="toggleColorPicker()"
                ></span>
        </div>


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
    props: {
        color: {type: String},
        alpha: {type: Number, default: 1}
    },

    components: {'chrome-picker': VueColor.Chrome},
    data() {
        return {
            pickerColor: this.color,
            pickerAlpha: this.alpha,
            chromePickerColor: {hex: this.color},
            showColorPicker: false,
            oldColor: null,
            oldAlpha: 1
        }
    },
    methods: {
        toggleColorPicker() {
            this.oldColor = this.color;
            this.oldAlpha = this.oldAlpha;
            this.chromePickerColor = {hex: this.color, a: this.alpha};
            this.showColorPicker = true;
        },
        updateColor(color) {
            this.pickerColor = color.hex;
            this.pickerAlpha = color.a;
            this.$emit('input', color.hex, color.a);
        },
        applyColor() {
            this.showColorPicker = false;
        },
        cancelColorPicker() {
            this.pickerColor = this.oldColor;
            this.$emit('input', this.oldColor, this.oldAlpha);
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
