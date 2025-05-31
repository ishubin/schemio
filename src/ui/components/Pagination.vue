<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template lang="html">
    <div class="pagination-container">
        <ul v-if="pages.length > 1" class="pagination">
            <li>
                <span v-if="currentPage > 1">
                    <router-link v-if="useRouter" :to="{path: urlForPage(currentPage - 1)}"><i class="fas fa-chevron-circle-left"></i></router-link>
                    <a v-else @click="onNonRoutablePageClicked($event, currentPage - 1)" href="#"><i class="fas fa-chevron-circle-left"></i></a>
                </span>
                <span v-else><i class="fas fa-chevron-circle-left"></i></span>
            </li>

            <li v-for="page in pages">
                <span v-if="page.active">
                    <router-link v-if="useRouter" :to="{path: urlForPage(page.page)}">{{page.page}}</router-link>
                    <a v-else @click="onNonRoutablePageClicked($event, page.page)" :class="{'current': currentPage === page.page}" href="#">{{page.page}}</a>
                </span>
                <span v-else>{{page.page}}</span>
            </li>

            <li>
                <span v-if="currentPage < totalPages">
                    <router-link v-if="useRouter" :to="{path: urlForPage(currentPage + 1)}"><i class="fas fa-chevron-circle-right"></i></router-link>
                    <a v-else @click="onNonRoutablePageClicked($event, currentPage + 1)" href="#"><i class="fas fa-chevron-circle-right"></i></a>
                </span>
                <span v-else><i class="fas fa-chevron-circle-right"></i></span>
            </li>
        </ul>
    </div>

</template>

<script>
export default {
    props: {
        currentPage:    {type: Number, default: 1},
        totalPages:     {type: Number, default: 1},
        urlPrefix:      {type: String, default: null},
        useRouter:     {type: Boolean, default: false}
    },

    data() {
        let pageUrlPrefix = this.urlPrefix;
        if (pageUrlPrefix) {
            if (pageUrlPrefix.indexOf('?') > 0) {
                pageUrlPrefix += '&';
            } else {
                pageUrlPrefix += '?';
            }
            pageUrlPrefix += 'page=';
        }

        return {
            pages: this.buildPages(this.currentPage, this.totalPages),
            pageUrlPrefix
        };
    },

    methods: {
        urlForPage(page) {
            if (this.urlPrefix) {
                return this.pageUrlPrefix + page;
            } else {
                return '#';
            }
        },

        // This event is only triggered in case useRouter is false
        onNonRoutablePageClicked(event, page) {
            event.preventDefault();
            this.$emit('page-clicked', page);
            return false;
        },

        buildPages(currentPage, totalPages) {
            currentPage = Math.min(currentPage, totalPages);
            let pages = [];
            let maxSideRange = 2;
            let start = currentPage - maxSideRange;
            let end = currentPage + maxSideRange;

            // trying to keep constant number of pages shown in pagination
            if (start < 1) {
                end += 1 - start;
            } else if (end > totalPages) {
                start -= end - totalPages;
            }

            start = Math.max(1, start);
            end = Math.min(totalPages, end);

            //we should always have page 1 to be able to jump to the beginning of search
            if (start > 1) {
                pages.push({
                    page: '1',
                    active: true
                });
            }
            if (start > 2) {
                pages.push({
                    page: '...',
                    active: false
                });
            }

            for (let page = start; page <= end; page++) {
                pages.push({
                    page: page,
                    active: page !== currentPage
                });
            }

            if (end < totalPages - 1) {
                pages.push({
                    page: '...',
                    active: false
                });
            }

            return pages;
        }
    },

    watch: {
        currentPage(currentPage) {
            this.pages = this.buildPages(currentPage, this.totalPages);
        }
    }
}
</script>
