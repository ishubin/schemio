<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="search-view">
        <header-component/>

        <div class="content-wrapper">
            <h3>Schemes</h3>
            <div class="search-layout">
                <div class="search-attributes-panel">
                    <category-tree v-for="category in categories" :category="category" :selected-category-id="currentCategoryId" @category-selected="onCategorySelected"/>
                </div>
                <div class="search-results">
                    <div v-if="searchResult">
                        <div>
                            <input @keyup.enter="searchSchemes()" class="textfield" style="width: 300px" type="text" v-model="query" placeholder="Search ..."/>
                            <span @click="searchSchemes()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
                        </div>

                        <div>
                            Total results <b>{{searchResult.total}}</b>
                        </div>

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

                        <ul class="schemes">
                            <li v-for="scheme in searchResult.results">
                                <a class="scheme link" :href="'/schemes/'+scheme.id">
                                    <h5>{{scheme.name}}</h5>
                                    <div class="image-wrapper">
                                        <img class="scheme-preview" :src="'/images/scheme-preview-' + scheme.id + '.png'" style="max-width: 200px; max-height: 100px;"/>
                                    </div>
                                    <span class="timestamp">{{scheme.modifiedDate | formatDateAndTime}}</span>
                                    <div class="scheme-description">
                                        {{scheme.description | shortDescription}}
                                    </div>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';
import CategoryTree from '../components/search/CategoryTree.vue';
import apiClient from '../apiClient.js';
import utils from '../utils.js';
import Paginate from 'vuejs-paginate';

export default {
    components: {HeaderComponent, Paginate, CategoryTree},

    mounted() {
        apiClient.getCategoryTree().then(categories => {
            this.categories = categories;
        });
        this.searchSchemes();
    },

    data() {
        return {
            query: '',
            offset: 0,
            searchResult: null,
            currentCategoryId: null,
            currentPage: 1,
            totalPages: 0,
            categories: []
        };
    },

    methods: {
        searchSchemes() {
            this.selectSearchPage(0);
        },

        onCategorySelected(category) {
            this.currentCategoryId = category.id;
            this.searchSchemes();
        },

        selectSearchPage(page) {
            this.currentPage = page > 0? page: 1;
            var offset = 0;
            if (this.searchResult) {
                if (page > 0) {
                    offset = (page - 1) * this.searchResult.resultsPerPage;
                }
            }
            apiClient.findSchemes({
                query: this.query,
                categoryId: this.currentCategoryId,
                offset: offset,
                includeParent: true
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
            });
        }
    },
    filters: {
        shortDescription(text) {
            if (text.length > 200) {
                return text.substr(0, 200) + '...';
            } else {
                return text;
            }
        },
        formatDateAndTime(dateInMillis) {
            return utils.formatDateAndTime(dateInMillis);
        }
    }
}
</script>

<style lang="css">
</style>
