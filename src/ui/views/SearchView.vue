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
                    <h4>Categories</h4>
                    <category-tree v-for="category in categories" :category="category" :selected-category-id="currentCategoryId" base-url="/search" :url-params="$route.query"/>
                </div>
                <div class="search-results">
                    <div v-if="searchResult">
                        <div>
                            <input @keyup.enter="onSearchClicked()" class="textfield" style="width: 300px" type="text" v-model="query" placeholder="Search ..."/>
                            <span @click="onSearchClicked()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
                        </div>

                        <div>
                            Total results <b>{{searchResult.total}}</b>
                        </div>

                        <paginate
                            v-model="currentPage"
                            :page-count="totalPages"
                            :page-range="3"
                            :margin-pages="2"
                            :click-handler="onPageSelected"
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
            if (this.currentCategoryId) {
                this.expandToCategory(this.currentCategoryId);
            }
        });

        this.searchSchemes();
    },

    data() {
        return {
            query: this.$route.query.q || '',
            searchResult: null,
            currentCategoryId: this.$route.query.category,
            currentPage: parseInt(this.$route.query.page) || 1,
            totalPages: 0,
            categories: []
        };
    },

    methods: {
        searchSchemes() {
            let offset = 0;
            if (this.searchResult) {
                if (this.currentPage > 0) {
                    offset = (this.currentPage - 1) * this.searchResult.resultsPerPage;
                }
            }
            apiClient.findSchemes({
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
            let url = `/search?q=${encodeURIComponent(this.query)}&page=${this.currentPage}`;
            if (this.currentCategoryId) {
                url += `&category=${encodeURIComponent(this.currentCategoryId)}`;
            }

            window.location = url;
        },

        //TODO refactor pagination completely. Make sure it renders a proper link and get rid of this ugly hack below
        onPageSelected(page) {
            let url = this.$route.path;
            let hasParamsAlready = false;

            _.forEach(this.$route.query, (value, name) => {
                if (name !== 'page') {
                    if (!hasParamsAlready) {
                        url += '?';
                        hasParamsAlready = true;
                    } else {
                        url += '&';
                    }

                    url += name + '=' + encodeURIComponent(value);
                }
            });

            url += hasParamsAlready ? '&' : '?';
            url += `page=${page}`;

            window.location = url;
        },

        expandToCategory(categoryId) {
            for (let i = 0; i < this.categories.length; i++) {
                if (this._expandToCategory(this.categories[i], categoryId)) {
                    this.categories[i].expanded = true;
                }
            };
        },

        _expandToCategory(category, categoryId) {
            if (category.childCategories.length > 0) {
                for (let i = 0; i < category.childCategories.length; i++) {
                    if (this._expandToCategory(category.childCategories[i], categoryId)) {
                        return true;
                    }
                }
            }
            return category.id === categoryId;
        },

        onCategorySelected(category) {
            this.currentCategoryId = category.id;
            this.searchSchemes();
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
