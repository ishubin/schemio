<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="advanced-color-editor">
        <span v-if="value.type === 'none'" class="none-picker-toggle-button" @click="modal.shown = true">None</span>
        <span v-if="value.type === 'solid'" class="color-picker-toggle-button" :style="{'background': value.color}" @click="modal.shown = true"></span>
        <div v-if="value.type === 'image'" class="image-container" @click="modal.shown = true"><img :src="value.image"/></div>
        <div v-if="value.type === 'gradient'" class="gradient-container" @click="modal.shown = true" :style="{'background': gradientBackground}"></div>

        <modal title="Color" v-if="modal.shown" @close="modal.shown = false" :width="400" :use-mask="false">
            <select :value="value.type" @input="selectColorType(arguments[0].target.value)">
                <option v-for="colorType in colorTypes">{{colorType}}</option>
            </select>

            <div v-if="value.type === 'solid'">
                <chrome-picker v-model="modal.pickerColor" @input="updateSolidColor"></chrome-picker>
            </div>

            <div v-if="value.type === 'image'">
                <div class="image-property-container">
                    <input class="textfield" :value="modal.image.path" @input="onImagePathChange"/>
                    <div class="upload-button-container">
                        <div class="upload-button">
                            <i class="fas fa-file-upload icon"></i>
                            <input type="file" @change="onImageUpload"/>
                        </div>
                    </div>
                </div>
                <img v-if="value.type === 'image' && value.image" :src="value.image" style="max-width: 360px; max-height: 360px"/>
            </div>

            <div v-if="value.type === 'gradient'">
                <div ref="gradientSliderContainer" class="gradient-slider-container text-nonselectable">
                    <div class="gradient-container large" :style="{'background': gradientBackground}" @dblclick="onGradientContainerDblClick"></div>
                    <div class="gradient-slider" v-for="(slider, sliderIdx) in value.gradient.colors" :style="{'left': `${slider.p}%`}">
                        <div class="gradient-slider-knob"
                            :style="{'background': slider.c}"
                            :class="{'selected': sliderIdx === gradient.selectedSliderIdx}"
                            @mousedown="onGradientSliderKnobClick(sliderIdx, arguments[0])"
                            @dblclick="onGradientSliderKnobDblClick(sliderIdx)"
                            ></div>
                    </div>
                </div>
                <div class="gradient-controls">
                    <div class="ctrl-group">
                        <div class="ctrl-label">Gradient Type</div>
                        <select v-model="value.gradient.type" @change="emitChange">
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                        </select>
                    </div>
                    <div v-if="value.gradient.type === 'linear'" class="ctrl-group">
                        <div class="ctrl-label">Direction</div>
                        <number-textfield :value="value.gradient.direction" @changed="value.gradient.direction = arguments[0]; emitChange()"/>
                    </div>
                    <div class="ctrl-group">
                        <span class="btn btn-secondary" @click="invertGradient">Invert</span>
                    </div>
                </div>
                <div class="gradient-color-picker">
                    <chrome-picker :key="`gradient-${id}-${gradient.selectedSliderIdx}-${revision}`" :value="gradient.selectedColor" @input="updateGradientSliderColor"></chrome-picker>
                </div>
            </div>

        </modal>
    </div>
</template>

<script>
import shortid from 'shortid';
import VueColor from 'vue-color';
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import apiClient from '../../apiClient';
import {parseColor, encodeColor} from '../../colors';

function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * @returns {String} encoded rgba() color
 */
function interpolateGradientColor(midColor, leftColor, rightColor) {
    let d = rightColor.p - leftColor.p;
    if (Math.abs(d) < 0.001) {
        return leftColor.c;
    }

    let t = Math.max(0.0, Math.min((midColor.p - leftColor.p) / d, 1.0));

    const c1 = parseColor(leftColor.c);
    const c2 = parseColor(rightColor.c);

    const r = Math.max(0, Math.min(Math.round(c1.r * (1.0 - t) + c2.r * t), 255));
    const g = Math.max(0, Math.min(Math.round(c1.g * (1.0 - t) + c2.g * t), 255));
    const b = Math.max(0, Math.min(Math.round(c1.b * (1.0 - t) + c2.b * t), 255));
    const a = Math.max(0, Math.min(Math.round(c1.a * (1.0 - t) + c2.a * t), 1.0));

    return encodeColor({r,g,b,a});
}

