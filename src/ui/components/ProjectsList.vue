<template>
    <div class="projects-list">

        <div class="section search-controls">
            <input ref="searchTextfield" @keyup.enter="onSearchClicked()" class="textfield" type="text" v-model="query" placeholder="Search ..."/>

            <span v-if="loadingProjects" @click="onSearchClicked()" class="btn btn-primary search-button"><i class="fas fa-spinner fa-spin"></i> Searching...</span>
            <span v-else @click="onSearchClicked()" class="btn btn-primary search-button"><i class="fas fa-search"></i> Search</span>
        </div>

        <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

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
            errorMessage: null,

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

            this.errorMessage = null;
            this.loadingProjects = true;
            apiClient.findProjects({
                query: this.query,
                offset: offset
            }).then(searchResponse => {
                this.loadingProjects = false;
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
                this.resultsPerPage = searchResponse.resultsPerPage;
            })
            .catch(err => {
                this.loadingProjects = false;
                this.errorMessage = 'Ops, failed to search for projects, please retry again';
            });
        },

        onSearchClicked() {
            this.urlPrefix = `${this.routePrefix}?q=${encodeURIComponent(this.query)}`;

            // using unique id to make sure that the request is always sent even if path hasn't changed
            const uniqueId = Math.round(Math.random() * 10000000);

            let url = `${this.urlPrefix}&page=${this.currentPage}&_t=${uniqueId}`;
            this.$router.push({path: url});
        },
    },
}
</script>