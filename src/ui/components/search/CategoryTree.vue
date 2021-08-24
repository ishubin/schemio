<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="category-tree">
        <div v-for="category in categories">
            <div class="category-selector" :class="{'selected': category.id === selectedCategoryId}" @dragend="onEndDragging(category)" @dragenter="onDragEnter(category)">
                <a :href="getCategoryFullUrl(category)">{{category.name}}</a>
                <div v-if="editAllowed" class="category-menu">
                    <span class="btn btn-secondary btn-small" title="Add sub-category" v-if="depth < maxDepth" @click="onAddCategoryClicked(category)"><i class="fas fa-folder-plus"></i></span>
                    <span class="btn btn-secondary btn-small" title="Edit category" @click="onEditCategoryClicked(category)"><i class="fas fa-pen-square"></i></span>
                    <span class="btn btn-secondary btn-small" title="Delete category" @click="onDeleteCategoryClicked(category)"><i class="fas fa-trash-alt"></i></span>
                    <span class="btn btn-secondary btn-small" style="cursor: grab;" title="Move category" draggable="true" @dragstart="onStartDragging(category)"> <i class="fas fa-arrows-alt"></i> </span>
                </div>
            </div>

            <div class="category-children">
                <div class="category-selector" v-if="isRoot && categoryForDrop && categoryForDrop.id === category.id">
                    <span>{{categoryDragged.name}}</span>
                </div>
                <div class="category-selector" v-if="(!isRoot) && parentCategoryForDrop && parentCategoryForDrop.id === category.id">
                    <span>{{parentCategoryDragged.name}}</span>
                </div>
                <category-tree v-if="category.childCategories"
                    :is-root="false"
                    :depth="depth + 1"
                    :categories="category.childCategories"
                    :selected-category-id="selectedCategoryId"
                    :url-prefix="urlPrefix"
                    :write-permissions="editAllowed"
                    :parent-category-for-drop="isRoot ? categoryForDrop : parentCategoryForDrop"
                    :parent-category-dragged="isRoot ? categoryDragged : parentCategoryDragged"
                    @add-category="onAddCategoryClicked"
                    @edit-category="onEditCategoryClicked"
                    @delete-category="onDeleteCategoryClicked"
                    @child-drag-end="onEndDragging"
                    @child-drag-start="onStartDragging"
                    @child-drag-enter="onDragEnter"
                    />
            </div>
        </div>
        <div v-if="isRoot && categoryDragged" style="height: 60px; margin-top:10px; border: 1px dotted #bbb;" @dragenter="onDragEnter(null)">
            <div v-if="shouldDropToRoot && categoryDragged">
                <span>{{categoryDragged.name}}</span>
            </div>
            <div v-else>
                Drop to root...
            </div>
        </div>
    </div>
</template>

<script>
import find from 'lodash/find';

export default {
    props: {
        categories           : {type: Array, required: true},
        isRoot               : {type: Boolean, default: true},
        depth                : {type: Number, default: 1},
        selectedCategoryId   : {type: String, default: null},
        urlPrefix            : {type: String, default: '/'},
        editAllowed          : {type: Boolean, default: false},
        parentCategoryForDrop: {type: Object, default: null},
        parentCategoryDragged: {type: Object, default: null},
        maxDepth             : {type: Number, default: 10},
    },
    name: 'category-tree',

    data() {
        return {
            collapsed       : true,
            categoryForDrop : null,
            shouldDropToRoot: false,
            categoryDragged : null,
        };
    },
    methods: {
        onAddCategoryClicked(category) {
            this.$emit('add-category', category);
        },

        onEditCategoryClicked(category) {
            this.$emit('edit-category', category);
        },

        onDeleteCategoryClicked(category) {
            this.$emit('delete-category', category);
        },

        onStartDragging(category) {
            if (this.isRoot) {
                this.categoryForDrop = null;
                this.categoryDragged = category;
            } else {
                this.$emit('child-drag-start', category);
            }
        },

        onEndDragging(category) {
            if (this.isRoot) {
                if (this.shouldDropToRoot) {
                    this.$emit('moved-category', this.categoryDragged, null);
                } else if (this.categoryDragged && this.categoryForDrop && this.categoryDragged.parentId !== this.categoryForDrop.id) {
                    this.$emit('moved-category', this.categoryDragged, this.categoryForDrop);
                    this.categoryForDrop = null;
                    this.categoryDragged = null;
                }
            } else {
                this.$emit('child-drag-end', category);
            }
        },

        onDragEnter(category) {
            if (this.isRoot) {
                if (this.categoryDragged) {
                    if (category) {
                        if (this.categoryDragged.id !== category.id
                            && this.categoryDragged.parentId !== category.id
                            && !find(category.ancestors, a => a.id === this.categoryDragged.id)) {
                            this.categoryForDrop = category;
                            this.shouldDropToRoot = false;
                        } else {
                            this.categoryForDrop = null;
                            this.shouldDropToRoot = false;
                        }
                    } else {
                        this.shouldDropToRoot = true;
                    }
                }
            } else {
                this.$emit('child-drag-enter', category);
            }
        },

        getCategoryFullUrl(category) {
            let link = this.urlPrefix;
            if (category.id !== this.selectedCategoryId) {
                let parameterSplit = '?';
                if (link.indexOf('?') >= 0) {
                    parameterSplit = '&';
                }
                link += `${parameterSplit}category=${encodeURIComponent(category.id)}`;
            }
            return link;
        }
    },
    computed: {
    }
}
</script>
