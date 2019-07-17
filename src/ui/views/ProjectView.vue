<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="search-view">
        <header-component :project-id="projectId"/>
        <div class="content-wrapper">
            <div class="search-layout">
                <div class="search-attributes-panel">
                    <h4>Categories</h4>
                    <category-tree v-for="category in categories" :key="category.id" :category="category" :selected-category-id="currentCategoryId" :base-url="`/projects/${projectId}`" :url-prefix="urlPrefix"/>
                </div>
                <div class="search-results">
                    <h3 v-if="project">{{project.name}}</h3>
                    <div v-if="searchResult">
                        <div>
                            <input @keyup.enter="onSearchClicked()" class="textfield" style="width: 300px" type="text" v-model="query" placeholder="Search ..."/>
                            <span @click="onSearchClicked()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
                        </div>

                        <div>
                            Total results <b>{{searchResult.total}}</b>
                        </div>

                        <pagination
                            :current-page="currentPage"
                            :total-pages="totalPages"
                            :url-prefix="urlPrefix"
                            :use-router="true"
                        />

                        <ul class="schemes">
                            <li v-for="scheme in searchResult.results">
                                <router-link :to="{path: `/projects/${projectId}/schemes/${scheme.id}`}">
                                    <a class="scheme link">
                                        <h5>{{scheme.name}}</h5>
                                        <div class="image-wrapper">
                                            <img class="scheme-preview" :src="`/projects/${projectId}/images/scheme-preview-${scheme.id}.svg`" style="max-width: 200px; max-height: 100px;"/>
                                        </div>
                                        <span class="timestamp">{{scheme.modifiedDate | formatDateAndTime}}</span>
                                        <div class="scheme-description">
                                            {{scheme.description | shortDescription}}
                                        </div>
                                    </a>
                                </router-link>
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
import Pagination from '../components/Pagination.vue';

//TODO Align it with the server side
const RESULTS_PER_PAGE = 20;

export default {
    components: {HeaderComponent, CategoryTree, Pagination},

    mounted() {
        this.init();
    },

    data() {
        return {
            projectId: this.$route.params.projectId,
            project: null,
            query: '',
            urlPrefix: null,
            searchResult: null,
            currentCategoryId: null,
            currentPage: 1,
            totalPages: 0,
            categories: []
        };
    },

    methods: {
        init() {
            apiClient.getProject(this.projectId).then(project => this.project = project);

            this.currentCategoryId = this.$route.query.category;
            this.currentPage = parseInt(this.$route.query.page) || 1;
            this.query = this.$route.query.q || '';

            let urlPrefix = `/projects/${this.projectId}/`;
            let hasParamsAlready = false;
            _.forEach(this.$route.query, (value, name) => {
                if (name !== 'page' && name != 'category') {
                    urlPrefix += hasParamsAlready ? '&': '?';
                    urlPrefix += `${name}=${encodeURIComponent(value)}`;
                    hasParamsAlready = true;
                }
            });

            this.urlPrefix = urlPrefix;

            apiClient.getCategoryTree(this.projectId).then(categories => {
                this.categories = categories;
                if (this.currentCategoryId) {
                    this.expandToCategory(this.currentCategoryId);
                }
            });
            this.searchSchemes();
        },
        searchSchemes() {
            let offset = 0;
            if (this.currentPage > 0) {
                offset = (this.currentPage - 1) * RESULTS_PER_PAGE;
            }
            apiClient.findSchemes(this.projectId, {
                query: this.query,
                categoryId: this.currentCategoryId,
                offset: offset,
                includeSubcategories: true
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
            });
        },

        onSearchClicked() {
            let url = `/projects/${this.projectId}?q=${encodeURIComponent(this.query)}&page=${this.currentPage}`;
            if (this.currentCategoryId) {
                url += `&category=${encodeURIComponent(this.currentCategoryId)}`;
            }

            this.$router.push({path: url});
        },

        expandToCategory(categoryId) {
            for (let i = 0; i < this.categories.length; i++) {
                this._expandToCategory(this.categories[i], categoryId);
            };
        },

        _expandToCategory(category, categoryId) {
            if (category.id === categoryId) {
                category.expanded = true;
                return true;
            }

            if (category.childCategories.length > 0) {
                for (let i = 0; i < category.childCategories.length; i++) {
                    if (this._expandToCategory(category.childCategories[i], categoryId)) {
                        category.expanded = true;
                        return true;
                    }
                }
            }
            return false;
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
    },

    watch:{
        $route(to, from) {
            this.init();
        }
    }
}
</script>

<style lang="css">
</style>
