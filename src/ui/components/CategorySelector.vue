<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="category-selector-container">
        <div class="category-selector-input">
            <ul>
                <li v-for="category in categories">
                    <span>{{category.name}}</span>
                    <i class="fas fa-angle-right"></i>
                </li>
                <li class="new-category-input">
                    <input type="text" v-model="inputText"
                        @keydown.enter="enterPressed"
                        @keydown.delete="backspacePressed"
                        @focus="onInputFocus"
                        @blur="onInputBlur"
                        placeholder="New Category..."/>
                </li>
            </ul>
        </div>
        <div class="category-suggestions" v-if="showSuggestions">
            <ul>
                <li v-for="category in childSuggestions" v-if="inputText.length === 0 || category.name.toLowerCase().indexOf(inputText.toLowerCase()) >=0"
                    @click="selectCategoryFromSuggestions(category)"
                    ><span>{{category.name}}</span></li>
            </ul>
        </div>
    </div>
</template>

<script>
import apiClient from '../apiClient.js';
import config from '../config';
import StoreUtils from '../store/StoreUtils.js';


function findCategoryInTree(categoryId, categories) {
    if (!categories) {
        return null;
    }

    for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === categoryId) {
            return categories[i];
        }
        const foundInChildren = findCategoryInTree(categoryId, categories[i].childCategories);
        if (foundInChildren) {
            return foundInChildren;
        }
    }

    return null;
};


export default {
    props: ['categories', 'projectId'],

    mounted() {
        return apiClient.getCategoryTree(this.projectId).then(categories => {
            this.treeCategories = categories;
            this.reloadSuggestions();
        });
    },

    data() {
        return {
            inputText: '',
            childSuggestions: [],
            showSuggestions: false,
            treeCategories: [], // a tree of categories
            blurTimer: null
        };
    },

    methods: {
        reloadSuggestions() {
            var id = null;
            this.showSuggestions = false;
            this.childSuggestions = [];
            if (this.categories.length > 0) {
                id = this.categories[this.categories.length - 1].id;
                if (!id) {
                    return;
                }
            }
            if (id) {
                const category = findCategoryInTree(id, this.treeCategories);
                if (category && category.childCategories) {
                    this.childSuggestions = category.childCategories;
                }

            } else {
                this.childSuggestions = this.treeCategories;
            }
        },

        enterPressed() {
            var text = this.inputText.trim();
            if (text.length > 0) {
                if (this.categories.length > config.project.categories.maxDepth) {
                    StoreUtils.addErrorSystemMessage(this.$store, `Max category depth (${config.project.categories.maxDepth}) exceeded`, 'max-category-depth');
                    return;
                }
                this.addCategory(text, null);
                this.inputText = '';
            }
        },

        backspacePressed() {
            if (this.inputText.length === 0) {
                this.categories.pop();
                this.reloadSuggestions();
                this.showSuggestions = true;
            }
        },

        addCategory(name, id) {
            if (this.categories.length > config.project.categories.maxDepth) {
                return;
            }

            this.childSuggestions = [];
            this.categories.push({
                name: name,
                id: id
            });
        },

        selectCategoryFromSuggestions(category) {
            this.inputText = '';
            this.addCategory(category.name, category.id);
            this.reloadSuggestions();
        },

        onInputFocus() {
            if (this.blurTimer) {
                clearTimeout(this.blurTimer);
            }
            this.showSuggestions = true;
        },

        onInputBlur() {
            if (!this.blurTimer) {
                this.blurTimer = setTimeout(() => {
                    this.showSuggestions = false;
                    this.blurTimer = null;
                    var text = this.inputText.trim();
                    if (text.length > 0) {
                        this.inputText = '';
                        this.addCategory(text, null);
                    }
                }, 200);
            }
        }
    }
}
</script>

<style lang="css">
</style>
