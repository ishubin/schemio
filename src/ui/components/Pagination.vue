<template lang="html">
    <div class="pagination-container">
        <ul class="pagination">
            <li>
                <a v-if="currentPage > 1" @click="onPageClicked(currentPage - 1)" :href="urlForPage(currentPage - 1)"><i class="fas fa-chevron-circle-left"></i></a>
                <span v-else><i class="fas fa-chevron-circle-left"></i></span>
            </li>

            <li v-for="page in pages">
                <a v-if="page.active" @click="onPageClicked(page.page)" :class="{'current': currentPage === page.page}" :href="urlForPage(page.page)">{{page.page}}</a>
                <span v-else>{{page.page}}</span>
            </li>

            <li>
                <a v-if="currentPage < totalPages" @click="onPageClicked(currentPage + 1)" :href="urlForPage(currentPage + 1)"><i class="fas fa-chevron-circle-right"></i></a>
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
        urlPrefix:      {type: String, default: null}
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

        console.log(this.currentPage, this.totalPages);
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

        onPageClicked(page) {
            if (this.urlPrefix) {
                return true;
            } else {
                this.$emit('page-clicked', page);
                return false;
            }
        },

        buildPages(currentPage, totalPages) {
            currentPage = Math.min(currentPage, totalPages);
            let pages = [];
            let maxSideRange = 2;
            let start = currentPage - maxSideRange;
            let end = currentPage + maxSideRange;

            // trying to keep contant number of pages shown in pagination
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
                    active: true
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
    }
}
</script>
