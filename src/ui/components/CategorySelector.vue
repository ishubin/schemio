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

export default {
    props: ['categories'],

    mounted() {
        this.reloadSuggestions();
    },

    data() {
        return {
            inputText: '',
            childSuggestions: [],
            showSuggestions: false,

            blurTimer: null
        };
    },

    methods: {
        reloadSuggestions() {
            var id = null;
            this.showSuggestions = false;
            if (this.categories.length > 0) {
                id = this.categories[this.categories.length - 1].id;
                if (!id) {
                    return Promise.resolve(null);
                }
            }
            return apiClient.getCategory(id).then(category => {
                this.childSuggestions = category.childCategories;
            });
        },

        enterPressed() {
            var text = this.inputText.trim();
            if (text.length > 0) {
                this.addCategory(text, null);
                this.inputText = '';
            }
        },

        backspacePressed() {
            if (this.inputText.length === 0) {
                this.categories.pop();
                this.reloadSuggestions().then(() => {
                    this.showSuggestions = true;
                });
            }
        },

        addCategory(name, id) {
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
