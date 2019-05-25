<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="category-tree">
        <div class="category-selector" :class="{selected: category.id === selectedCategoryId}">
            <router-link :to="{path: createCategoryUrl()}">
                <a>{{category.name}}</a>
            </router-link>
        </div>
        <div class="category-children" v-if="category.childCategories.length > 0 && category.expanded">
            <category-tree v-for="childCategory in category.childCategories"
                :category="childCategory"
                :selected-category-id="selectedCategoryId"
                :base-url="baseUrl"
                :url-prefix="urlPrefix"
                @category-selected="$emit('category-selected', arguments[0])"
                />
        </div>
    </div>
</template>

<script>
import _ from 'lodash';

export default {
    props: ['category', 'selectedCategoryId', 'urlPrefix', 'baseUrl'],
    name: 'category-tree',

    data() {
        return {
            collapsed: true
        };
    },
    methods: {
        onCategoryClicked() {
            this.$emit('category-selected', this.category);
        },

        createCategoryUrl() {
            let link = this.urlPrefix;
            if (this.category.id !== this.selectedCategoryId) {
                let parameterSplit = '?';
                if (link.indexOf('?') >= 0) {
                    parameterSplit = '&';
                }
                link += `${parameterSplit}category=${encodeURIComponent(this.category.id)}`;
            }
            return link;
        }
    }
}
</script>
