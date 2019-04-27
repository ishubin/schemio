<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="New Scheme" primaryButton="Create" @primary-submit="submitNewScheme()" @close="$emit('close')">
       <h5>Name</h5>
       <input class="textfield" type="text" v-model="schemeName" placeholder="Name..."/>

       <h5>Description</h5>
       <textarea class="textfield" v-model="schemeDescription"></textarea>

       <h5>Category</h5>
       <category-selector :categories="categories"/>

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
        name: {type: String, default: ''},
        categories: {type: Array, default: []},
        description: {type: String, default: ''}
    },
    data() {
        return {
            schemeName: this.name,
            schemeDescription: this.description,
            imageUrl: ''
        }
    },
    methods: {
        submitNewScheme() {
            var name = this.schemeName.trim();
            if (name.length > 0) {
                var items = [];
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
                apiClient.ensureCategoryStructure(this.categories).then(category => {
                    var categoryId = null;
                    if (category && category.id) {
                        categoryId = category.id;
                    }
                    return apiClient.createNewScheme({
                        name: name,
                        categoryId: categoryId,
                        description: this.schemeDescription,
                        tags: [],
                        items
                    });
                }).then(scheme => {
                    this.$emit('scheme-created', scheme);
                });
            }
        },

        uploadImage(event) {
            var file = event.target.files[0];
            if (file) {
                var form = new FormData();
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
