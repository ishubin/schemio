<template>
    <div>
        <table class="entries-table">
            <thead>
                <tr>
                    <th>Name</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="entry in entries">
                    <td>
                        <a v-if="entry.kind === 'dir'" :href="`/?path=${entry.encodedPath}`">{{entry.name}}</a>
                        <a v-else :href="`/scheme?path=${entry.encodedPath}`">{{entry.name}}</a>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
import appClient from '../appClient';
import forEach from 'lodash/forEach';

export default {
    
    beforeCreate() {
        appClient.listEntries(this.$route.query.path)
        .then(result => {
            forEach(result.entries, entry => {
                entry.encodedPath = encodeURIComponent(entry.path);
            });
            this.entries = result.entries;

        }).catch(err => {
            this.errorMessage = 'Oops, something went wrong';
        })
    },

    data() {
        return {
            entries: [],
            errorMessage: null
        };
    }
}
</script>