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

            <div class="textarea-wrapper">
                <textarea class="textfield" type="text" v-model="schemeContainer.scheme.description"></textarea>
                <span class="textarea-enlarge" @click="showDescriptionInPopup = true"><i class="fas fa-expand"></i></span>

                <markdown-editor-popup v-if="showDescriptionInPopup"
                    :text="schemeContainer.scheme.description"
                    @close="showDescriptionInPopup = false"
                    @changed="schemeContainer.scheme.description = arguments[0]"
                    />
            </div>

            <span class="btn btn-dangerous" @click="showDeleteSchemeWarning = true">Delete Scheme</span>

            <modal v-if="showDeleteSchemeWarning" title="Delete scheme"
                primaryButton="Delete"
                @close="showDeleteSchemeWarning = false"
                @primary-submit="deleteScheme()"
                >
                Are you sure you want to delete <b>{{schemeContainer.scheme.name}}</b> scheme?
            </modal>
        </div>
    </div>
</template>

<script>
import VueTagsInput from '@johmun/vue-tags-input';
import apiClient from '../../apiClient.js';
import MarkdownEditorPopup from '../MarkdownEditorPopup.vue';
import Modal from '../Modal.vue';

export default {
    props: ['schemeContainer'],
    components: {VueTagsInput, MarkdownEditorPopup, Modal},
    mounted() {
        apiClient.getTags().then(tags => {
            this.existingSchemeTags = _.map(tags, tag => {
                return {text: tag};
            });
        });
    },
    data() {
        return {
            schemeTag: '',
            existingSchemeTags: [],

            showDescriptionInPopup: false,
            showDeleteSchemeWarning: false
        }
    },

    methods: {
        onSchemeTagChange(newTags) {
            this.schemeContainer.scheme.tags = _.map(newTags, tag => tag.text);
        },

        deleteScheme() {
            apiClient.deleteScheme(this.schemeContainer.scheme.id).then(() => {
                window.location = '/';
            });
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
