<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="raw-color-picker">
        <div ref="canvas" class="rcp-canvas" :style="{background: `hsl(${hue}, 100%, 50%)`}" @mousedown="onSliderMouseDown('canvas', $event)">
            <div class="rcp-lightness-overlay"></div>
            <div class="rcp-shadow-overlay"></div>
            <div class="rcp-canvas-knob rcp-knob" :style="{background: knobColor, top: `${knobY}px`, left: `${knobX}px`}"></div>
        </div>
        <div class="rcp-controls">
            <div class="rcp-main-row">
                <div class="rcp-preview">
                    <div class="rcp-preview-color" :style="{background: encodedColor}">
                    </div>
                </div>
                <div class="rcp-sliders">
                    <div ref="hueSlider" class="rcp-slider rcp-hue-slider" @mousedown="onSliderMouseDown('hue', $event)">
                        <div class="rcp-slider-knob rcp-knob" :style="{left: `${hueKnobPos}px`}"></div>
                    </div>
                    <div class="rcp-sliders-gap"></div>
                    <div ref="alphaSlider" class="rcp-slider rcp-alpha-slider" @mousedown="onSliderMouseDown('alpha', $event)">
                        <div class="rcp-slider-checkerboard"></div>
                        <div class="rcp-slider-alpha-overlay" :style="{background: `linear-gradient(to right, hsla(${hue}, 100%, 50%, 0) 0%, hsla(${hue}, 100%, 50%, 1) 100%)`}"></div>
                        <div class="rcp-slider-knob rcp-knob" :style="{left: `${alphaKnobPos}px`}"></div>
                    </div>
                </div>
            </div>
            <div class="rcp-text-controls">
                <input type="text" class="rcp-input" :value="encodedColor"/>
            </div>
        </div>
    </div>
</template>

<script>
import { encodeColor, hsl2rgb, parseColor, rgb2hsl } from '../../colors';
import { getPageCoordsFromEvent } from '../../dragndrop';
import myMath from '../../myMath';

export default {
    props: {
        value: {type: String, required: true}
    },

    emits: [
        'color-changed'
    ],

    mounted() {
        this.updateKnobs();
    },

    data() {
        const color = parseColor(this.value);
        const hsl = rgb2hsl(color.r, color.g, color.b);
        return {
            color,
            encodedColor: encodeColor(color),
            knobColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
            hue: hsl.h,
            saturation: hsl.s,
            lightness: hsl.l,
            alpha: color.a,
            knobX: -4,
            knobY: -4,
            hueKnobPos: 0,
            alphaKnobPos: 0,
        };
    },

    methods: {
        setKnobPosition(knobName, rootRect, x, y) {
            if (knobName === 'canvas') {
                this.knobX = rootRect.width * x - 4;
                this.knobY = rootRect.height * y - 4;
                this.saturation = x;
                const h = (1 - x) + 0.5 * x;
                this.lightness = h * (1 - y);
            } else if (knobName === 'hue') {
                this.hueKnobPos = rootRect.width * x - 2;
                this.hue = 360 * x;
            } else if (knobName === 'alpha') {
                this.alphaKnobPos = rootRect.width * x - 2;
                this.alpha = x;
            }
            this.changeColor();
        },

        changeColor() {
            const color = hsl2rgb(this.hue, this.saturation, this.lightness, this.alpha);
            color.a = this.alpha;
            this.encodedColor = encodeColor(color);
            this.knobColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.$emit('color-changed', this.encodedColor);
        },

        updateKnobs() {
            const canvasRect = this.$refs.canvas.getBoundingClientRect();
            const hueRect = this.$refs.hueSlider.getBoundingClientRect();
            const alphaRect = this.$refs.alphaSlider.getBoundingClientRect();
            this.knobX = canvasRect.width * this.saturation - 4;
            const h = (1 - this.saturation) + 0.5 * this.saturation;
            this.knobY = canvasRect.height * (h - this.lightness) / h - 4;
            this.hueKnobPos = hueRect.width * this.hue / 360 - 2;
            this.alphaKnobPos = alphaRect.width * this.alpha - 2;
        },

        onSliderMouseDown(knobName, originalEvent) {
            originalEvent.preventDefault();
            originalEvent.stopPropagation();
            let rootElement;
            if (knobName === 'canvas') {
                rootElement = this.$refs.canvas;
            } else if (knobName === 'hue') {
                rootElement = this.$refs.hueSlider;
            } else if (knobName === 'alpha') {
                rootElement = this.$refs.alphaSlider;
            }
            if (!rootElement) {
                return;
            }
            let mouseMoveEventName = originalEvent.touches ? 'touchmove' : 'mousemove';
            let mouseUpEventName = originalEvent.touches ? 'touchend' : 'mouseup';

            const originalCoords = getPageCoordsFromEvent(originalEvent);
            const rootRect = rootElement.getBoundingClientRect();
            const clickX = myMath.clamp((originalCoords.pageX - rootRect.x) / rootRect.width, 0, 1);
            const clickY = myMath.clamp((originalCoords.pageY - rootRect.y) / rootRect.height, 0, 1);

            this.setKnobPosition(knobName, rootRect, clickX, clickY);

            const reset = () => {
                document.removeEventListener(mouseMoveEventName, onMouseMove);
                document.removeEventListener(mouseUpEventName, onMouseUp);
            };

            const onMouseMove = (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.buttons === 0) {
                    reset(event);
                    return;
                }
                const coords = getPageCoordsFromEvent(event);
                const mx = myMath.clamp((coords.pageX - rootRect.x) / rootRect.width, 0, 1);
                const my = myMath.clamp((coords.pageY - rootRect.y) / rootRect.height, 0, 1);
                this.setKnobPosition(knobName, rootRect, mx, my);
            };
            const onMouseUp = (event) => {
                event.preventDefault();
                event.stopPropagation();
                reset();
            };

            document.addEventListener(mouseMoveEventName, onMouseMove);
            document.addEventListener(mouseUpEventName, onMouseUp);
        },
    }
}
</script>