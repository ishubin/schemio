<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="category-tree">
        <div class="category-selector" :class="{'selected': category.id === selectedCategoryId}">
            <router-link :to="{path: categoryFullUrl}">{{category.name}}</router-link>
            <div v-if="writePermissions" class="category-menu">
                <span class="btn btn-secondary btn-small" title="Add sub-category" @click="onAddCategoryClicked(category)"><i class="fas fa-folder-plus"></i></span>
                <span class="btn btn-secondary btn-small" title="Move to another category" @click="onMoveCategoryClicked(category)"><i class="fas fa-people-carry"></i></span>
                <span class="btn btn-secondary btn-small" title="Delete category" @click="onDeleteCategoryClicked(category)"><i class="fas fa-trash-alt"></i></span>
            </div>
        </div>
        <div class="category-children" v-if="category.childCategories.length > 0">
            <category-tree v-for="childCategory in category.childCategories"
                :category="childCategory"
                :selected-category-id="selectedCategoryId"
                :url-prefix="urlPrefix"
                :write-permissions="writePermissions"
                @add-category="onAddCategoryClicked"
                @move-category="onMoveCategoryClicked"
                @deletee-category="onDeleteCategoryClicked"
                />
        </div>
    </div>
</template>

<script>
import _ from 'lodash';

export default {
    props: {
        category:           {type: Object},
        selectedCategoryId: {type: String},
        urlPrefix:          {type: String},
        writePermissions:   {type: Boolean, default: false}
    },
    name: 'category-tree',

    data() {
        return {
            collapsed: true
        };
    },
    methods: {
        onAddCategoryClicked(category) {
            this.$emit('add-category', category);
        },

        onMoveCategoryClicked(category) {
            this.$emit('move-category', category);
        },

        onDeleteCategoryClicked(category) {
            this.$emit('delete-category', category);
        },

    },
    computed: {
        categoryFullUrl() {
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
