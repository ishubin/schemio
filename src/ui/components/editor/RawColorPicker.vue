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
                <div class="toggle-group">
                    <span v-for="knownMode in knownModes" class="toggle-button"
                        :class="[mode === knownMode ? 'toggled' : '']"
                        @click="switchMode(knownMode)"
                        >
                        {{knownMode}}
                    </span>
                </div>
                <div>
                    <template v-if="mode === 'rgb'">
                        <table class="color-sliders">
                            <tbody>
                                <tr>
                                    <td>R</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="r" @changed="onComponentChange('r', $event)" :min="0" :max="255" :slider="true"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td>G</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="g" @changed="onComponentChange('g', $event)" :min="0" :max="255" :slider="true"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td>B</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="b" @changed="onComponentChange('b', $event)" :min="0" :max="255" :slider="true"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td>A</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="alpha" @changed="onComponentChange('a', $event)" :min="0" :max="1" :step="0.01" :slider="true"/>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </template>
                    <template v-else-if="mode === 'hsl'">
                        <table class="color-sliders">
                            <tbody>
                                <tr>
                                    <td>H</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="hue" @changed="onComponentChange('h', $event)" :min="0" :max="360" :slider="true"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td>S(%)</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="saturation*100" @changed="onComponentChange('s', $event)" :min="0" :max="100" :step="0.1" :slider="true"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td>L(%)</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="lightness*100" @changed="onComponentChange('l', $event)" :min="0" :max="100" :step="0.1" :slider="true"/>
                                    </td>
                                </tr>
                                <tr>
                                    <td>A</td>
                                    <td>
                                        <NumberTextfield class="col-1" :value="alpha" @changed="onComponentChange('a', $event)" :min="0" :max="1" :step="0.01" :slider="true"/>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </template>
                    <input v-else ref="colorText" type="text" class="rcp-input" @input="onTextInput"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { encodeColor, hsl2rgb, parseColor, rgb2hsl } from '../../colors';
import { getPageCoordsFromEvent } from '../../dragndrop';
import myMath from '../../myMath';
import NumberTextfield from '../NumberTextfield.vue';

export default {
    props: {
        color: {type: String, required: true}
    },

    components: {NumberTextfield},

    emits: [
        'color-changed'
    ],

    mounted() {
        this.updateKnobs();
        this.updateColorTextfield();
    },

    data() {
        const color = parseColor(this.color);
        const hsl = rgb2hsl(color.r, color.g, color.b);
        return {
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
            r: color.r,
            g: color.g,
            b: color.b,
            mode: 'hex',
            knownModes: ['hex', 'rgb', 'hsl']
        };
    },

    methods: {
        updateColorTextfield() {
            // it is frustrating that I have to do this but for some reason the value binding to input field
            // did not work well. When user is typing a text to the <input/> tag - it keeps reseting the text back
            // So I had to find a workaround and to not have value binding on that tag. But we do need to update the text
            // when user is dragging sliders.
            if (!this.$refs.colorText) {
                return;
            }
            this.$refs.colorText.value = this.encodedColor;
        },

        onComponentChange(component, value) {
            if (component === 'r') {
                this.updateRGBAColor(value, this.g, this.b, this.alpha);
            } else if (component === 'g') {
                this.updateRGBAColor(this.r, value, this.b, this.alpha);
            } else if (component === 'b') {
                this.updateRGBAColor(this.r, this.g, value, this.alpha);
            } else if (component === 'a') {
                this.updateRGBAColor(this.r, this.g, this.b, value);
            } else if (component === 'h') {
                this.hue = value;
                this.changeColor();
            } else if (component === 's') {
                this.saturation = value / 100;
                this.changeColor();
            } else if (component === 'l') {
                this.lightness = value / 100;
                this.changeColor();
            }
            this.updateKnobs();
        },

        updateRGBAColor(r, g, b, a) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
            this.encodedColor = encodeColor({r,g,b,a});
            this.knobColor = `rgb(${r}, ${g}, ${b})`;

            const hsl = rgb2hsl(r, g, b);
            this.hue = hsl.h;
            this.saturation = hsl.s;
            this.lightness = hsl.l;
            this.updateColorTextfield();
            this.$emit('color-changed', this.encodedColor);
        },

        switchMode(mode) {
            this.mode = mode;
            this.$forceUpdate();
            this.$nextTick(() => {
                this.updateColorTextfield();
            });
        },

        onTextInput(event) {
            const color = parseColor(event.target.value);
            const hsl = rgb2hsl(color.r, color.g, color.b);
            this.hue = hsl.h;
            this.saturation = hsl.s;
            this.lightness = hsl.l;
            this.alpha = color.a;
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            this.a = color.a;
            this.encodedColor = encodeColor(color);
            this.knobColor = `rgb(${color.r}, ${color.g}, ${color.b})`,
            this.$emit('color-changed', this.encodedColor);
            this.updateKnobs();
        },

        setKnobPosition(knobName, rootRect, x, y) {
            if (knobName === 'canvas') {
                this.knobX = rootRect.width * x - 4;
                this.knobY = rootRect.height * y - 4;
                this.saturation = Math.floor(x*100) / 100;
                const h = (1 - x) + 0.5 * x;
                this.lightness = Math.floor(h * (1 - y) * 100) / 100;
            } else if (knobName === 'hue') {
                this.hueKnobPos = rootRect.width * x - 2;
                this.hue = Math.floor(360 * x);
            } else if (knobName === 'alpha') {
                this.alphaKnobPos = rootRect.width * x - 2;
                this.alpha = Math.floor(x*100)/100;
            }
            this.changeColor();
            this.$forceUpdate();
        },

        changeColor() {
            const color = hsl2rgb(this.hue, this.saturation, this.lightness, this.alpha);
            color.a = this.alpha;
            this.encodedColor = encodeColor(color);
            this.knobColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            this.a = color.a;
            this.updateColorTextfield();
            this.$emit('color-changed', this.encodedColor);
        },

        updateKnobs() {
            const canvasRect = this.$refs.canvas.getBoundingClientRect();
            const hueRect = this.$refs.hueSlider.getBoundingClientRect();
            const alphaRect = this.$refs.alphaSlider.getBoundingClientRect();
            this.knobX = canvasRect.width * this.saturation - 4;
            const h = Math.min(Math.max(0, 1 - this.saturation), 1) + 0.5 * this.saturation;
            this.knobY = canvasRect.height * Math.min(Math.max(0, h - this.lightness), 1) / h - 4;
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
    },
}
</script>