<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="advanced-color-editor" :style="{width: width, height: height}" :class="{disabled: disabled}">
        <span v-if="!color.type || color.type === 'none'" class="none-picker-toggle-button" @click="showModal()"></span>
        <span v-if="color.type === 'solid'" class="color-picker-toggle-button" :style="{'background': color.color}" @click="showModal()"></span>
        <div v-if="color.type === 'image'" class="image-container" @click="showModal()"><img :src="color.image"/></div>
        <div v-if="color.type === 'gradient'" class="gradient-container" @click="showModal()" :style="{'background': gradientPreview}"></div>

        <Modal class="advanced-color-editor-modal" title="Color" v-if="modal.shown" @close="closeModal" :width="400" :use-mask="false">
            <ul class="tabs">
                <li v-for="colorType in colorTypes">
                    <span class="tab"
                        :class="{active: color.type === colorType}"
                        @click="selectColorType(colorType)"
                        >
                        {{colorType}}
                    </span>
                </li>
            </ul>

            <div class="tabs-body" style="min-height: 320px">
                <div v-if="color.type === 'none'">
                    <p>
                        This setting disables the fill
                    </p>
                </div>
                <div v-if="color.type === 'solid'">
                    <ColorPicker v-model="modal.pickerColor" @input="updateSolidColor" :palette="[]" :pressets="[]"/>
                </div>

                <div v-if="color.type === 'image'">
                    <div class="image-control">
                        <input class="textfield" :value="modal.image.path" @keydown.enter="onImagePathChange" @blur="onImagePathChange" placeholder="Image URL..."/>
                        <div class="file-upload-button" v-if="isUploadEnabled">
                            <i class="fas fa-file-upload icon"></i>
                            <input type="file" accept="image/*" @change="onImageUpload"/>
                        </div>
                    </div>

                    <div class="ctrl-group">
                        <input type="checkbox" :checked="color.stretch || false" @input="onImageStretchChange" :id="`image-stretch-${id}`"/><label :for="`image-stretch-${id}`"> Stretch</label>
                    </div>

                    <div class="msg msg-info" v-if="isUploading">
                        <i class="fas fa-spinner fa-spin"></i> Uploading...
                    </div>
                    <div class="msg msg-error" v-if="uploadErrorMessage">{{uploadErrorMessage}}</div>


                    <img v-if="color.type === 'image' && color.image" :src="color.image" style="max-width: 360px; max-height: 360px"/>
                </div>

                <div v-if="color.type === 'gradient'">
                    <div ref="gradientSliderContainer" class="gradient-slider-container text-nonselectable">
                        <div class="gradient-container large" :style="{'background': gradientPreview}" @dblclick="onGradientContainerDblClick"></div>
                        <div class="gradient-slider" v-for="(slider, sliderIdx) in color.gradient.colors" :style="{'left': `${slider.p}%`}">
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
                            <select v-model="color.gradient.type" @change="onGradientTypeChange">
                                <option value="linear">Linear</option>
                                <option value="radial">Radial</option>
                            </select>
                        </div>
                        <div v-if="color.gradient.type === 'linear'" class="ctrl-group">
                            <div class="ctrl-label">Direction</div>
                            <NumberTextfield :value="color.gradient.direction" @changed="updateRotation"/>

                            <div class="gradient-rotation-knob-container">
                                <div class="gradient-rotation-knob" @mousedown="onGradientRotationKnobMouseDown">
                                    <svg ref="gradientRotationKnob" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                        <g :transform="`translate(12 12) rotate(${color.gradient.direction})`">
                                            <circle class="hollow" cx="0" cy="0" r="9" fill="rgba(0,0,0,0)"/>
                                            <circle class="full" cx="0" cy="-9" r="2" stroke="none"/>
                                            <circle class="center" cx="0" cy="0" r="0.5" stroke="none"/>
                                            <line x1="0" y1="0" x2="0" y2="-9"/>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div class="ctrl-group">
                            <span class="btn btn-secondary" @click="invertGradient">Invert</span>
                        </div>
                    </div>
                    <div class="gradient-color-picker">
                        <ColorPicker :key="`gradient-${id}-${gradient.selectedSliderIdx}-${revision}`" :value="gradient.selectedColor" @input="updateGradientSliderColor"/>
                    </div>
                </div>
            </div>
        </Modal>
    </div>
</template>

