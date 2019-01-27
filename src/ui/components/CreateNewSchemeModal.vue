<template lang="html">
    <transition name="modal">
       <div class="modal-mask">
           <div class="modal-wrapper">
               <div class="modal-container" style="width: 600px;">
                   <div class="modal-header">
                       <h3>New Scheme</h3>
                   </div>
                   <div class="modal-body">
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
                  </div>
                   <div class="modal-footer">
                       <div class="modal-controls">
                           <span class="btn btn-primary" @click="submitNewScheme()">Create</span>
                           <span class="btn btn-secondary" @click="$emit('close')">Close</span>
                       </div>
                   </div>
               </div>
           </div>
        </div>
    </transition>
</template>

<script>
import apiClient from '../apiClient.js';
import axios from 'axios';
import CategorySelector from '../components/CategorySelector.vue';

export default {
    components: {CategorySelector},
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
