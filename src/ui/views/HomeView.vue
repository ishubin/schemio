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
                <a :href="'/schemes/' + scheme.schemeId">{{scheme.name}}</a>
                <span class="tag" v-for="tag in scheme.tags">{{tag}}</span>
            </div>
        </div>

        <transition name="modal" v-if="newSchemePopup.show">
           <div class="modal-mask">
               <div class="modal-wrapper">
                   <div class="modal-container">
                       <div class="modal-header">
                           <h3>New Scheme</h3>
                       </div>
                       <div class="modal-body">
                           <p>
                           <h5>Name</h5>
                           <input class="textfield" type="text" v-model="newSchemePopup.name" placeholder="Name..."/>

                           <h5>Description</h5>
                           <textarea class="textfield" v-model="newSchemePopup.description"></textarea>
                           </p>

                           <h5>Scheme Image URL</h5>
                           <input class="textfield" type="text" v-model="newSchemePopup.imageUrl" placeholder="Image URL"/>
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
import Paginate from 'vuejs-paginate';

export default {
    components: {Paginate},
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
            apiClient.findSchemes(offset).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
            });
        },

        openNewSchemePopup() {
            this.newSchemePopup.name = '';
            this.newSchemePopup.description = '';
            this.newSchemePopup.show = true;
        },

        submitNewScheme() {
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
                name: this.newSchemePopup.name,
                description: this.newSchemePopup.description,
                tags: [],
                items
            }).then(scheme => {
                window.location.href = `/schemes/${scheme.id}`;
            });
        }
    }
}
</script>

<style lang="css">
</style>
