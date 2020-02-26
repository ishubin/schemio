<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="color-picker" :id="id">
        <div class="color-picker-toggle-button">
            <span class="color-picker-toggle-button-background"></span>

            <span class="color-picker-toggle-button-fill"
                :style="{'background': pickerColor}"
                @click="toggleColorPicker()"
                ></span>
        </div>

        <div class="color-picker-tooltip" v-if="tooltip.shown" :style="{left: tooltip.x+'px', top: tooltip.y+'px'}">
            <chrome-picker v-model="chromePickerColor" @input="updateColor"></chrome-picker>
        </div>
    </div>
</template>

<script>
import VueColor from 'vue-color';
import shortid from 'shortid';

export default {
    props: {
        color: {type: String}
    },

    components: {'chrome-picker': VueColor.Chrome},
    data() {
        return {
            id: `color-picker-${shortid.generate()}`,
            pickerColor: this.color,
            chromePickerColor: {hex: this.color},
            showColorPicker: false,
            tooltip: {
                shown: false,
                x: 0,
                y: 0
            },
            clickAwayRegistered: false,
            oldColor: null,
            oldAlpha: 1
        }
    },
    methods: {
        toggleColorPicker() {
            this.oldColor = this.color;
            this.chromePickerColor = {hex: this.color};
            this.tooltip.shown = true;
            this.registerClickAwayHandler();
            this.$nextTick(() => {
                this.readjustTooltipPosition();
            });
        },
        updateColor(color) {
            this.pickerColor = color.hex;
            this.$emit('input', `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`);
        },
        readjustTooltipPosition() {
            const domTooltip = document.querySelector(`#${this.id} .color-picker-tooltip`);
            const domButton = document.querySelector(`#${this.id} .color-picker-toggle-button`);
            if (!domTooltip || !domButton) {
                return;
            }

            const tooltipRect = domTooltip.getBoundingClientRect();
            const buttonRect = domButton.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            if (buttonRect.left < windowWidth / 2) {
                this.tooltip.x = buttonRect.right;
            } else {
                this.tooltip.x = buttonRect.left - tooltipRect.width;
            }
            
            if (buttonRect.top < windowHeight / 2) {
                this.tooltip.y = buttonRect.top;
            } else {
                this.tooltip.y = buttonRect.bottom - tooltipRect.height;
            }
        },
        registerClickAwayHandler() {
            if (!this.clickAwayRegistered) {
                document.body.addEventListener('click', this.onGlobalClick);
                this.clickAwayRegistered = true;
            }
        },
        onGlobalClick(event) {
            if (!event.target || !event.target.closest(`#${this.id}`)) {
                this.closeTooltip();
            }
        },
        closeTooltip() {
            this.tooltip.shown = false;
            if (this.clickAwayRegistered) {
                document.body.removeEventListener('click', this.onGlobalClick);
                this.clickAwayRegistered = false;
            }
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
