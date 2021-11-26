<template>
    <div>
        <Header>
            <div slot="middle-section">
            </div>
        </Header>


        <div class="middle-content">
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
            </div>
        </div>
    </div>
</template>

<script>
import Header from '../components/Header.vue';
import Pagination from '../../components/Pagination.vue';
import { createApiClient, createStaticClient } from '../apiClient';

function toPageNumber(text) {
    const page = parseInt(text);
    if (!isNaN(page) && page !== undefined) {
        return Math.max(1, page);
    }
    return 1;
}

export default {
    components: {Header, Pagination},

    beforeMount() {
        this.apiClient.findSchemes({
            query: this.query,
            page: this.page
        }).then(result => {
            this.searchResult = result;

            this.$nextTick(() => {
                this.$refs.searchField.focus();
            });
        });
    },

    data() {
        const query = this.$route.query.q;
        const page = toPageNumber(this.$route.query.page);
        return {
            query,
            page,
            searchResult: null,
            apiClient: this.useStaticClient ? createStaticClient('') : createApiClient()
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
        }
    }

}
</script>
