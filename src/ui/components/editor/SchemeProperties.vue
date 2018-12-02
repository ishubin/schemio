<template lang="html">
    <div class="">
        <div v-if="schemeContainer.scheme">
            <h5 class="section">Name</h5>
            <input class="textfield" type="text" v-model="schemeContainer.scheme.name" placeholder="Scheme name ..."/>

            <h5 class="section">Tags</h5>
            <vue-tags-input v-model="schemeTag"
                :tags="schemeTags"
                :autocomplete-items="filteredSchemeTags"
                @tags-changed="onSchemeTagChange"
                ></vue-tags-input>

            <h5 class="section">Description</h5>
            <textarea class="textfield" type="text" v-model="schemeContainer.scheme.description"></textarea>
        </div>
    </div>
</template>

<script>
import VueTagsInput from '@johmun/vue-tags-input';

export default {
    props: ['schemeContainer'],
    components: {VueTagsInput},
    data() {
        return {
            schemeTag: '',
            //TODO move into indexed tags
            existingSchemeTags: [{text: 'Load Balancer'}, {text: 'Java'}, {text: 'Scalatra'}]
        }
    },

    methods: {
        onSchemeTagChange(newTags) {
            this.schemeContainer.scheme.tags = _.map(newTags, tag => tag.text);
        }
    },

    computed: {
        filteredSchemeTags() {
            return this.existingSchemeTags.filter(i => new RegExp(this.schemeTag, 'i').test(i.text));
        },
        schemeTags() {
            return _.map(this.schemeContainer.scheme.tags, tag => {return {text: tag}});
        }
    },
}
</script>

<style lang="css">
</style>
