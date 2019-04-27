<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="browse-schemes">
        <header-component :category="category"/>
        <div class="content-wrapper">
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
            <h3>Categories</h3>
            <ul class="categories" v-if="category">
                <li v-for="childCategory in category.childCategories">
                    <a class="category link" :href="'?category='+childCategory.id"><i class="fas fa-book-reader"></i> <span>{{childCategory.name}}</span></a>
                </li>
            </ul>

            <h3>Schemes</h3>
            <ul class="schemes">
                <li v-for="scheme in schemes">
                    <a class="scheme link" :href="'/schemes/'+scheme.id">
                        <h5>{{scheme.name}}</h5>
                        <div class="image-wrapper">
                            <img class="scheme-preview" :src="'/images/scheme-preview-' + scheme.id + '.png'"/>
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
</template>

<script>
import apiClient from '../apiClient.js';
import utils from '../utils.js';
import HeaderComponent from '../components/Header.vue';


export default {
    components: {HeaderComponent},
    mounted() {
        this.loadCategories();
        this.loadSchemes();
    },
    data() {
        return {
            categoryId: this.$route.query.category,
            category: null,
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
