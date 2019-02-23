<template lang="html">
    <div>
        <div class="menu">
            <div class="menu-caption">
                <a href="/">Schemio</a>
            </div>
            <ul>
                <li>
                    <span @click="openNewSchemePopup"><i class="far fa-file-alt"></i> New Scheme</span>
                </li>
            </ul>

            <div class="top-right-panel">
                <div v-if="user">
                    <a href="/user/logout">Logout</a>
                </div>
                <div v-else>
                    <a :href="'/login?redirect=' + originalUrlEncoded">Login</a>
                </div>
            </div>
        </div>
        <div class="content-wrapper">
            <ul class="category-breadcrumb" v-if="category">
                <li>
                    <a href="/">Home</a>
                    <i class="fas fa-angle-right"></i>
                </li>
                <li v-for="parentCategory in category.ancestors">
                    <a :href="'?category='+parentCategory.id">{{parentCategory.name}}</a>
                    <i class="fas fa-angle-right"></i>
                </li>
                <li>
                    <a :href="'?category='+category.id">{{category.name}}</a>
                </li>
            </ul>
            <h3>Categories</h3>
            <ul class="categories" v-if="category">
                <li v-for="childCategory in category.childCategories">
                    <a class="category link" :href="'?category='+childCategory.id"><i class="fas fa-book-reader"></i> <span>{{childCategory.name}}</span></a>
                </li>
            </ul>

            <h3>Schemes</h3>
            <ul class="schemes">
                <li v-for="scheme in schemes">
                    <a class="scheme link" :href="'/schemes/'+scheme.id"><i class="fas fa-project-diagram"></i> <span>{{scheme.name}}</span></a>
                    <span class="timestamp">{{scheme.modifiedDate | formatDateAndTime}}</span>
                    <div class="scheme-description">
                        {{scheme.description | shortDescription}}
                    </div>
                </li>
            </ul>
        </div>
        <create-new-scheme-modal v-if="newSchemePopup.show" :categories="newSchemePopup.categories"
            @close="newSchemePopup.show = false"
            @scheme-created="openNewSchemePopupSchemeCreated"
            ></create-new-scheme-modal>
    </div>
</template>

<script>
import apiClient from '../apiClient.js';
import _ from 'lodash';
import utils from '../utils.js';
import CreateNewSchemeModal from '../components/createNewSchemeModal.vue';


export default {
    components: {CreateNewSchemeModal},
    mounted() {
        this.loadCurrentUser();
        this.loadCategories();
        this.loadSchemes();
    },
    data() {
        return {
            user: null,
            originalUrlEncoded: encodeURIComponent(window.location),
            categoryId: this.$route.query.category,
            newSchemePopup: {
                categories: [],
                show: false
            },
            category: [],
            schemes: []
        }
    },
    methods: {
        loadCurrentUser() {
            apiClient.getCurrentUser().then(user => {
                this.user = user;
            });
        },

        loadCategories() {
            apiClient.getCategory(this.categoryId).then(category => {
                this.category = category;
            });
        },

        loadSchemes() {
            apiClient.getSchemesInCategory(this.categoryId).then(result => {
                this.schemes = result.results;
            });
        },

        openNewSchemePopup() {
            if (this.category && this.category.id) {
                var categories = _.map(this.category.ancestors, ancestor => {
                    return {name: ancestor.name, id: ancestor.id};
                });

                categories.push({
                    name: this.category.name,
                    id: this.category.id
                });
                this.newSchemePopup.categories = categories;
            } else {
                this.newSchemePopup.categories = [];
            }
            this.newSchemePopup.show = true;
        },

        openNewSchemePopupSchemeCreated(scheme) {
            this.newSchemePopup.show = false;
            window.location.href = `/schemes/${scheme.id}`;
        }
    },
    filters: {
        shortDescription(text) {
            if (text.length > 200) {
                return text.substr(0, 200) + '...';
            } else {
                return text;
            }
        },
        formatDateAndTime(dateInMillis) {
            return utils.formatDateAndTime(dateInMillis);
        }
    }
}
</script>

<style lang="css">
</style>
