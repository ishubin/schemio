<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Create Image" @close="$emit('close')" :primary-button="primaryButton" @primary-submit="submitCreateImage()">
        <h5>Image URL</h5>
        <table width="100%">
            <tbody>
                <tr>
                    <td>
                        <input type="text" class="textfield" v-model="url"/>
                    </td>
                    <td width="34px">
                        <div class="file-upload-button">
                            <i class="fas fa-file-upload icon"></i>
                            <input type="file" accept="image/*" @change="onFileSelect"/>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="msg msg-info" v-if="isUploading">
            <i class="fas fa-spinner fa-spin"></i> Uploading...
        </div>
        <div class="msg msg-error" v-if="errorUploading">
            Could not upload image.
        </div>
        <div class="image-preview">
            <img :src="url"  v-if="url.length > 0"/>
        </div>
    </modal>

</template>

<script>
import Modal from '../Modal.vue';
import apiClient from '../../apiClient.js';

export default {
    props: {
        projectId: { type: String },
        imageUrl: { type: String, default: '' },
        primaryButton: { type: String, default: 'Create' }
    },
    components: {Modal},

    data() {
        return {
            url: this.imageUrl,
            selectedFile: null,
            errorUploading: false,
            isUploading: false,
        }
    },
    methods: {
        submitCreateImage() {
            this.$emit('submit-image', this.url);
        },
        onFileSelect(event) {
            this.selectedFile = event.target.files[0];
        }
    },
    watch: {
        selectedFile(file) {
            if (file) {
                this.isUploading = true;
                this.errorUploading = false;

                apiClient.uploadFile(this.projectId, file)
                .then(imageUrl => {
                    this.isUploading = false;
                    this.url = imageUrl;
                }).catch(err => {
                    this.isUploading = false;
                    this.errorUploading = true;
                });
            }
        }
    }
}
</script>

<style lang="css">
</style>
