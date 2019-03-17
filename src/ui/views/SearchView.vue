<template lang="html">
    <div class="search-editor-view">
        <header-component/>

        <div class="content-wrapper">
            <h3>Schemes</h3>
            <div v-if="searchResult">
                <div class="">
                    <input @keyup.enter="searchSchemes()" class="textfield" style="width: 300px" type="text" v-model="query" placeholder="Search ..."/>
                    <span @click="searchSchemes()" class="btn btn-primary"><i class="fas fa-search"></i> Search</span>
                </div>

                <div>
                    Total results <b>{{searchResult.total}}</b>
                </div>

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

                <ul class="schemes">
                    <li v-for="scheme in searchResult.results">
                        <a class="scheme link" :href="'/schemes/'+scheme.id"><i class="fas fa-project-diagram"></i> <span>{{scheme.name}}</span></a>
                        <span class="timestamp">{{scheme.modifiedDate | formatDateAndTime}}</span>
                        <div class="scheme-description">
                            {{scheme.description | shortDescription}}
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';
import apiClient from '../apiClient.js';
import utils from '../utils.js';
import Paginate from 'vuejs-paginate';

export default {
    components: {HeaderComponent, Paginate},

    mounted() {
        this.searchSchemes();
    },

    data() {
        return {
            query: '',
            offset: 0,
            searchResult: null,
            currentPage: 1,
            totalPages: 0
        };
    },

    methods: {
        searchSchemes() {
            this.selectSearchPage(0);
        },

        selectSearchPage(page) {
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
