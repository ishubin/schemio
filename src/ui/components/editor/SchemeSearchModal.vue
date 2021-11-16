<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Search Schemes" @close="$emit('close')" :height="600">
        <h5>Name</h5>
        <input type="text" class="textfield" v-model="query"/>


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
            resultsPerPage: 20
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
            this.$store.state.apiClient.findSchemes({
                query: this.query,
                page: page,
                limit: this.resultsPerPage
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = searchResponse.totalPages
            });
        },
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
