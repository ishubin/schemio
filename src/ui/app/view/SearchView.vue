<template>
    <div>
        <schemio-header>
            <div slot="loader">
                <div v-if="isLoading" class="loader">
                    <div class="loader-element"></div>
                </div>
            </div>
        </schemio-header>


        <div class="middle-content">

            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

            <div v-if="searchResult">
                <div class="search-panel">
                    <input ref="searchField" type="text" v-model="query" class="textfield" @keydown.enter="toggleSearch"/>
                    <span class="btn btn-primary" @click="toggleSearch">
                        <i class="fas fa-search"></i> Search
                    </span>
                </div>

                Total results: {{searchResult.totalResults}}
                <Pagination
                    :currentPage="page"
                    :totalPages="searchResult.totalPages"
                    :urlPrefix="`/search?q=${encodeURIComponent(query)}`"
                    :useRouter="true"
                />

                <table class="entries-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Modified</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, entryIdx) in searchResult.results">
                            <td>
                                <router-link class="entry-link" :to="`/docs/${entry.id}`">
                                    <img v-if="entry.previewURL" class="scheme-preview" :src="`${entry.previewURL}?v=${entry.encodedTime}`"/>
                                    <i v-else class="icon far fa-file fa-2x"></i>
                                    <span class="entry-link-text">{{entry.name}}</span>
                                </router-link>
                            </td>
                            <td class="time-column">
                                <span v-if="entry.modifiedTime">{{entry.modifiedTime | formatDateTime }}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <p v-if="nextPageToken && !isLoading" style="text-align: center;">
                    <span class="btn btn-primary" @click="loadNextPage">Load more</span>
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import Pagination from '../../components/Pagination.vue';
import { createApiClientForType } from '../apiClient';

function toPageNumber(text) {
    const page = parseInt(text);
    if (!isNaN(page) && page !== undefined) {
        return Math.max(1, page);
    }
    return 1;
}

export default {
    components: {Pagination},

    props: {
        apiClientType  : {type: String, default: 'fs'},
    },

    beforeMount() {
        this.loadNextPage();
    },

    data() {
        const query = this.$route.query.q;
        const page = toPageNumber(this.$route.query.page);
        return {
            query,
            page,
            isLoading: true,
            searchResult: null,
            apiClient: null,
            nextPageToken: null,
            errorMessage: null,
        };
    },

    methods: {
        toggleSearch() {
            this.$router.push({
                path: '/search',
                query: {
                    q: this.query,
                    page: 1
                }
            });
        },

        loadNextPage() {
            this.isLoading = true;
            createApiClientForType(this.apiClientType)
            .then(apiClient => {
                this.apiClient = apiClient;
                const params = {
                    query: this.query,
                    page: this.page
                };

                if (this.nextPageToken) {
                    params.nextPageToken = this.nextPageToken;
                }
                return apiClient.findSchemes(params);
            })
            .then(result => {
                this.isLoading = false;
                this.errorMessage = null;

                if (this.searchResult && result.kind === 'chunk') {
                    // then appending to previous search result
                    this.searchResult.results = this.searchResult.results.concat(result.results);
                } else {
                    this.searchResult = result;
                }

                if (result.kind === 'chunk') {
                    // this is only supported in drive app
                    this.nextPageToken = result.nextPageToken;
                }

                this.$nextTick(() => {
                    this.$refs.searchField.focus();
                });
            })
            .catch(err => {
                console.error(err);
                this.isLoading = false;
                this.errorMessage = 'Something went wrong, failed to search for your diagrams';
            });

        }
    }

}
</script>
