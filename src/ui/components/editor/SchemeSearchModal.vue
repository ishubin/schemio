<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Search Diagrams" @close="$emit('close')" :height="600">
        <div style="position: relative; margin-bottom: 5px;">
            <div v-if="isLoading" class="loader">
                <div class="loader-element"></div>
            </div>
        </div>

        <h5>Name</h5>

        <input type="text" class="textfield" v-model="query"/>

        <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

        <div v-if="searchResult" style="height: 300px; overflow: scroll;">
            <pagination
                :key="`${currentPage}-${totalPages}`"
                :current-page="currentPage"
                :total-pages="totalPages"
                @page-clicked="selectSearchPage"
            />
            <table class="scheme-search-results">
                <tbody>
                    <tr class="scheme-row" v-for="scheme in searchResult.results"  @click="onSchemeSelect(scheme)">
                        <td class="scheme-icon">
                            <img v-if="scheme.previewURL" class="scheme-preview" :src="`${scheme.previewURL}?v=${scheme.modifiedTime}`"/>
                            <i v-else class="icon far fa-file fa-2x"></i>
                        </td>
                        <td class="scheme-title">{{scheme.name}}</td>
                    </tr>
                </tbody>
            </table>

            <p v-if="nextPageToken && !isLoading" style="text-align: center;">
                <span class="btn btn-primary" @click="loadNextPage">Load more</span>
            </p>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import Pagination from '../Pagination.vue';

export default {
    components: {Modal, Pagination},

    mounted() {
        this.reloadSchemes();
    },
    data() {
        return {
            query: '',
            currentPage: 1,
            totalPages: 0,
            searchResult: null,
            searchTimerId: null,
            resultsPerPage: 20,
            isLoading: false,
            nextPageToken: null,
            errorMessage: null
        };
    },
    methods: {
        selectSearchPage(page) {
            this.currentPage = page;
            this.reloadSchemes(page);
        },

        onSchemeSelect(scheme) {
            this.$emit('selected-scheme', scheme);
        },

        reloadSchemes(page) {
            this.isLoading = true;

            const params = {
                query: this.query,
                limit: this.resultsPerPage
            };
            if (page) {
                params.page = page;
            }

            this.$store.state.apiClient.findSchemes(params)
            .then(searchResponse => {
                this.errorMessage = null;
                this.isLoading = false;
                this.searchResult = searchResponse;
                this.totalPages = searchResponse.totalPages;

                if (searchResponse.kind === 'chunk') {
                    this.nextPageToken = searchResponse.nextPageToken;
                }
            })
            .catch(err => {
                console.error(err);
                this.isLoading = false;
                this.errorMessage = 'Something went wrong, failed to search diagrams';
            });
        },

        loadNextPage() {
            this.isLoading = true;

            const params = {
                query: this.query,
                limit: this.resultsPerPage
            };
            params.nextPageToken = this.nextPageToken;

            this.$store.state.apiClient.findSchemes(params)
            .then(searchResponse => {
                this.errorMessage = null;
                this.isLoading = false;
                this.searchResult.results = this.searchResult.results.concat(searchResponse.results);
                this.nextPageToken = searchResponse.nextPageToken;
            })
            .catch(err => {
                console.error(err);
                this.isLoading = false;
                this.errorMessage = 'Something went wrong, failed to search diagrams';
            });
        }
    },
    watch: {
        query(newQuery) {
            if (!this.searchTimerId) {
                this.searchTimerId = setTimeout(() => {
                    this.searchTimerId = null;
                    this.reloadSchemes(0);
                }, 500);
            }
        }
    }
}
</script>

<style lang="css">
</style>
