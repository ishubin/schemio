<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="search-view">
        <header-component :project-id="projectId" :project="project" :category="currentCategory"/>
        <div class="middle-content">
            <div class="search-layout">
                <div v-if="categoriesConfig.enabled" class="search-attributes-panel">
                    <h4>Categories</h4>

                    <div v-if="project && project.permissions.write">
                        <span class="btn btn-secondary btn-small" title="Add new category" @click="onAddCategoryClicked(null)"><i class="fas fa-folder-plus"></i></span>
                    </div>

                    <category-tree
                        :key="`category-tree-revision-${categoryTreeRevision}`"
                        :categories="categories"
                        :selected-category-id="currentCategoryId"
                        :url-prefix="urlPrefix"
                        :write-permissions="project && project.permissions.write"
                        @add-category="onAddCategoryClicked"
                        @edit-category="onEditCategoryClicked"
                        @delete-category="onDeleteCategoryClicked"
                        @moved-category="onCategoryMoveRequested"
                        />
                </div>
                <div class="search-results" v-if="project">
                    <h3 v-if="!isEditingProject">{{project.name}} <span v-if="hasWritePermission" class="project-edit-button" title="Edit project..." @click="isEditingProject = true"><i class="fas fa-pencil-alt"/> Edit</span></h3>
                    <div v-if="isEditingProject" class="section">
                        <h4>Name</h4>
                        <input ref="editProjectNameTextfield" class="textfield" type="text" :value="project.name"/>
                    </div>

                    <div class="section">
                        <div v-if="!isEditingProject">
                            {{project.description}}
                        </div>
                        <div v-else>
                            <h4>Description</h4>
                            <textarea ref="editProjectDescriptionTextarea" :value="project.description" style="width: 100%; height: 200px; padding: 5px;"/>
                        </div>
                    </div>

                    <div class="section" v-if="hasWritePermission">
                        <div v-if="project.isPublic">
                            This project is <i class="fas fa-unlock"></i> <b>public</b>
                        </div>
                        <div v-else>
                            This project is <i class="fas fa-lock"></i> <b>private</b>
                        </div>

                        <div v-if="isEditingProject" class="section">
                            <span class="btn btn-primary" @click="saveProjectChanges">Save</span>
                            <span class="btn btn-secondary" @click="isEditingProject = false">Cancel</span>
                            <span v-if="project.isPublic" class="btn btn-danger" @click="onMakeProjectPrivateClicked()">Make It Private</span>
                            <span v-else class="btn btn-danger" @click="onMakeProjectPublicClicked()">Make It Public</span>
                            <span class="btn btn-danger" @click="onDeleteProjectClicked()">Delete Project</span>
                        </div>
                    </div>

                    <div v-if="searchResult">
                        <div class="section search-controls">
                            <input @keyup.enter="onSearchClicked()" class="textfield" type="text" v-model="query" placeholder="Search ..."/>
                            <span @click="onSearchClicked()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
                        </div>

                        <div>
                            Total results <b>{{searchResult.total}}</b>
                        </div>

                        <pagination
                            :current-page="currentPage"
                            :total-pages="totalPages"
                            :url-prefix="urlPrefix"
                            :use-router="true"
                        />

                        <div class="tag-filter-container section">
                            <ul class="tag-filter">
                                <li v-if="filterTag"><span class="tag selected" @click="removeTagFilter()">{{filterTag}}</span></li>
                                <li v-for="tag in tags" v-if="tag !== filterTag"><span class="tag" @click="toggleFilterByTag(tag)">{{tag}}</span></li>
                            </ul>
                        </div>

                        <div class="section">
                            <div class="toggle-group">
                                <span v-for="view in knownViews" class="toggle-button"
                                    :class="{toggled: currentView === view.id}"
                                    @click="currentView = view.id"
                                    >{{view.name}}</span>
                            </div>
                        </div>

                        <div class="section" v-if="isEditingProject && searchResult && searchResult.results.length > 0">
                            <span class="btn btn-danger" :class="{disabled: !hasSelectedAnyScheme}" @click="deleteSectedSchemes">Delete Selected Schemes</span>
                        </div>

                        <div class="section">
                            <div class="gallery-view" v-if="currentView === 'gallery'">
                                <ul class="schemes">
                                    <li v-for="scheme in searchResult.results">
                                        <a @click="onSchemeClick(arguments[0], scheme)" :href="`/projects/${projectId}/schemes/${scheme.id}`" class="scheme link">
                                            <input v-if="isEditingProject && schemeStates[scheme.id]" type="checkbox" :checked="schemeStates[scheme.id].checked" class="scheme-checkbox"/>
                                            <div class="scheme-title">{{scheme.name}}</div>
                                            <div class="scheme-preview">
                                                <img v-if="scheme.previewUrl" :src="scheme.previewUrl"/>
                                                <img v-else class="scheme-preview" src="/assets/images/missing-preview.svg"/>
                                            </div>
                                            <span class="timestamp">{{scheme.modifiedTime | formatDateAndTime}}</span>
                                            <div class="scheme-description">
                                                {{scheme.description | shortDescription}}
                                            </div>
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            <div v-else class="list-view">
                                <ul class="schemes">
                                    <li v-for="scheme in searchResult.results">
                                        <a @click="onSchemeClick(arguments[0], scheme)" :href="`/projects/${projectId}/schemes/${scheme.id}`" class="scheme link">
                                            <input v-if="isEditingProject && schemeStates[scheme.id]" type="checkbox" :checked="schemeStates[scheme.id].checked" class="scheme-checkbox"/>
                                            <div class="scheme-preview">
                                                <img v-if="scheme.previewUrl" :src="scheme.previewUrl"/>
                                                <img v-else src="/assets/images/missing-preview.svg"/>
                                            </div>
                                            <div class="scheme-info">
                                                <div class="scheme-title">{{scheme.name}}</div>
                                                <span class="timestamp">{{scheme.modifiedTime | formatDateAndTime}}</span>
                                                <div class="scheme-description">
                                                    {{scheme.description | shortDescription}}
                                                </div>
                                            </div>
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                            
                    </div>
                </div>
            </div>
        </div>

        <modal :title="createCategoryModalTitle" v-if="createCategoryModal.shown"
            @close="createCategoryModal.shown = false" primary-button="Create"
            @primary-submit="onCreateCategorySubmited"
            >
            <h5>Name</h5>
            <input ref="createCategoryNameTextfield" class="textfield" v-model="createCategoryModal.categoryName" :class="{'missing-field-error' : createCategoryModal.mandatoryFields.name.highlight}"/>

            <div v-if="createCategoryModal.errorMessage" class="msg msg-error">{{createCategoryModal.errorMessage}}</div>
        </modal>

        <modal :title="`Delete category ${deleteCategoryModal.categoryName}`" v-if="deleteCategoryModal.shown" primary-button="Delete" 
            @primary-submit="onConfirmDeleteCategoryClicked"
            @close="deleteCategoryModal.shown = false"
            >
            <p>
                Are you sure you want to delete <b><i>"{{deleteCategoryModal.categoryName}}"</i></b> category?
                This will delete all of it's sub-categories and schemes.
            </p>
            <div v-if="deleteCategoryModal.errorMessage" class="msg msg-error">{{deleteCategoryModal.errorMessage}}</div>
        </modal>

        <modal title="Edit category" v-if="editCategoryModal.shown" primary-button="Update"
            @primary-submit="onConfirmUpdateCategoryClicked"
            @close="editCategoryModal.shown = false"
            >
            <h5>Name</h5>
            <input class="textfield" v-model="editCategoryModal.categoryName" :class="{'missing-field-error' : editCategoryModal.mandatoryFields.name.highlight}"/>
            <div v-if="editCategoryModal.errorMessage" class="msg msg-error">{{editCategoryModal.errorMessage}}</div>
        </modal>

        <modal title="Move category" v-if="moveCategoryModal.shown" primary-button="Move"
            @primary-submit="onConfirmMoveCategoryClicked"
            @close="moveCategoryModal.shown = false"
            >
            Are you sure you want to move <b><i>"{{moveCategoryModal.category.name}}"</i></b> category to 
            <span v-if="moveCategoryModal.newParentCategory">
                <b><i>"{{moveCategoryModal.newParentCategory.name}}"</i></b>
            </span>
            <span v-else>
                root
            </span>
            <div v-if="editCategoryModal.errorMessage" class="msg msg-error">{{editCategoryModal.errorMessage}}</div>
        </modal>

        <modal title="Delete schemes" v-if="schemeDeleteModal.shown" primary-button="Delete"
            @primary-submit="onDeleteSchemesSubmited"
            @close="schemeDeleteModal.shown = false"
            >
            <div v-if="schemeDeleteModal.schemes.length === 1">
                Are you sure you want to delete <b>"{{schemeDeleteModal.schemes[0].name}}"</b> scheme?
            </div>
            <div v-else>
                Are you sure you want to delete the following <b>"{{schemeDeleteModal.schemes.length}}"</b> schemes?
                <ul>
                    <li v-for="scheme in schemeDeleteModal.schemes">
                        {{scheme.name}}
                    </li>
                </ul>
            </div>
            <div v-if="schemeDeleteModal.errorMessage" class="msg msg-error">{{schemeDeleteModal.errorMessage}}</div>
        </modal>

    </div>
