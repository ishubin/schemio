<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <ul class="category-breadcrumb" v-if="schemeContainer.scheme.category">
            <li>
                <router-link :to="{path: '/'}">
                    <a href="#"><i class="fas fa-home"></i></a>
                </router-link>
                <i class="fas fa-angle-right"></i>
            </li>
            <li v-for="category in schemeContainer.scheme.category.ancestors">
                <router-link :to="{ path: `/projects/${projectId}?category=${category.id}` }">
                    <a href="#">{{category.name}}</a>
                </router-link>
                <i class="fas fa-angle-right"></i>
            </li>
            <li>
                <router-link :to="{ path: `/projects/${projectId}?category=${schemeContainer.scheme.category.id}` }">
                    <a href="#">{{schemeContainer.scheme.category.name}}</a>
                </router-link>
            </li>
            <li>
                <span class="link" title="Move to another category" @click="showMoveToCategoryModal"><i class="fas fa-edit"></i></span>
            </li>
        </ul>
        <div v-else>
            <span class="link" title="Move to another category" @click="showMoveToCategoryModal">Move to category</span>
        </div>

        <div v-if="schemeContainer.scheme">
            <h5 class="section">Name</h5>
            <input class="textfield" type="text" v-model="schemeContainer.scheme.name" placeholder="Scheme name ..." @change="onPropertyChange('name')"/>

            <h5 class="section">Tags</h5>
            <vue-tags-input v-model="schemeTag"
                :tags="schemeTags"
                :autocomplete-items="filteredSchemeTags"
                @tags-changed="onSchemeTagChange"
                ></vue-tags-input>

            <h5 class="section">Description</h5>
            <rich-text-editor v-model="schemeContainer.scheme.description"
                @changed="schemeContainer.scheme.description = arguments[0]; onPropertyChange('description')"
                ></rich-text-editor>

            <span class="btn btn-dangerous" @click="showDeleteSchemeWarning = true">Delete Scheme</span>

            <modal v-if="showDeleteSchemeWarning" title="Delete scheme"
                primaryButton="Delete"
                @close="showDeleteSchemeWarning = false"
                @primary-submit="deleteScheme()"
                >
                Are you sure you want to delete <b>{{schemeContainer.scheme.name}}</b> scheme?
            </modal>


            <modal v-if="moveToCategoryModal.shown"
                title="Move to Category"
                @close="moveToCategoryModal.shown = false"
                >
                <p>Select category:</p>
                <span class="btn btn-secondary" @click="onMovedToCategoryClicked(null)">Make Uncategorized</span>
                <div style="max-height: 400px; overflow: auto;">
                    <simple-category-tree :categories="moveToCategoryModal.categories" @category-selected="onMovedToCategoryClicked"/>
                </div>
            </modal>
        </div>
    </div>
</template>

<script>
import VueTagsInput from '@johmun/vue-tags-input';
import apiClient from '../../apiClient.js';
import EventBus from './EventBus.js';
import Modal from '../Modal.vue';
import RichTextEditor from '../RichTextEditor.vue';
import SimpleCategoryTree from '../SimpleCategoryTree.vue';

export default {
    props: ['projectId', 'schemeContainer'],
    components: {VueTagsInput, Modal, RichTextEditor, SimpleCategoryTree},
    mounted() {
        apiClient.getTags(this.projectId).then(tags => {
            this.existingSchemeTags = _.map(tags, tag => {
                return {text: tag};
            });
        });
    },
    data() {
        return {
            schemeTag: '',
            existingSchemeTags: [],
            showDeleteSchemeWarning: false,
            moveToCategoryModal: {
                shown: false,
                categories: []
            }
        }
    },

    methods: {
        onSchemeTagChange(newTags) {
            this.schemeContainer.scheme.tags = _.map(newTags, tag => tag.text);
            this.onPropertyChange('tags');
        },

        onPropertyChange(propertyName) {
            EventBus.emitSchemeChangeCommited(`scheme.${propertyName}`);
            EventBus.$emit(EventBus.SCHEME_CHANGED, propertyName);
        },

        deleteScheme() {
            apiClient.deleteScheme(this.projectId, this.schemeContainer.scheme.id).then(() => {
                window.location = '/';
            });
        },

        showMoveToCategoryModal() {
            apiClient.getCategoryTree(this.projectId).then(categories => {
                this.moveToCategoryModal.categories = categories;
                this.moveToCategoryModal.shown = true;
            })
        },

        onMovedToCategoryClicked(category) {
            const scheme = this.schemeContainer.scheme;
            if (category) {
                scheme.categoryId = category.id;
            } else {
                scheme.categoryId = null;
            }
            apiClient.saveScheme(this.projectId, this.schemeContainer.scheme.id, scheme).then(() => {
                this.moveToCategoryModal.shown = false;
                location.reload();
            });
        }
    },

    computed: {
        filteredSchemeTags() {
            return this.existingSchemeTags.filter(i => new RegExp(this.schemeTag, 'i').test(i.text));
        },
        schemeTags() {
            return _.map(this.schemeContainer.scheme.tags, tag => {return {text: tag}});
        }
    },
}
</script>

<style lang="css">
</style>
