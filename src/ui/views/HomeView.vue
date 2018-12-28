<template lang="html">
    <div class="content-wrapper">
        <h1>Schemio</h1>
        <ul class="category-breadcrumb" v-if="category">
            <li>
                <a href="/">Home</a>
                <i class="fas fa-angle-right"></i>
            </li>
            <li v-for="parentCategory in category.ancestors">
                <a :href="'?category='+parentCategory.id">{{parentCategory.name}}</a>
                <i class="fas fa-angle-right"></i>
            </li>
            <li>
                <a :href="'?category='+category.id">{{category.name}}</a>
            </li>
        </ul>
        <span class="btn" @click="openNewSchemePopup"><i class="far fa-file-alt"></i> New Scheme</span>
        Categories
        <ul v-if="category">
            <li v-for="childCategory in category.childCategories">
                <a :href="'?category='+childCategory.id">{{childCategory.name}}</a>
            </li>
        </ul>

        Schemes
        <ul>
            <li v-for="scheme in schemes">
                <a :href="'/schemes/'+scheme.id">{{scheme.name}}</a>
                <div class="scheme-desciption">
                    {{scheme.description | shortDescription}}
                </div>
            </li>
        </ul>

        <transition name="modal" v-if="newSchemePopup.show">
           <div class="modal-mask">
               <div class="modal-wrapper">
                   <div class="modal-container" style="width: 600px;">
                       <div class="modal-header">
                           <h3>New Scheme</h3>
                       </div>
                       <div class="modal-body">
                           <h5>Category</h5>
                           <category-selector :categories="newSchemePopup.categories"/>

                           <h5>Name</h5>
                           <input class="textfield" type="text" v-model="newSchemePopup.name" placeholder="Name..."/>

                           <h5>Description</h5>
                           <textarea class="textfield" v-model="newSchemePopup.description"></textarea>

                           <h5>Scheme Image URL</h5>
                           <table width="100%">
                               <tbody>
                                    <tr>
                                        <td>
                                           <input class="textfield" type="text" v-model="newSchemePopup.imageUrl" placeholder="Image URL"/>
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
                               <span class="btn btn-secondary" @click="newSchemePopup.show = false">Close</span>
                           </div>
                       </div>
                   </div>
               </div>
            </div>
        </transition>
    </div>
</template>

<script>
import apiClient from '../apiClient.js';
import CategorySelector from '../components/CategorySelector.vue';
import _ from 'lodash';

export default {
    components: {CategorySelector},
    mounted() {
        this.loadCategories();
        this.loadSchemes();
    },
    data() {
        return {
            newSchemePopup: {
                title: '',
                description: '',
                imageUrl: '',
                categories: [],
                show: false
            },
            categoryId: this.$route.query.category,
            category: [],
            schemes: []
        }
    },
    methods: {
        loadCategories() {
            apiClient.getCategory(this.categoryId).then(category => {
                this.category = category;
            });
        },

        loadSchemes() {
            apiClient.getSchemesInCategory(this.categoryId).then(result => {
                this.schemes = result.results;
            });
        },

        openNewSchemePopup() {
            this.newSchemePopup.name = '';
            this.newSchemePopup.description = '';
            this.newSchemePopup.show = true;
            if (this.category && this.category.id) {
                var categories = _.map(this.category.ancestors, ancestor => {
                    return {name: ancestor.name, id: ancestor.id};
                });

                categories.push({
                    name: this.category.name,
                    id: this.category.id
                });
                this.newSchemePopup.categories = categories;
            } else {
                this.newSchemePopup.categories = [];
            }
        },

        submitNewScheme() {
            var name = this.newSchemePopup.name.trim();
            if (name.length > 0) {
                var items = [];
                if (this.newSchemePopup.imageUrl.trim().length > 0) {
                    items.push({
                        type: "image",
                        area: { x: 0, y: 0, w: 1000, h: 1000 },
                        style: { },
                        url: this.newSchemePopup.imageUrl.trim(),
                        name: "background-image",
                        description: ""
                    });
                }
                apiClient.ensureCategoryStructure(this.newSchemePopup.categories).then(category => {
                    var categoryId = null;
                    if (category && category.id) {
                        categoryId = category.id;
                    }
                    return apiClient.createNewScheme({
                        name: name,
                        categoryId: categoryId,
                        description: this.newSchemePopup.description,
                        tags: [],
                        items
                    });
                }).then(scheme => {
                    window.location.href = `/schemes/${scheme.id}`;
                });
            }
        },

        uploadImage(event) {
            var file = event.target.files[0];
            if (file) {
                var form = new FormData();
                form.append('image', file, file.name);
                axios.post('/api/images', form).then(response => {
                    this.newSchemePopup.imageUrl = response.data.path;
                });
            }
        }
    },
    filters: {
        shortDescription(text) {
            if (text.length > 200) {
                return text.substr(0, 200) + '...';
            } else {
                return text;
            }
        }
    }
}
</script>

<style lang="css">
</style>
