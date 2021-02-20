<template>
    <div class="projects-list">

        <div class="section search-controls">
            <input ref="searchTextfield" @keyup.enter="onSearchClicked()" class="textfield" type="text" v-model="query" placeholder="Search ..."/>

            <span v-if="loadingProjects" @click="onSearchClicked()" class="btn btn-primary search-button"><i class="fas fa-spinner fa-spin"></i> Searching...</span>
            <span v-else @click="onSearchClicked()" class="btn btn-primary search-button"><i class="fas fa-search"></i> Search</span>
        </div>

        <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

        <div v-if="loadingProjects" class="mock-container mock-projects-list section">
            <div v-for="i in [0, 1, 2]" class="mock-project">
                <div class="mock-project-header">
                    <span class="mock-element mock-project-icon"></span>
                    <span class="mock-element mock-project-title mock-animated"></span>
                </div>
                <span class="mock-element mock-project-description mock-animated"></span>
            </div>
        </div>
        <div v-else-if="searchResult" class="section">
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
                    <div class="project-header">
                        <router-link class="project link" :to="{path: `/projects/${project.id}`}">
                            <i v-if="!project.isPublic" class="fas fa-lock"></i> 
                            {{project.name}}
                        </router-link>
                        <span class="project-owner">
                            <img v-if="project.ownerGravatarId" class="avatar" :src="`https://www.gravatar.com/avatar/${project.ownerGravatarId}?s=30`" alt="Gravatar icon"/>
                            <router-link class="link" v-if="project.ownerName && project.ownerId" :to="{path: `/users/${project.ownerId}`}">
                                {{project.ownerName}}
                            </router-link>
                        </span>
                    </div>
                    <div class="project-description">
                        {{project.description}}
                    </div>
                    <div class="project-footer">
                        <span class="project-time"><i class="far fa-clock"></i> {{project.createdTime | formatDateTime }}</span>
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
        userId: { type: String, default: null },
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
                userId: this.userId,
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