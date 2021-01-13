<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="color-picker" :style="{width: width, height: height}">
        <div ref="toggleButton" class="color-picker-toggle-button" :class="{disabled: disabled}">
            <span class="color-picker-toggle-button-background"></span>

            <span class="color-picker-toggle-button-fill"
                :style="cssStyle"
                @click="toggleColorPicker()"
                ></span>
        </div>

        <div ref="tooltip" class="color-picker-tooltip" v-if="tooltip.shown" :style="{left: tooltip.x+'px', top: tooltip.y+'px'}">
            <color-picker v-model="vuePickerColor" @input="updateColor"/>
        </div>
    </div>
</template>

<script>
import VueColor from 'vue-color';

export default {
    props: {
        color   : {type: String, default: 'rgba(0,0,0,1.0)'},
        width   : {type: String, default: '100%'},
        height  : {type: String, default: '16px'},
        hollow  : {type: Boolean, default: false},
        disabled: {type: Boolean, default: false},
    },

    components: {'color-picker': VueColor.Sketch},
    data() {
        return {
            pickerColor: this.color,
            vuePickerColor: {hex: this.color},
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
            if (this.disabled) {
                return;
            }
            this.oldColor = this.color;
            this.vuePickerColor = {hex: this.color};
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
            const domTooltip = this.$refs.tooltip;
            const domButton = this.$refs.toggleButton;
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
            if (!event.target || !event.target.closest('.color-picker')) {
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
            this.vuePickerColor.hex = newColor;
            this.$forceUpdate();
        }
    },
    computed: {
        cssStyle() {
            if (this.hollow) {
                return {
                    background: 'none',
                    border: `2px solid ${this.pickerColor}`
                };
            }
            return {
                background: this.pickerColor,
                border: `2px solid ${this.pickerColor}`
            };
        }
    }
}
</script>

<style lang="css">
</style>
