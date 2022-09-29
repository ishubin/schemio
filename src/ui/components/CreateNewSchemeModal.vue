<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="New Diagram" primaryButton="Create" @primary-submit="submitNewScheme()" @close="$emit('close')">
        <h5>Name</h5>
        <input ref="schemeNameInput" class="textfield" :class="{'missing-field-error' : mandatoryFields.name.highlight}"
            type="text"
            v-model="schemeName"
            placeholder="Name..."
            v-on:keyup.enter="submitNewScheme()"
            />

        <h5>Description</h5>
        <rich-text-editor :value="schemeDescription" @changed="schemeDescription = arguments[0]" ></rich-text-editor>

        <div v-if="apiClient && apiClient.uploadFile">
            <h5>Diagram Image URL</h5>

            <div class="image-control">
                <input class="textfield" type="text" v-model="imageUrl" placeholder="Image URL..."/>
                <div class="file-upload-button" v-if="uploadEnabled">
                    <i class="fas fa-file-upload icon"></i>
                    <input type="file" accept="image/*" @change="uploadImage"/>
                </div>
            </div>

        </div>

        <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

        <modal title="Loading" v-if="showLoading" :width="300" @close="showLoading = false">
            <i class="fas fa-spinner fa-spin fa-1x"></i>
            Loading...
        </modal>
    </modal>
</template>

<script>
import RichTextEditor from './RichTextEditor.vue';
import Modal from './Modal.vue';
import {enrichItemWithDefaults} from '../scheme/ItemFixer';
import StoreUtils from '../store/StoreUtils.js';

export default {
    components: {Modal, RichTextEditor},
    props: {
        name         : {type: String, default: ''},
        description  : {type: String, default: ''},
        apiClient    : {type: Object, default: () => null},
        uploadEnabled: {type: Boolean, default: true}
    },

    mounted() {
        this.$refs.schemeNameInput.focus();
    },

    data() {
        return {
            schemeName: this.name,
            schemeDescription: this.description,
            imageUrl: '',

            showLoading: false,

            mandatoryFields: {
                name: {
                    highlight: false
                }
            },

            errorMessage: null,
        }
    },

    methods: {
        submitNewScheme() {
            const name = this.schemeName.trim();
            if (name) {
                const items = [];
                const imageUrl = this.imageUrl.trim();
                if (imageUrl.length > 0) {
                    const imageItem = {
                        shape: 'rect',
                        area: { x: 0, y: 0, w: 1000, h: 1000 },
                        shapeProps: {
                            fill: {
                                type: 'image',
                                image: imageUrl
                            }
                        },
                        name: 'background-image',
                        description: '',
                        behavior: {
                            events: []
                        }
                    };
                    enrichItemWithDefaults(imageItem)
                    items.push(imageItem);
                }

                this.$emit('scheme-submitted', {
                    name: name,
                    description: this.schemeDescription,
                    tags: [],
                    items
                });

            } else {
                this.mandatoryFields.name.highlight = true;
                this.errorMessage = 'Diagram name should not be empty';
            }
        },

        uploadImage(event) {
            if (this.apiClient && this.apiClient.uploadFile) {
                const file = event.target.files[0];
                if (file) {
                    const form = new FormData();
                    form.append('image', file, file.name);
                    this.apiClient.uploadFile(file)
                    .then(imageUrl => {
                        this.imageUrl = imageUrl;
                    }).catch(err => {
                        if (err.data && err.data.message) {
                            StoreUtils.addErrorSystemMessage(this.$store, err.data.message);
                        }
                    });
                }
            }
        }

    }
}
</script>

<style lang="css">
</style>
