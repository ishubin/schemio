<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Search Schemes" @close="$emit('close')">
        <h5>Name</h5>
        <input type="text" class="textfield" v-model="query"/>


        <div v-if="searchResult" style="height: 300px; overflow: scroll;">
            <paginate
                v-model="currentPage"
                :page-count="totalPages"
                :page-range="3"
                :margin-pages="2"
                :click-handler="selectSearchPage"
                :prev-text="'<'"
                :next-text="'>'"
                :container-class="'pagination'"
                :page-class="'page-item'">
            </paginate>
            <div v-for="scheme in searchResult.results">
                <span class="link" @click="onSchemeSelect(scheme)">{{scheme.name}}</span>
                <span class="tag" v-for="tag in scheme.tags">{{tag}}</span>
            </div>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import Paginate from 'vuejs-paginate';
import apiClient from '../../apiClient.js';

export default {
    components: {Modal, Paginate},

    mounted() {
        this.reloadSchemes();
    },
    data() {
        return {
            query: '',
            currentPage: 1,
            totalPages: 0,
            searchResult: null,
            searchTimerId: null
        };
    },
    methods: {
        selectSearchPage(page) {
            this.reloadSchemes(page);
        },

        onSchemeSelect(scheme) {
            this.$emit('selected-scheme', scheme);
        },

        reloadSchemes(page) {
            var offset = 0;
            if (this.searchResult) {
                if (page > 0) {
                    offset = (page - 1) * this.searchResult.resultsPerPage;
                }
            }
            apiClient.findSchemes({
                query: this.query,
                offset: offset
            }).then(searchResponse => {
                this.searchResult = searchResponse;
                this.totalPages = Math.ceil(searchResponse.total / searchResponse.resultsPerPage);
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
