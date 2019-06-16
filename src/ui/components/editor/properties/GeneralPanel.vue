<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="General">

        <div>
            <input type="checkbox" v-model="item.interactive">
            <span class="property-label">Interactive</span>
        </div>

        <div v-if="nameUsed">
            <h5>Name</h5>
            <input class="textfield" type="text" v-model="item.name"/>
        </div>

        <div v-if="tagsUsed">
            <h5>Tags</h5>
            <vue-tags-input v-model="itemTag"
                :tags="itemTags"
                :autocomplete-items="filteredItemTags"
                @tags-changed="onItemTagChange"
                ></vue-tags-input>
        </div>
        <div v-if="descriptionUsed">
            <h5 class="section">Description</h5>
            <div class="textarea-wrapper">
                <rich-text-editor v-model="item.description" @changed="item.description = arguments[0];" ></rich-text-editor>
            </div>
        </div>
    </panel>
</template>

<script>
import _ from 'lodash';
import RichTextEditor from '../../RichTextEditor.vue';
import Panel from '../Panel.vue';
import VueTagsInput from '@johmun/vue-tags-input';
import apiClient from '../../../apiClient.js';

export default {
    props: {
        'item': {type: Object},
        'nameUsed': {type: Boolean, default: true},
        'tagsUsed': {type: Boolean, default: true},
        'descriptionUsed': {type: Boolean, default: true}
    },

    components: {VueTagsInput, Panel, RichTextEditor},

    mounted() {
        if (this.tagsUsed) {
            apiClient.getTags().then(tags => {
                this.existingItemTags = _.map(tags, tag => {
                    return {text: tag};
                });
            });
        }
    },

    data() {
        return {
            itemTag: '',
            existingItemTags: []
        };
    },

    methods: {
        onItemTagChange(newTags) {
            this.item.tags = _.map(newTags, tag => tag.text);
        },
    },

    computed: {
        filteredItemTags() {
            return this.existingItemTags.filter(i => new RegExp(this.itemTag, 'i').test(i.text));
        },
        itemTags() {
            return _.map(this.item.tags, tag => {return {text: tag}});
        }
    },
}
</script>