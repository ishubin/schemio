<template>
    <div class="category-tree">
        <div v-for="category in categories">
            <div class="category-selector">
                <span class="link" @click="onCategorySelected(category)">{{category.name}}</span>
            </div>
            <div class="category-children">
                <simple-category-tree :categories="category.childCategories" @category-selected="onCategorySelected"></simple-category-tree>
            </div>
        </div>

    </div>
</template>

<script>
export default {
    props: ['categories'],
    name: 'simple-category-tree',

    methods: {
        onCategorySelected(category) {
            this.$emit('category-selected', category);
        }
    }
}
</script>

<style>

</style>