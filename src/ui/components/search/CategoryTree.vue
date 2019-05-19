<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="category-tree">
        <div class="category-selector">
            <span @click="onCategoryClicked">
                <i v-if="category.id === selectedCategoryId" class="fas fa-check-square"></i>
                <i v-else class="far fa-square"></i>
            </span>
            <span @click="collapsed = !collapsed" v-if="category.childCategories.length > 0">
                <i v-if="collapsed" class="fas fa-plus-square"></i>
                <i v-else class="fas fa-minus-square"></i>
            </span>
            <span @click="onCategoryClicked">{{category.name}}</span>
        </div>
        <div class="category-children" v-if="category.childCategories.length > 0 && !collapsed">
            <category-tree v-for="childCategory in category.childCategories" :category="childCategory" :selected-category-id="selectedCategoryId" @category-selected="$emit('category-selected', arguments[0])"/>
        </div>
    </div>
</template>

<script>
export default {
    props: ['category', 'selectedCategoryId'],
    name: 'category-tree',

    data() {
        return {
            collapsed: true
        };
    },
    methods: {
        onCategoryClicked() {
            this.$emit('category-selected', this.category);
        }
    }
}
</script>
