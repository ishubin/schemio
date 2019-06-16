<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="">
        <div v-if="schemeContainer.scheme">
            <h5 class="section">Name</h5>
            <input class="textfield" type="text" v-model="schemeContainer.scheme.name" placeholder="Scheme name ..." @change="onPropertyChange('name')"/>

            <h5 class="section">Tags</h5>
            <vue-tags-input v-model="schemeTag"
                :tags="schemeTags"
                :autocomplete-items="filteredSchemeTags"
                @tags-changed="onSchemeTagChange"
                ></vue-tags-input>

            <h5 class="section">Description</h5>
            <rich-text-editor v-model="schemeContainer.scheme.description"
                @changed="schemeContainer.scheme.description = arguments[0]; onPropertyChange('description')"
                ></rich-text-editor>

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
import EventBus from './EventBus.js';
import Modal from '../Modal.vue';
import RichTextEditor from '../RichTextEditor.vue';

export default {
    props: ['schemeContainer'],
    components: {VueTagsInput, Modal, RichTextEditor},
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
            showDeleteSchemeWarning: false
        }
    },

    methods: {
        onSchemeTagChange(newTags) {
            this.schemeContainer.scheme.tags = _.map(newTags, tag => tag.text);
            this.onPropertyChange('tags');
        },

        onPropertyChange(propertyName) {
            EventBus.$emit(EventBus.SCHEME_PROPERTY_CHANGED, propertyName);
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
