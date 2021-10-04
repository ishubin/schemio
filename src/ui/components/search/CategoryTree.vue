<template>
    <div class="project-categories">
        <h4>Categories</h4>

        <div v-if="editAllowed">
            <span class="btn btn-secondary btn-small" title="Add new category" @click="onAddCategoryClicked(null)"><i class="fas fa-folder-plus"></i></span>
        </div>

        <category-tree-leaf
            :categories="categories" 
            :selectedCategoryId="selectedCategoryId"
            :urlPrefix="urlPrefix"
            :editAllowed="editAllowed"
            :maxDepth="maxDepth"
            @add-category="onAddCategoryClicked"
            @edit-category="onEditCategoryClicked"
            @delete-category="onDeleteCategoryClicked"
            @moved-category="onCategoryMoveRequested"
            />
        
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
            <div v-if="moveCategoryModal.errorMessage" class="msg msg-error">{{moveCategoryModal.errorMessage}}</div>
        </modal>
    </div>
</template>
<script>
import CategoryTreeLeaf from './CategoryTreeLeaf.vue';
import Modal from '../Modal.vue';
import forEach from 'lodash/forEach';

export default {
    components: {CategoryTreeLeaf, Modal},

    props: {
        categories           : {type: Array, required: true},
        selectedCategoryId   : {type: String, default: null},
        urlPrefix            : {type: String, default: '/'},
        editAllowed          : {type: Boolean, default: false},
        maxDepth             : {type: Number, default: 10},
        apiClient            : {type: Object, default: null}
    },

    beforeMount() {
        this.enrichAndIndexCategories(this.categories);
    },

    data() {
        return {
            categoriesMap: new Map(),
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
        }
    },

    methods: {
        reloadCategoryTree() {
            return this.$store.state.apiClient.getCategoryTree()
            .then(categories => {
                this.categoriesMap = new Map();
                return this.enrichAndIndexCategories(categories);
            })
            .then(categories => {
                this.categories = categories;
            });
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
            if (newParentCategory !== null) {
                const maxCategoryDepth = this.calculateMaxCategoryDepth(category, 1);
                if (newParentCategory.ancestors.length + maxCategoryDepth + 1 > this.maxDepth) {
                    StoreUtils.addErrorSystemMessage(this.$store, `Cannot move category as maximum categories depth reached`, 'max-category-depth-reached');
                    return;
                }
            }
            this.moveCategoryModal.category = category;
            this.moveCategoryModal.newParentCategory = newParentCategory;
            this.moveCategoryModal.errorMessage = null;
            this.moveCategoryModal.shown = true;
        },
        calculateMaxCategoryDepth(category, currentDepth) {
            let maxDepth = currentDepth;
            if (category.childCategories) {
                forEach(category.childCategories, childCategory => {
                    let maxChildDepth = this.calculateMaxCategoryDepth(childCategory, currentDepth + 1);
                    if (maxDepth < maxChildDepth) {
                        maxDepth = maxChildDepth;
                    }
                })
            }
            return maxDepth;
        },
        onConfirmUpdateCategoryClicked() {
            if (this.editCategoryModal.category) {
                const newName = this.editCategoryModal.categoryName.trim();
                if (newName) {
                    this.$store.state.apiClient.updateCategory(this.editCategoryModal.category.id, {
                        name: newName
                    }).then(() => {
                        this.editCategoryModal.shown = false;
                        return this.reloadCategoryTree()
                    }).catch(err => {
                        this.editCategoryModal.errorMessage = 'Sorry, something went wrong. Please try again later';
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
                this.$store.state.apiClient.moveCategory(this.moveCategoryModal.category.id, destinationCategoryId)
                .then(() => this.reloadCategoryTree())
                .then(() => {
                    this.moveCategoryModal.shown = false;
                    this.categoryTreeRevision += 1;
                }).catch(err => {
                    this.moveCategoryModal.errorMessage = 'Sorry, something went wrong. Please try again later';
                });
            }
        },
        onConfirmDeleteCategoryClicked() {
            if (this.deleteCategoryModal.category) {
                const isCurrentCategoryInDeletedTree = this.currentCategoryId && this.isInCategoryTree(this.currentCategoryId, this.deleteCategoryModal.category);
                this.$store.state.apiClient.deleteCategory(this.deleteCategoryModal.category.id).then(() => {
                    this.deleteCategoryModal.shown = false;
                }).then(() => {
                    if (isCurrentCategoryInDeletedTree) {
                        this.currentCategoryId = null;
                        this.$router.push({path: this.$route.path, query: {}});
                    }
                    return this.reloadCategoryTree();
                })
                .catch(err => {
                    this.deleteCategoryModal.errorMessage = 'Sorry, something went wrong. Please try again later';
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
                this.$store.state.apiClient.createCategory(name, parentCategoryId)
                .then(() => this.reloadCategoryTree())
                .then(() => {
                    this.createCategoryModal.shown = false;
                })
                .catch(err => {
                    this.createCategoryModal.errorMessage = 'Sorry, something went wrong. Please try again later';
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
        enrichAndIndexCategories(categories, parentId, parentCategory) {
            forEach(categories, category => {
                if (parentId) {
                    category.parentId = parentId;
                }
                if (parent) {
                    category.depth = parent.depth + 1;
                } else {
                    category.depth = 1;
                }
                category.ancestors = [];
                if (parentCategory) {
                    category.ancestors = parentCategory.ancestors.concat([{
                        id: parentCategory.id,
                        name: parentCategory.name
                    }]);
                }
                if (this.currentCategoryId === category.id) {
                    this.currentCategory = category;
                }
                if (category.childCategories) {
                    this.enrichAndIndexCategories(category.childCategories, category.id, category);
                }
                this.categoriesMap.set(category.id, category);
            });
            categories.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                } if (a.name > b.name) {
                    return 1;
                }
                return 0;
            })
            return categories;
        },

    },

    computed: {
        createCategoryModalTitle() {
            if (this.createCategoryModal.parentCategory) {
                return `Create sub-category for "${this.createCategoryModal.parentCategory.name}"`;
            }
            return 'Create category';
        },
    }
}
</script>