<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="advanced-color-editor">
        <span v-if="value.type === 'none'" class="none-picker-toggle-button" @click="modal.shown = true">None</span>
        <span v-if="value.type === 'solid'" class="color-picker-toggle-button" :style="{'background': value.color}" @click="modal.shown = true"></span>
        <div v-if="value.type === 'image'" class="image-container" @click="modal.shown = true"><img :src="value.image"/></div>

        <modal title="Color" v-if="modal.shown" @close="modal.shown = false" :width="400" :use-mask="false">
            <select v-model="value.type" @input="emitChange">
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

        </modal>
    </div>
</template>

<script>
import VueColor from 'vue-color';
import Modal from '../Modal.vue';
import apiClient from '../../apiClient';

export default {
    props: ['value', 'projectId'],

    components: {'chrome-picker': VueColor.Chrome, Modal},

    data() {
        const data = {
            colorTypes: ['none', 'solid', 'image'],
            modal: {
                shown: false,
                pickerColor: {hex: this.value.color || '#fff'},

                image: {
                    path: this.value.image || ''
                }
            }
        };

        return data;
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
        }
    }

}
</script>