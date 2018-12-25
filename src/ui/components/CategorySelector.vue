<template lang="html">
    <div class="category-selector-container">
        <div class="category-selector-input">
            <ul>
                <li v-for="category in categories"><span>{{category.name}}</span></li>
                <li class="new-category-input">
                    <input type="text" v-model="inputText" @keydown.enter="enterPressed" @keydown.delete="backspacePressed" placeholder="New Category..."/>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import apiClient from '../apiClient.js';

export default {
    props: ['categories'],

    mounted() {

    },

    data() {
        return {
            inputText: ''
        };
    },

    methods: {
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
            }
        },

        addCategory(name, id) {
            this.categories.push({
                name: name,
                id: id
            });
        }
    }
}
</script>

<style lang="css">
</style>
