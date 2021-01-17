<template>
    <div class="projects-list">

        <div v-if="loadingProjects">
            Loading <i class="fas fa-spinner fa-spin"></i>
        </div>

        <div class="section search-controls">
            <input ref="searchTextfield" @keyup.enter="onSearchClicked()" class="textfield" type="text" v-model="query" placeholder="Search ..."/>
            <span @click="onSearchClicked()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
        </div>
        <div v-if="searchResult" class="section">
            <div>
                Total results <b>{{searchResult.total}}</b>
            </div>

            <pagination
                :current-page="currentPage"
                :total-pages="totalPages"
                :url-prefix="urlPrefix"
                :use-router="true"
            />

            <ul class="projects">
                <li v-for="project in searchResult.results" :key="project.id">
                    <router-link :to="{path: `/projects/${project.id}`}" class="project link">
                        <i v-if="project.isPublic" class="fas fa-folder"></i> 
                        <i v-else class="fas fa-lock"></i>

                        {{project.name}}
                    </router-link>
                    <div class="project-description">
                        {{project.description}}
                    </div>
                </li>
            </ul>
        </div>

    </div>

</template>

<script>
import Pagination from './Pagination.vue';

import apiClient from '../apiClient';

export default {
    components: { Pagination },

    props: {
        routePrefix: { type: String, default: '/projects' }
    },

    beforeMount() {
        this.init();
    },

    mounted() {
        if (this.$refs.searchTextfield) {
            this.$refs.searchTextfield.focus();
        }
    },

    data() {
        const query = this.$route.query.q || '';
        return {
            loadingProjects: false,

            currentPage: parseInt(this.$route.query.page) || 1,
            query: query,
            searchResult: null,
            currentPage: 1,
            totalPages: 0,
            urlPrefix: `${this.routePrefix}?q=${encodeURIComponent(query)}`,
            resultsPerPage : 20,
        };
    },

    methods: {
        init() {
            this.query = this.$route.query.q || '';
            this.currentPage = parseInt(this.$route.query.page) || 1;
            this.urlPrefix = `${this.routePrefix}?q=${encodeURIComponent(this.query)}`
            this.searchProjects();
        },

        searchProjects() {
            let offset = 0;
            if (this.currentPage > 0) {
                offset = (this.currentPage - 1) * this.resultsPerPage;
            }

            apiClient.findProjects({
                query: this.query,
                offset: offset
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
                this.resultsPerPage = searchResponse.resultsPerPage;
            });
        },

        onSearchClicked() {
            this.urlPrefix = `${this.routePrefix}?q=${encodeURIComponent(this.query)}`;
            let url = `${this.urlPrefix}&page=${this.currentPage}`;
            this.$router.push({path: url});
        },
    },
}
</script>