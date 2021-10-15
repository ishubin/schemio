<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Create Art Icon" @close="$emit('close')" primary-button="Create" @primary-submit="submitIcon()">

        <h5>Icon name</h5>
        <input class="textfield" type="text" v-model="iconName" placeholder="Name..."/>

        <p>
            Use small images or even better - SVG icons.
        </p>

        <h5>Image URL</h5>
        <div class="image-control">
            <input type="text" class="textfield" v-model="url" placeholder="Image URL..."/>
            <div class="file-upload-button" v-if="supportsUpload">
                <i class="fas fa-file-upload icon"></i>
                <input type="file" accept="image/*" @change="onFileSelect"/>
            </div>
        </div>

        <div v-if="isUploading" class="msg msg-info">
            <i class="fas fa-spinner fa-spin"></i> Uploading...
        </div>
        <div v-if="errorMessage" class="msg msg-error">{{errorMessage}}</div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import StoreUtils from '../../store/StoreUtils';

export default {
    components: {Modal},

    data() {
        return {
            url: '',
            iconName: '',
            selectedFile: null,
            errorMessage: null,
            isUploading: false,
        };
    },
    methods: {
        submitIcon() {
            this.$store.state.apiClient.createArt({
                name: this.iconName,
                url: this.url
            }).then(art => {
                this.$emit('art-created', art);
            }).catch(err => {
                this.errorMessage = 'Error creating art';
            });
        },
        onFileSelect(event) {
            this.selectedFile = event.target.files[0];
        }
    },
    computed: {
        supportsUpload() {
            return this.$store.state.apiClient && this.$store.state.apiClient.uploadFile;
        }
    },
    watch: {
        selectedFile(file) {
            if (file) {
                if (!this.iconName) {
                    this.iconName = file.name;
                }
                this.isUploading = true;
                this.$store.state.apiClient.uploadFile(file)
                .then(imageUrl => {
                    this.isUploading = false;
                    this.errorMessage = null;
                    this.url = imageUrl;
                }).catch(err => {
                    this.isUploading = false;
                    this.errorMessage = 'Unable to upload a file';
                    if (err.data && err.data.message) {
                        StoreUtils.addErrorSystemMessage(this.$store, err.data.message);
                    }
                });
            }
        }
    }
}
</script>