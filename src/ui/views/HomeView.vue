<template>
    <div>
        <header-component>
            <div slot="middle-section">
                <router-link v-if="currentUser" :to="{path: '/create-project'}"><i class="far fa-folder"></i> Create Project</router-link>
            </div>
        </header-component>

        <div class="middle-content">
            <div>
                <input @keyup.enter="onSearchClicked()" class="textfield" style="width: 300px" type="text" v-model="query" placeholder="Search ..."/>
                <span @click="onSearchClicked()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
            </div>
            <div v-if="searchResult">
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
                        <router-link :to="{path: `/projects/${project.id}`}">
                            <a class="project link">
                                {{project.name}}
                            </a>
                        </router-link>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
<script>
import HeaderComponent from '../components/Header.vue';
import Pagination from '../components/Pagination.vue';
import apiClient from '../apiClient.js';
import utils from '../utils.js';

//TODO Align it with the server side
const RESULTS_PER_PAGE = 20;

export default {
    components: {HeaderComponent, Pagination},

    mounted() {
        this.init();
    },

    data() {
        const query = this.$route.query.q || '';
        return {
            currentPage: parseInt(this.$route.query.page) || 1,
            query: query,
            searchResult: null,
            currentPage: 1,
            totalPages: 0,
            urlPrefix: `/?q=${encodeURIComponent(query)}`
        };
    },

    methods: {
        init() {
            this.query = this.$route.query.q || '';
            this.currentPage = parseInt(this.$route.query.page) || 1;
            this.urlPrefix = `/?q=${encodeURIComponent(this.query)}`
            this.searchProjects();
        },

        searchProjects() {
            let offset = 0;
            if (this.currentPage > 0) {
                offset = (this.currentPage - 1) * RESULTS_PER_PAGE;
            }
            apiClient.findProjects({
                query: this.query,
                offset: offset
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
            });
        },

        onSearchClicked() {
            this.urlPrefix = `/?q=${encodeURIComponent(this.query)}`;
            let url = `${this.urlPrefix}&page=${this.currentPage}`;
            this.$router.push({path: url});
        },
    },

    computed: {
        currentUser() {
            return this.$store.state.currentUser;
        },
        currentUserName() {
            const user = this.$store.state.currentUser;
            if (user) {
                return user.login;
            }
            return '';
        }
    },

    watch:{
        $route(to, from) {
            this.init();
        }
    }
}
</script>

