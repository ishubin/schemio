<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal :title="popupTitle" :primary-button="submitTitle" @primary-submit="submitLink()" @close="$emit('close')">
        <h5>Title</h5>
        <input type="text" class="textfield" v-model="editTitle"/>

        <h5>Type</h5>
        <div class="toggle-group">
            <span v-for="linkType in knownTypes" class="toggle-button"
                :class="{toggled: linkType.name === editType}" @click="editType = linkType.name">
                <i :class="linkType.cssClass"></i> {{linkType.name}}
            </span>
        </div>

        <h5>URL</h5>
        <div v-if="editType === 'doc'" class="row gap centered">
            <input type="text" class="textfield col-1" v-model="editUrl"/>
            <span class="btn btn-secondary" @click="toggleSchemeSearch" title="Search diagrams"><i class="fas fa-search"></i></span>
        </div>
        <div v-else-if="editType === 'file'" class="row gap centered">
            <input type="text" class="textfield col-1" v-model="editUrl"/>
            <div class="file-upload-button" v-if="supportsUpload">
                <i v-if="isUploading" class="fas fa-spinner fa-spin fa-1x"></i>
                <i v-else class="fa-solid fa-file-arrow-up"></i>
                <input type="file" @change="onFileSelect"/>
            </div>
        </div>
        <div v-else>
            <input type="text" class="textfield" v-model="editUrl"/>
        </div>

        <div v-if="errorMessage" class="msg msg-error">
            {{ errorMessage }}
        </div>

        <scheme-search-modal v-if="showSchemeSearchModal" @close="showSchemeSearchModal = false" @selected-scheme="onSchemeSelect"></scheme-search-modal>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import SchemeSearchModal from './SchemeSearchModal.vue';
import linkTypes from './LinkTypes.js';

export default {
    props: ['edit', 'title', 'url', 'type'],
    components : {Modal, SchemeSearchModal},

    data() {
        return {
            popupTitle: this.edit ? 'Edit Link' : 'Create Link',
            submitTitle: this.edit ? 'Update' : 'Create',
            editTitle: this.title,
            editUrl: this.url,
            editType: this.type && this.type.length > 0 ? this.type : 'default',
            knownTypes: linkTypes.knownTypes,
            showSchemeSearchModal: false,
            selectedFile: null,
            errorMessage: null,
            isUploading: false,
        }
    },
    methods: {
        submitLink() {
            this.$emit('submit-link', {
                title: this.editTitle,
                url: this.editUrl,
                type: this.editType
            });
            this.$emit('close');
        },

        toggleSchemeSearch() {
            this.showSchemeSearchModal = true;
        },

        onSchemeSelect(scheme) {
            this.editType = 'doc';
            this.editUrl = scheme.link;

            if (!this.editTitle) {
                this.editTitle = scheme.name;
            }
            this.showSchemeSearchModal = false;
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
                this.isUploading = true;
                this.errorMessage = null;

                this.$store.state.apiClient.uploadFile(file)
                .then(fileUrl => {
                    this.editTitle = file.name;
                    this.isUploading = false;
                    this.errorMessage = null;
                    this.editUrl = fileUrl;
                }).catch(err => {
                    this.isUploading = false;
                    this.errorMessage = 'Something went wrong, could not upload file';
                    if (err.data && err.data.message) {
                        StoreUtils.addErrorSystemMessage(this.$store, err.data.message);
                    }
                });
            }
        }
    }
}
</script>

<style lang="css">
</style>
