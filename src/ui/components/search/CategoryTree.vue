<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="category-tree">
        <div class="category-selector" :class="{selected: category.id === selectedCategoryId}">
            <a :href="link">{{category.name}}</a>
        </div>
        <div class="category-children" v-if="category.childCategories.length > 0 && category.expanded">
            <category-tree v-for="childCategory in category.childCategories"
                :category="childCategory"
                :selected-category-id="selectedCategoryId"
                :base-url="baseUrl"
                :url-params="urlParams"
                @category-selected="$emit('category-selected', arguments[0])"
                />
        </div>
    </div>
</template>

<script>
import _ from 'lodash';

export default {
    props: ['category', 'selectedCategoryId', 'urlParams', 'baseUrl'],
    name: 'category-tree',

    data() {
        let link = this.baseUrl;
        let hasParamsAlready = false;
        _.forEach(this.urlParams, (value, name) => {
            if (name !== 'page' && name != 'category') {
                link += hasParamsAlready ? '&': '?';
                link += `${name}=${encodeURIComponent(value)}`;
                hasParamsAlready = true;
            }
        });

        if (this.category.id !== this.selectedCategoryId) {
            link += hasParamsAlready ? '&': '?';
            link += `category=${encodeURIComponent(this.category.id)}`;
        }


        return {
            collapsed: true,
            link: link
        };
    },
    methods: {
        onCategoryClicked() {
            this.$emit('category-selected', this.category);
        }
    }
}
</script>