<script>
import shortid from 'shortid';
import VueColor from 'vue-color';
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import {parseColor, encodeColor} from '../../colors';
import utils from '../../utils';
import StoreUtils from '../../store/StoreUtils';
import myMath from '../../myMath';
import { getPageCoordsFromEvent } from '../../dragndrop';
import EditorEventBus from './EditorEventBus';


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
    props: {
        editorId : {type: String, required: true},
        value    : {type: Object, required: true},
        width    : {type: String, default: '100%'},
        height   : {type: String, default: '26px'},
        disabled : {type: Boolean, default : false},
    },

    components: {'ColorPicker': VueColor.Chrome, Modal, NumberTextfield},

    beforeMount() {
        this.updateCurrentColor(this.value);
    },
    mounted() {
        document.body.addEventListener('mousemove', this.onMouseMove);
        document.body.addEventListener('mouseup', this.onMouseUp);
    },
    beforeDestroy() {
        document.body.removeEventListener('mousemove', this.onMouseMove);
        document.body.addEventListener('mouseup', this.onMouseUp);
        EditorEventBus.colorControlToggled.$emit(this.editorId, false);
    },

    data() {
        return {
            id: shortid.generate(),

            // used in a key construction for triggering re-mounting of color picker
            revision: 0,
            colorTypes: ['none', 'solid', 'image', 'gradient'],
            color: utils.clone(this.value),
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
            },
            gradientPreview: '',

            isUploading: false,
            uploadErrorMessage: null,

        };
    },

    watch: {
        value(color) {
            this.updateCurrentColor(color);
        }
    },

    methods: {
        closeModal() {
            this.modal.shown = false;
            EditorEventBus.colorControlToggled.$emit(this.editorId, false);
        },
        updateRotation(rotation) {
            this.color.gradient.direction = rotation;
            this.$forceUpdate();
            this.emitChange();
        },
        onGradientRotationKnobMouseDown(originalEvent) {
            let mouseMoveEventName = originalEvent.touches ? 'touchmove' : 'mousemove';
            let mouseUpEventName = originalEvent.touches ? 'touchend' : 'mouseup';

            const onMouseMove = (event) => {
                if (event.buttons === 0) {
                    reset(event);
                    return;
                }
                const rect = this.$refs.gradientRotationKnob.getBoundingClientRect();
                const coords = getPageCoordsFromEvent(event);
                const x = coords.pageX - rect.left - rect.width/2;
                const y = coords.pageY - rect.top - rect.height/2;
                if (Math.abs(x) + Math.abs(y) < 1) {
                    return;
                }

                this.color.gradient.direction = Math.round(myMath.fullAngleForVector(x, y) * 180 / Math.PI) + 90;
                this.$forceUpdate();
                this.emitChange();
            };
            const onMouseUp = (event) => {
                reset();
                onMouseMove(event);
            };

            const reset = () => {
                document.removeEventListener(mouseMoveEventName, onMouseMove);
                document.removeEventListener(mouseUpEventName, onMouseUp);
            };
            document.addEventListener(mouseMoveEventName, onMouseMove);
            document.addEventListener(mouseUpEventName, onMouseUp);

            onMouseMove(originalEvent);
        },

        showModal() {
            if (this.disabled) {
                return;
            }

            this.modal.shown = true;
            EditorEventBus.colorControlToggled.$emit(this.editorId, true);
        },

        updateCurrentColor(color) {
            if (color.type === 'gradient') {
                this.gradient.selectedColor.hex = color.gradient.colors[this.gradient.selectedSliderIdx].c;
                this.gradientPreview = this.computeGradientPreview(color.gradient);
            }
            this.color = utils.clone(color);
            this.modal.pickerColor = {hex: color.color || '#fff'};
            if (this.color.type === 'image') {
                this.modal.image.path = this.color.image;
            }
            this.image = { path: color.image || ''};
        },

        onImageStretchChange(event) {
            this.color.stretch = event.target.checked;
            this.emitChange();
        },

        onGradientTypeChange() {
            this.emitChange();
            this.$forceUpdate();
        },

        emitChange() {
            this.$emit('changed', utils.clone(this.color));
        },
        updateSolidColor(color) {
            this.color.color = `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`;
            this.emitChange();
        },
        selectColorType(colorType) {
            this.color.type = colorType;
            if (colorType === 'image' && !this.color.image) {
                this.color.image = '';
                this.color.stretch = false;
                this.color.imageBox = {x: 0, y: 0, w: 1, h: 1};
            }
            if (colorType === 'solid' && !this.color.color) {
                this.color.color = 'rgba(255,255,255,1.0)';
            }
            if (colorType === 'gradient' && !this.color.gradient) {
                let color1 = 'rgba(0,0,0,1.0)';
                let color2 = 'rgba(255,255,255,1.0)';

                if (this.color.color) {
                    color1 = this.color.color;
                    color2 = this.color.color;
                }
                this.color.gradient = {
                    colors: [{c: color1, p: 0}, {c: color2, p: 100}],
                    type: 'linear',
                    direction: 0.0
                };

                this.gradientPreview = this.computeGradientPreview(this.color.gradient);
            }
            this.emitChange();
        },
        onImagePathChange(event) {
            this.color.image = event.target.value;
            this.emitChange();
        },
        onImageUpload(event) {
            if (!this.$store.state.apiClient || !this.$store.state.apiClient.uploadFile) {
                return;
            }

            const file = event.target.files[0];
            if (file) {
                this.isUploading = true;
                this.uploadErrorMessage = null;

                this.$store.state.apiClient.uploadFile(file)
                .then(imageUrl => {
                    this.isUploading = false;
                    this.color.image = imageUrl;
                    this.modal.image.path = imageUrl;
                    this.emitChange();
                }).catch(err => {
                    this.isUploading = false;
                    this.uploadErrorMessage = 'Failed to upload image';
                    if (err.data && err.data.message) {
                        StoreUtils.addErrorSystemMessage(this.$store, err.data.message);
                    }
                });
            }
        },

        onMouseUp(event) {
            if (this.gradient.isDragging && this.color.type === 'gradient') {
                this.gradient.isDragging = false;
                this.color.gradient.colors.sort((a,b) => a.p - b.p);
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
                this.color.gradient.colors[this.gradient.selectedSliderIdx].p = newPosition;
                this.gradientPreview = this.computeGradientPreview(this.color.gradient);
                this.$forceUpdate();
                this.emitChange();
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

            this.color.gradient.colors.sort((a,b) => a.p - b.p);


            // searching for an instert point
            let insertAt = 0;
            let foundInsertPoint = false;
            for (let i = 0; i < this.color.gradient.colors.length && !foundInsertPoint; i++) {
                let color = this.color.gradient.colors[i];
                if (position > color.p) {
                    insertAt = i + 1;
                } else {
                    insertAt = i;
                    foundInsertPoint = true;
                }
            }

            this.color.gradient.colors.splice(insertAt, 0, {
                c: 'rgba(0,0,0,1.0)',
                p: position
            });

            if (insertAt === 0 && this.color.gradient.colors.length > 1) {
                this.color.gradient.colors[0].c = this.color.gradient.colors[1].c;
            } else if (insertAt === this.color.gradient.colors.length - 1 && this.color.gradient.colors.length > 1) {
                this.color.gradient.colors[insertAt].c = this.color.gradient.colors[insertAt - 1].c;
            } else if (this.color.gradient.colors.length > 2) {
                this.color.gradient.colors[insertAt].c = interpolateGradientColor(this.color.gradient.colors[insertAt], this.color.gradient.colors[insertAt - 1], this.color.gradient.colors[insertAt + 1]);
            }

            this.gradient.selectedSliderIdx = insertAt;
            this.gradient.selectedColor.hex = this.color.gradient.colors[insertAt].c;
            // Updating revision to trigger re-mount of color picker
            this.revision += 1;

            this.gradient.isDragging = false;
            
            this.gradientPreview = this.computeGradientPreview(this.color.gradient);
            this.emitChange();
        },

        onGradientSliderKnobClick(sliderIdx, event) {
            this.gradient.isDragging = true;
            this.gradient.originalClickPoint.x = event.clientX;
            this.gradient.selectedColor.hex = this.color.gradient.colors[sliderIdx].c;
            this.gradient.selectedSliderIdx = sliderIdx;
            this.gradient.originalKnobPosition = this.color.gradient.colors[sliderIdx].p;
        },

        onGradientSliderKnobDblClick(sliderIdx) {
            if (this.color.gradient.colors.length > 2) {
                this.color.gradient.colors.splice(sliderIdx, 1);
                if (sliderIdx > 0) {
                    sliderIdx -= 1;
                }
                this.color.gradient.selectedColor = this.color.gradient.colors[sliderIdx].c;
                this.revision += 1;
                this.gradientPreview = this.computeGradientPreview(this.color.gradient);
                this.emitChange();
            }
        },

        updateGradientSliderColor(color) {
            this.color.gradient.colors[this.gradient.selectedSliderIdx].c = `rgba(${color.rgba.r}, ${color.rgba.g}, ${color.rgba.b}, ${color.rgba.a})`;
            this.gradientPreview = this.computeGradientPreview(this.color.gradient);
            this.emitChange();
        },

        invertGradient() {
            this.color.gradient.colors.reverse();
            for (let i = 0; i < this.color.gradient.colors.length; i++) {
                this.color.gradient.colors[i].p = myMath.clamp(100 - this.color.gradient.colors[i].p, 0, 100);
            }
            this.gradientPreview = this.computeGradientPreview(this.color.gradient);
            this.emitChange();
        },

        computeGradientPreview(gradient) {
            let result = 'linear-gradient(90deg, ';

            let colors = gradient.colors;
            let needsReorder = false;
            for (let i = 0; i < colors.length - 1; i++) {
                if (colors[i].p > colors[i+1].p) {
                    needsReorder = true;
                }
            }

            if (needsReorder) {
                colors = gradient.colors.slice();
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
    },
    computed: {
        isUploadEnabled() {
            return this.$store.state.apiClient && this.$store.state.apiClient.uploadFile;
        }
    }

}
</script>