</template>

<script>
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import HeaderComponent from '../components/Header.vue';
import CategoryTree from '../components/search/CategoryTree.vue';
import apiClient from '../apiClient.js';
import utils from '../utils.js';
import Pagination from '../components/Pagination.vue';
import Modal from '../components/Modal.vue';
import config from '../config';
import LimitedSettingsStorage from '../LimitedSettingsStorage';

const settingsStorage = new LimitedSettingsStorage(window.localStorage, 'project-view', 10);

export default {
    components: {HeaderComponent, CategoryTree, Pagination, Modal},

    beforeMount() {
        this.init();
    },

    data() {
        return {
            projectId: this.$route.params.projectId,
            project: null,
            tags: [],
            filterTag: null,
            query: '',
            urlPrefix: null,
            searchResult: null,

            // storing scheme checkbox states
            schemeStates: {},
            hasSelectedAnyScheme: false,

            currentCategory: null,
            currentCategoryId: null,
            currentPage: 1,
            totalPages: 0,
            resultsPerPage: 20,
            categories: [],
            categoryTreeRevision: 0,

            isEditingProject: false,


            knownViews: [{
                id: 'gallery',
                name: 'Gallery View'
            }, {
                id: 'List',
                name: 'List View'
            }],

            currentView: settingsStorage.get('currentView', 'gallery'),

            createCategoryModal: {
                shown: false,
                categoryName: '',
                parentCategory: null,
                errorMessage: null,
                mandatoryFields: {
                    name: {
                        highlight: false
                    }
                }
            },

            deleteCategoryModal: {
                shown: false,
                categoryName: '',
                category: null,
                errorMessage: null
            },

            editCategoryModal: {
                shown: false,
                categoryName: '',
                category: null,
                errorMessage: null,
                mandatoryFields: {
                    name: {
                        highlight: false
                    }
                }
            },

            moveCategoryModal: {
                shown: false,
                category: null,
                newParentCategory: null,
                errorMessage: null
            },

            categoriesConfig: {
                enabled: config.project.categories.enabled
            },

            schemeDeleteModal: {
                schemes: [],
                shown: false,
                errorMessage: null
            }
        };
    },

    methods: {
        init() {
            this.currentCategoryId = this.$route.query.category || null;
            apiClient.getTags(this.projectId).then(tags => this.tags = tags);
            apiClient.getProject(this.projectId).then(project => this.project = project);
            if (this.categoriesConfig.enabled) {
                apiClient.getCategory(this.projectId, this.currentCategoryId).then(category => {
                    this.currentCategory = category;
                });
            }

            this.currentPage = parseInt(this.$route.query.page) || 1;
            this.filterTag = this.$route.query.tag || null;
            this.query = this.$route.query.q || '';

            let urlPrefix = `/projects/${this.projectId}/`;
            let hasParamsAlready = false;
            forEach(this.$route.query, (value, name) => {
                if (name !== 'page' && name != 'category') {
                    urlPrefix += hasParamsAlready ? '&': '?';
                    urlPrefix += `${name}=${encodeURIComponent(value)}`;
                    hasParamsAlready = true;
                }
            });

            this.urlPrefix = urlPrefix;
            this.reloadCategoryTree();
            this.searchSchemes();
        },

        reloadCategoryTree() {
            if (this.categoriesConfig.enabled) {
                return apiClient.getCategoryTree(this.projectId)
                .then(this.enrichCategories)
                .then(categories => {
                    this.categories = categories;
                });
            }
        },

        searchSchemes() {
            let offset = 0;
            if (this.currentPage > 0) {
                offset = (this.currentPage - 1) * this.resultsPerPage;
            }
            apiClient.findSchemes(this.projectId, {
                query: this.query,
                categoryId: this.currentCategoryId,
                offset: offset,
                includeSubcategories: true,
                tag: this.filterTag
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
                this.resultsPerPage = searchResponse.resultsPerPage;
                this.updateSchemeStates();
            });
        },

        updateSchemeStates() {
            this.schemeStates = {};
            if (!this.searchResult) {
                return;
            }
            forEach(this.searchResult.results, scheme => {
                this.schemeStates[scheme.id] = {checked: false};
            });
            this.hasSelectedAnyScheme = false;
        },

        onSearchClicked() {
            this.toggleSearch();
        },
        
        toggleSearch() {
            const query = {
                q: this.query,
                page: this.currentPage
            };
            query.q = this.query;
            if (this.currentCategoryId) {
                query.category = this.currentCategoryId;
            }
            if (this.filterTag) {
                query.tag = this.filterTag;
            }

            this.$router.push({path: `/projects/${this.projectId}`, query: query});
        },

        removeTagFilter() {
            this.filterTag = null;
            this.toggleSearch();
        },

        toggleFilterByTag(tag) {
            this.filterTag = tag;
            this.toggleSearch();
        },

        onAddCategoryClicked(parentCategory) {
            this.createCategoryModal.categoryName = '';
            this.createCategoryModal.parentCategory = parentCategory;
            this.createCategoryModal.errorMessage = null;
            this.createCategoryModal.shown = true;
            this.createCategoryModal.mandatoryFields.name.highlight = false;
            this.$nextTick(() => {
                this.$refs.createCategoryNameTextfield.focus();
            });
        },

        onEditCategoryClicked(category) {
            this.editCategoryModal.categoryName = category.name;
            this.editCategoryModal.category = category;
            this.editCategoryModal.errorMessage = null;
            this.editCategoryModal.shown = true;
            this.editCategoryModal.mandatoryFields.name.highlight = false;
        },

        onDeleteCategoryClicked(category) {
            this.deleteCategoryModal.category = category;
            this.deleteCategoryModal.errorMessage = null;
            this.deleteCategoryModal.categoryName = category.name;
            this.deleteCategoryModal.shown = true;
        },

        onCategoryMoveRequested(category, newParentCategory) {
            this.moveCategoryModal.category = category;
            this.moveCategoryModal.newParentCategory = newParentCategory;
            this.moveCategoryModal.shown = true;
        },

        onConfirmUpdateCategoryClicked() {
            if (this.editCategoryModal.category) {
                const newName = this.editCategoryModal.categoryName.trim();
                if (newName) {
                    apiClient.updateCategory(this.projectId, this.editCategoryModal.category.id, {
                        name: newName
                    }).then(() => {
                        this.editCategoryModal.shown = false;
                        return this.reloadCategoryTree()
                    }).catch(err => {
                        this.editCategoryModal.errorMessage = 'Internal Server Error. Could not update category';
                    });
                } else {
                    this.editCategoryModal.errorMessage = 'Name should not be empty';
                    this.editCategoryModal.mandatoryFields.name.highlight = true;
                }
            }
        },

        onConfirmMoveCategoryClicked() {
            if (this.moveCategoryModal.category) {
                let destinationCategoryId = null;
                if (this.moveCategoryModal.newParentCategory) {
                    destinationCategoryId = this.moveCategoryModal.newParentCategory.id;
                }

                apiClient.moveCategory(this.projectId, this.moveCategoryModal.category.id, destinationCategoryId)
                .then(categories => {
                    this.moveCategoryModal.shown = false;
                    this.categories = categories;
                    this.categoryTreeRevision += 1;
                }).catch(err => {
                    this.moveCategoryModal.errorMessage = 'Internal Server Error. Could not move category';
                });
            }
        },

        onConfirmDeleteCategoryClicked() {
            if (this.deleteCategoryModal.category) {
                const isCurrentCategoryInDeletedTree = this.currentCategoryId && this.isInCategoryTree(this.currentCategoryId, this.deleteCategoryModal.category);

                apiClient.deleteCategory(this.projectId, this.deleteCategoryModal.category.id).then(() => {
                    this.deleteCategoryModal.shown = false;
                }).then(() => {
                    if (isCurrentCategoryInDeletedTree) {
                        this.currentCategoryId = null;
                        this.$router.push({path: this.$route.path, query: {}});
                    } else {
                        return this.reloadCategoryTree()
                    }
                })
                .catch(err => {
                    this.deleteCategoryModal.errorMessage = 'Internal Server Error. Could not delete category';
                });
            }
        },

        onCreateCategorySubmited() {
            const name = this.createCategoryModal.categoryName.trim();
            if (name) {
                let parentCategoryId = null;
                if (this.createCategoryModal.parentCategory) {
                    parentCategoryId = this.createCategoryModal.parentCategory.id;
                }
                apiClient.createCategory(this.projectId, name, parentCategoryId)
                .then(() => this.reloadCategoryTree())
                .then(() => {
                    this.createCategoryModal.shown = false;
                })
                .catch(err => {
                    this.createCategoryModal.errorMessage = 'Could not add a category';
                });
            } else {
                this.createCategoryModal.errorMessage = 'Category should not be empty';
                this.createCategoryModal.mandatoryFields.name.highlight = true;
            }
        },

        isInCategoryTree(categoryId, category) {
            if (category) {
                if (categoryId === category.id) {
                    return true;
                }

                if (category.childCategories.length > 0) {
                    for (let i = 0; i < category.childCategories.length; i++) {
                        if (this.isInCategoryTree(categoryId, category.childCategories[i])) {
                            return true;
                        }
                    }
                }
            }
            return false;
        },

        enrichCategories(categories, parentId) {
            forEach(categories, category => {
                if (parentId) {
                    category.parentId = parentId;
                }
                if (category.childCategories) {
                    this.enrichCategories(category.childCategories, category.id);
                }
            });
            return categories;
        },

        saveProjectChanges() {
            let name = this.project.name;
            let description = this.project.description;

            if (this.$refs.editProjectNameTextfield) {
                name = this.$refs.editProjectNameTextfield.value;
            }

            if (this.$refs.editProjectDescriptionTextarea) {
                description = this.$refs.editProjectDescriptionTextarea.value;
            }

            apiClient.patchProject(this.projectId, { name, description }).then(() => {
                this.isEditingProject = false;
                this.project.name = name;
                this.project.description = description;
            }); 
        },

        onMakeProjectPrivateClicked() {
            if (confirm('Are you sure you want to make your project private? It will only be accessible to you')) {
                apiClient.patchProject(this.projectId, {isPublic: false})
                .then(() => {
                    this.project.isPublic = false;
                }).catch(err => {
                    alert('Sorry, could not update your projects description. Something went wrong.');
                });
            }
        },

        onMakeProjectPublicClicked() {
            if (confirm('Are you sure you want to make your project available for everyone else?')) {
                apiClient.patchProject(this.projectId, {isPublic: true})
                .then(() => {
                    this.project.isPublic = true;
                }).catch(err => {
                    alert('Sorry, could not update your projects description. Something went wrong.');
                });
            }
        },

        onDeleteProjectClicked() {
            if (confirm(`Are you sure you want to delete project "${this.project.name}"? You will loose all schemes created in this project`)) {
                apiClient.deleteProject(this.projectId)
                .then(() => {
                    window.location = '/';
                }).catch(err => {
                    alert('Sorry, could not delete project. Something went wrong.');
                });
            }
        },

        onSchemeClick(event, scheme) {
            if (this.isEditingProject) {
                event.preventDefault();
                event.stopPropagation();

                this.schemeStates[scheme.id].checked = !this.schemeStates[scheme.id].checked;

                if (find(this.schemeStates, state => state.checked))  {
                    this.hasSelectedAnyScheme = true;
                } else {
                    this.hasSelectedAnyScheme = false;
                }
                this.$forceUpdate();
                return false;
            }
            return true;
        },

        deleteSectedSchemes() {
            if (!this.hasSelectedAnyScheme) {
                return;
            }

            const schemesToDelete = [];
            forEach(this.searchResult.results, scheme => {
                if (this.schemeStates[scheme.id] && this.schemeStates[scheme.id].checked) {
                    schemesToDelete.push(scheme);
                }
            });
            if (schemesToDelete.length > 0) {
                this.schemeDeleteModal.schemes = schemesToDelete;
                this.schemeDeleteModal.errorMessage = null;
                this.schemeDeleteModal.shown = true;
            }
        },

        onDeleteSchemesSubmited() {
            const schemeIds = [];
            forEach(this.schemeDeleteModal.schemes, scheme => {
                schemeIds.push(scheme.id);
            });
            apiClient.deleteMultipleSchemes(this.projectId, schemeIds)
            .then(() => {
                this.schemeDeleteModal.shown = false;
                this.searchSchemes();
            }).catch(err => {
                this.schemeDeleteModal.errorMessage = 'Failed to delete schemes';
            });
        }
    },

    filters: {
        shortDescription(text) {
            // first replacing paragraphs with white space. Otherwise it will join both sentences without a space
            const sanitizedText = text.replace(/<p>/g, ' ').replace(/<[^>]+>/g, '');
            if (sanitizedText.length > 200) {
                return sanitizedText.substr(0, 200) + '...';
            } else {
                return sanitizedText;
            }
        },
        formatDateAndTime(dateInMillis) {
            return utils.formatDateAndTime(dateInMillis);
        }
    },

    watch:{
        $route(to, from) {
            this.init();
        },

        currentView(view) {
            settingsStorage.save('currentView', view);
        },

        isEditingProject(is) {
            if (is) {
                this.updateSchemeStates();
            }
        }
    },

    computed: {
        createCategoryModalTitle() {
            if (this.createCategoryModal.parentCategory) {
                return `Create sub-category for "${this.createCategoryModal.parentCategory.name}"`;
            }
            return 'Create category';
        },

        hasWritePermission() {
            if (this.project) {
                return this.project.permissions.write;
            }
            return false;
        }
    }
}
</script>

<style lang="css">
</style>
