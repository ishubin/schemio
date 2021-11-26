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
                <router-link :to="{ path: `${projectLink}?category=${category.id}` }">
                    <a href="#">{{category.name}}</a>
                </router-link>
                <i class="fas fa-angle-right"></i>
            </li>
            <li>
                <router-link :to="{ path: `${projectLink}?category=${schemeContainer.scheme.category.id}` }">
                    <a href="#">{{schemeContainer.scheme.category.name}}</a>
                </router-link>
            </li>
            <li>
                <span class="link" title="Move to another category" @click="showMoveToCategoryModal"><i class="fas fa-edit"></i></span>
            </li>
        </ul>
        <div v-else>
            <span v-if="supportsCategoryModifications" class="link" title="Move to another category" @click="showMoveToCategoryModal">Move to category</span>
        </div>

        <div v-if="schemeContainer.scheme">
            <panel name="General">
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
            </panel>

            <panel name="Screen Settings">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">
                                Draggable
                                <tooltip>
                                    Allows users to drag screen using mouse in view mode.
                                </tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input type="checkbox" v-model="screenSettings.draggable" id="chk-screen-draggable"/>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Style">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Background</td>
                            <td class="value" width="50%">
                                <color-picker :color="schemeContainer.scheme.style.backgroundColor" @input="onSchemeStylePropertyChange('backgroundColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Grid</td>
                            <td class="value" width="50%">
                                <color-picker :color="schemeContainer.scheme.style.gridColor" @input="onSchemeStylePropertyChange('gridColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Bound Box</td>
                            <td class="value" width="50%">
                                <color-picker :color="schemeContainer.scheme.style.boundaryBoxColor" @input="onSchemeStylePropertyChange('boundaryBoxColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Control Points</td>
                            <td class="value" width="50%">
                                <color-picker :color="schemeContainer.scheme.style.controlPointsColor" @input="onSchemeStylePropertyChange('controlPointsColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Operations">
                <span class="btn btn-secondary" @click="$emit('clicked-advanced-behavior-editor')"><i class="fas fa-running"/> Behavior Editor</span>
                <span v-if="supportsSchemeDeletion" class="btn btn-danger" @click="showDeleteSchemeWarning = true">Delete Diagram</span>
            </panel>

            <modal v-if="showDeleteSchemeWarning" title="Delete diagram"
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
import EventBus from './EventBus.js';
import Modal from '../Modal.vue';
import RichTextEditor from '../RichTextEditor.vue';
import SimpleCategoryTree from '../SimpleCategoryTree.vue';
import ColorPicker from '../editor/ColorPicker.vue';
import Panel from '../editor/Panel.vue';
import map from 'lodash/map';
import Tooltip from '../Tooltip.vue';
import { prepareSchemeForSaving } from '../../scheme/Scheme'

export default {
    props: {
        schemeContainer: { type: Object },
        categoriesEnabled: { type: Boolean, default: true }
    },
    components: {VueTagsInput, Modal, RichTextEditor, SimpleCategoryTree, ColorPicker, Panel, Tooltip},
    mounted() {
        if (this.$store.state.apiClient && this.$store.state.apiClient.getTags) {
            this.$store.state.apiClient.getTags().then(tags => {
                this.existingSchemeTags = map(tags, tag => {
                    return {text: tag};
                });
            });
        }
    },
    data() {
        return {
            schemeTag: '',
            projectLink: this.schemeContainer.scheme.projectLink,
            existingSchemeTags: [],
            showDeleteSchemeWarning: false,

            screenSettings: {
                draggable: this.schemeContainer.scheme.settings.screen.draggable
            },

            moveToCategoryModal: {
                shown: false,
                categories: []
            }
        }
    },

    methods: {
        onSchemeStylePropertyChange(fieldName, value) {
            this.schemeContainer.scheme.style[fieldName] = value;
            this.onPropertyChange(`scheme.style.${fieldName}`);
        },

        onSchemeTagChange(newTags) {
            this.schemeContainer.scheme.tags = map(newTags, tag => tag.text);
            this.onPropertyChange('tags');
        },

        onPropertyChange(propertyName) {
            EventBus.emitSchemeChangeCommited(`scheme.${propertyName}`);
        },

        deleteScheme() {
            this.$store.state.apiClient.deleteScheme(this.schemeContainer.scheme.id).then(() => {
                window.location = this.projectLink;
            });
        },

        showMoveToCategoryModal() {
            this.$store.state.apiClient.getCategoryTree().then(categories => {
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
            this.$store.state.apiClient.saveScheme(this.schemeContainer.scheme.id, prepareSchemeForSaving(scheme)).then(() => {
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
            return map(this.schemeContainer.scheme.tags, tag => {return {text: tag}});
        },

        supportsSchemeDeletion() {
            return this.$store.state.apiClient && this.$store.state.apiClient.deleteScheme;
        },

        supportsCategoryModifications() {
            return this.categoriesEnabled && this.$store.state.apiClient && this.$store.state.apiClient.getCategoryTree;
        }
    },

    watch: {
        'screenSettings.draggable': {
            handler(value) {
                this.schemeContainer.scheme.settings.screen.draggable = value;
                EventBus.emitSchemeChangeCommited('scheme.settings.screen.draggable');
            }
        }
    }
}
</script>

<style lang="css">
</style>