export default {
    props: ['value', 'projectId'],

    components: {'chrome-picker': VueColor.Chrome, Modal, NumberTextfield},

    beforeMount() {
        if (this.value.type === 'gradient') {
            this.gradient.selectedColor.hex = this.value.gradient.colors[this.gradient.selectedSliderIdx].c;
        }
    },
    mounted() {
        document.body.addEventListener('mousemove', this.onMouseMove);
        document.body.addEventListener('mouseup', this.onMouseUp);
    },
    beforeDestroy() {
        document.body.removeEventListener('mousemove', this.onMouseMove);
        document.body.addEventListener('mouseup', this.onMouseUp);
    },

    data() {
        return {
            id: shortid.generate(),

            // used in a key construction for triggering re-mounting of color picker
            revision: 0,
            colorTypes: ['none', 'solid', 'image', 'gradient'],
            modal: {
                shown: false,
                pickerColor: {hex: this.value.color || '#fff'},

                image: {
                    path: this.value.image || ''
                }
            },

            gradient: {
                selectedSliderIdx: 0,
                isDragging: false,
                selectedColor: {hex: '#fff'},
                originalClickPoint: {x: 0},
                originalKnobPosition: 0
            }
        };
    },

    methods: {
        emitChange() {
            this.$emit('changed', this.value);
        },
        updateSolidColor(color) {
            this.value.color = `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`;
            this.emitChange();
        },
        selectColorType(colorType) {
            this.value.type = colorType;
            if (colorType === 'image' && !this.value.image) {
                this.value.image = '';
            }
            if (colorType === 'solid' && !this.value.color) {
                this.value.color = 'rgba(255,255,255,.10)';
            }
            if (colorType === 'gradient' && !this.value.gradient) {
                this.value.gradient = {
                    colors: [{c: 'rgba(0,0,0, 1.0)', p: 0}, {c: 'rgba(255,255,255, 1.0)', p: 100}],
                    type: 'linear',
                    direction: 0.0
                };
            }
            this.emitChange();
        },
        onImagePathChange(event) {
            this.value.image = event.target.value;
            this.emitChange();
        },
        onImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                apiClient.uploadFile(this.projectId, file)
                .then(imageUrl => {
                    this.value.image = imageUrl;
                    this.modal.image.path = imageUrl;
                    this.emitChange();
                }).catch(err => {
                    console.error('Could not upload file', err);
                });
            }
        },

        onMouseUp(event) {
            if (this.gradient.isDragging && this.value.type === 'gradient') {
                this.gradient.isDragging = false;
                this.value.gradient.colors.sort((a,b) => a.p - b.p);
            }
        },


        onMouseMove(event) {
            if (this.gradient.isDragging) {
                if (event.buttons === 0) {
                    this.gradient.isDragging = false;
                    return;
                }

                const x = event.clientX;
                const containerRect = this.$refs.gradientSliderContainer.getBoundingClientRect();

                let newPosition = 0;

                if (x < containerRect.left) {
                    newPosition = 0;
                } else if (x > containerRect.right) {
                    newPosition = 100.0;
                } else {
                    // calculation position only with 0.01 precision
                    newPosition = Math.round(10000.0 * (x - containerRect.left) / containerRect.width) / 100.0;
                }
                this.value.gradient.colors[this.gradient.selectedSliderIdx].p = newPosition;
            }
        },

        onGradientContainerDblClick(event) {
            const x = event.clientX;
            const containerRect = this.$refs.gradientSliderContainer.getBoundingClientRect();
            if (x < containerRect.left || x > containerRect.right) {
                return;
            }

            // calculating position with only 0.01 precision
            const position = Math.round(10000 * (x - containerRect.left) / containerRect.width) / 100;

            this.value.gradient.colors.sort((a,b) => a.p - b.p);


            // searching for an instert point
            let insertAt = 0;
            let foundInsertPoint = false;
            for (let i = 0; i < this.value.gradient.colors.length && !foundInsertPoint; i++) {
                let color = this.value.gradient.colors[i];
                if (position > color.p) {
                    insertAt = i + 1;
                } else {
                    insertAt = i;
                    foundInsertPoint = true;
                }
            }

            this.value.gradient.colors.splice(insertAt, 0, {
                c: 'rgba(0,0,0,1.0)',
                p: position
            });

            if (insertAt === 0 && this.value.gradient.colors.length > 1) {
                this.value.gradient.colors[0].c = this.value.gradient.colors[1].c;
            } else if (insertAt === this.value.gradient.colors.length - 1 && this.value.gradient.colors.length > 1) {
                this.value.gradient.colors[insertAt].c = this.value.gradient.colors[insertAt - 1].c;
            } else if (this.value.gradient.colors.length > 2) {
                this.value.gradient.colors[insertAt].c = interpolateGradientColor(this.value.gradient.colors[insertAt], this.value.gradient.colors[insertAt - 1], this.value.gradient.colors[insertAt + 1]);
            }

            this.gradient.selectedSliderIdx = insertAt;
            this.gradient.selectedColor.hex = this.value.gradient.colors[insertAt].c;
            // Updating revision to trigger re-mount of color picker
            this.revision += 1;

            this.gradient.isDragging = false;
        },

        onGradientSliderKnobClick(sliderIdx, event) {
            this.gradient.isDragging = true;
            this.gradient.originalClickPoint.x = event.clientX;
            this.gradient.selectedColor.hex = this.value.gradient.colors[sliderIdx].c;
            this.gradient.selectedSliderIdx = sliderIdx;
            this.gradient.originalKnobPosition = this.value.gradient.colors[sliderIdx].p;
        },

        onGradientSliderKnobDblClick(sliderIdx) {
            if (this.value.gradient.colors.length > 2) {
                this.value.gradient.colors.splice(sliderIdx, 1);
                if (sliderIdx > 0) {
                    sliderIdx -= 1;
                }
                this.value.gradient.selectedColor = this.value.gradient.colors[sliderIdx].c;
                this.revision += 1;
            }
        },

        updateGradientSliderColor(color) {
            this.value.gradient.colors[this.gradient.selectedSliderIdx].c = `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`;
        },

        invertGradient() {
            this.value.gradient.colors.reverse();
            for (let i = 0; i < this.value.gradient.colors.length; i++) {
                this.value.gradient.colors[i].p = clamp(100 - this.value.gradient.colors[i].p, 0, 100);
            }
            this.emitChange();
        }
    },
    computed: {
        gradientBackground() {
            let result = 'linear-gradient(90deg, ';

            let colors = this.value.gradient.colors;
            let needsReorder = false;
            for (let i = 0; i < colors.length - 1; i++) {
                if (colors[i].p > colors[i+1].p) {
                    needsReorder = true;
                }
            }

            if (needsReorder) {
                colors = this.value.gradient.colors.slice();
                colors.sort((a,b) => a.p - b.p);
            }
            

            for (let i = 0; i < colors.length; i++) {
                if (i > 0) {
                    result += ', ';
                }
                result += `${colors[i].c} ${colors[i].p}%`
            }
            result = result + ')';
            return result;
        }
    }

}
</script>