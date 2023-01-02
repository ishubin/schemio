<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="color-picker" :style="{width: width, height: height}" :title="hint" :class="[`color-picker-uid-${uid}`]">
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
import shortid from 'shortid';
import VueColor from 'vue-color';

export default {
    props: {
        color   : {type: String, default: 'rgba(0,0,0,1.0)'},
        width   : {type: String, default: '100%'},
        height  : {type: String, default: '26px'},
        hollow  : {type: Boolean, default: false},
        disabled: {type: Boolean, default: false},
        hint    : {type: String, default: ''}
    },

    components: {'color-picker': VueColor.Chrome},
    beforeMount() {
        document.body.addEventListener('click', this.onGlobalClick);
    },
    beforeDestroy() {
        document.body.removeEventListener('click', this.onGlobalClick);
    },
    data() {
        return {
            uid: shortid.generate(),
            pickerColor: this.color,
            vuePickerColor: {hex: this.color},
            showColorPicker: false,
            tooltip: {
                shown: false,
                x: 0,
                y: 0
            },
            oldColor: null,
            oldAlpha: 1
        }
    },
    methods: {
        toggleColorPicker() {
            if (this.disabled) {
                return;
            }

            if (this.tooltip.shown) {
                this.tooltip.shown = false;
                return;
            }

            this.oldColor = this.color;
            this.vuePickerColor = {hex: this.color};
            this.tooltip.shown = true;
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


            let x = 0;
            let y = 0;
            if (buttonRect.left < windowWidth / 2) {
                x = buttonRect.right;
            } else {
                x = buttonRect.left - tooltipRect.width;
            }

            if (buttonRect.top < windowHeight / 2) {
                y = buttonRect.top;
            } else {
                y = buttonRect.bottom - tooltipRect.height;
            }

            if (x + tooltipRect.width > window.innerWidth) {
                x -= x + tooltipRect.width - window.innerWidth
            }
            x = Math.max(0, x);

            if (y + tooltipRect.height > window.innerHeight) {
                y -= y + tooltipRect.height - window.innerHeight
            }
            y = Math.max(60, y);


            this.tooltip.x = x;
            this.tooltip.y = y;
        },
        onGlobalClick(event) {
            if (!event.target || !event.target.closest(`.color-picker-uid-${this.uid}`)) {
                this.tooltip.shown = false;
            }
        },
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
