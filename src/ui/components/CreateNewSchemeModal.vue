<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="New Scheme" primaryButton="Create" @primary-submit="submitNewScheme()" @close="$emit('close')">
       <h5>Name</h5>
       <input class="textfield" :class="{'missing-field-error' : mandatoryFields.name.highlight}" type="text" v-model="schemeName" placeholder="Name..."/>

       <h5>Description</h5>
       <textarea class="textfield" v-model="schemeDescription"></textarea>

       <h5>Category</h5>
       <category-selector :project-id="projectId" :categories="categories"/>

       <h5>Scheme Image URL</h5>
       <table width="100%">
           <tbody>
                <tr>
                    <td>
                       <input class="textfield" type="text" v-model="imageUrl" placeholder="Image URL"/>
                    </td>
                    <td width="34px">
                        <div class="file-upload-button">
                            <i class="fas fa-file-upload icon"></i>
                            <input type="file" @change="uploadImage"/>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
    </modal>
</template>

<script>
import apiClient from '../apiClient.js';
import axios from 'axios';
import CategorySelector from './CategorySelector.vue';
import Modal from './Modal.vue';

export default {
    components: {CategorySelector, Modal},
    props: {
        projectId: {type: String},
        name: {type: String, default: ''},
        categories: {type: Array, default: []},
        description: {type: String, default: ''}
    },
    data() {
        return {
            schemeName: this.name,
            schemeDescription: this.description,
            imageUrl: '',

            mandatoryFields: {
                name: {
                    highlight: false
                }
            },
            errorMessage: null
        }
    },
    methods: {
        submitNewScheme() {
            const name = this.schemeName.trim();
            if (name) {
                const items = [];
                if (this.imageUrl.trim().length > 0) {
                    items.push({
                        type: "image",
                        area: { x: 0, y: 0, w: 1000, h: 1000 },
                        style: { },
                        url: this.imageUrl.trim(),
                        name: "background-image",
                        description: ""
                    });
                }
                apiClient.ensureCategoryStructure(this.projectId, this.categories).then(category => {
                    let categoryId = null;
                    if (category && category.id) {
                        categoryId = category.id;
                    }
                    return apiClient.createNewScheme(this.projectId, {
                        name: name,
                        categoryId: categoryId,
                        description: this.schemeDescription,
                        tags: [],
                        items
                    });
                }).then(scheme => {
                    this.$emit('scheme-created', scheme);
                });
            } else {
                this.mandatoryFields.name.highlight = true;
                this.errorMessage = 'Scheme name should not be empty';
            }
        },

        uploadImage(event) {
            const file = event.target.files[0];
            if (file) {
                const form = new FormData();
                form.append('image', file, file.name);
                axios.post('/images', form).then(response => {
                    this.imageUrl = response.data.path;
                });
            }
        }

    }
}
</script>

<style lang="css">
</style>
