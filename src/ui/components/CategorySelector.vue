<template lang="html">
    <div class="category-selector-container">
        <div class="category-selector-input">
            <ul>
                <li v-for="category in categories"><span>{{category.name}}</span></li>
                <li class="new-category-input">
                    <input type="text" v-model="inputText" @keydown.13="enterPressed" @keydown.8="backspacePressed" placeholder="New Category..."/>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import shortid  from 'shortid';

export default {
    props: ['categories'],

    data() {
        return {
            inputText: ''
        };
    },

    methods: {
        enterPressed() {
            var text = this.inputText.trim();
            if (text.length > 0) {
                this.addCategory(text, shortid.generate());
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
