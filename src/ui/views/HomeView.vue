<template lang="html">
    <div class="content-wrapper">
        <h1>Schemio</h1>
        <span class="btn" @click="openNewSchemePopup"><i class="far fa-file-alt"></i> New Scheme</span>


        <div v-if="searchResult">
            <paginate
                v-model="currentPage"
                :page-count="totalPages"
                :page-range="3"
                :margin-pages="2"
                :click-handler="selectSearchPage"
                :prev-text="'<'"
                :next-text="'>'"
                :container-class="'pagination'"
                :page-class="'page-item'">
            </paginate>
            <div v-for="scheme in searchResult.results">
                <a :href="'/schemes/' + scheme.id">{{scheme.name}}</a>
                <span class="tag" v-for="tag in scheme.tags">{{tag}}</span>
            </div>
        </div>

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
import Paginate from 'vuejs-paginate';

export default {
    components: {Paginate, CategorySelector},
    mounted() {
        this.reloadSchemes();
    },
    data() {
        return {
            searchResult: null,
            currentPage: 1,
            totalPages: 0,
            newSchemePopup: {
                title: '',
                description: '',
                imageUrl: '',
                categories: [],
                show: false
            }
        }
    },
    methods: {
        selectSearchPage(page) {
            this.reloadSchemes();
        },

        reloadSchemes() {
            var offset = 0;
            if (this.searchResult) {
                offset = (this.currentPage - 1) * this.searchResult.resultsPerPage;
            }
            apiClient.findSchemes('', offset).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
            });
        },

        openNewSchemePopup() {
            this.newSchemePopup.name = '';
            this.newSchemePopup.description = '';
            this.newSchemePopup.show = true;
            this.newSchemePopup.categories = [];
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
                apiClient.createNewScheme({
                    name: name,
                    description: this.newSchemePopup.description,
                    tags: [],
                    items
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
    }
}
</script>

<style lang="css">
</style>
