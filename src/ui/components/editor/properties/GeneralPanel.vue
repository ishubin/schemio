<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="General">

        <h5>Name</h5>
        <input class="textfield" type="text" v-model="item.name" @input="commitSchemeChange('name')"/>

        <div>
            <h5>Tags</h5>
            <vue-tags-input v-model="itemTag"
                :tags="itemTags"
                :autocomplete-items="filteredItemTags"
                @tags-changed="onItemTagChange"
                ></vue-tags-input>
        </div>

        <div v-if="descriptionType === 'rich'">
            <h5 class="section">Description</h5>
            <div class="textarea-wrapper">
                <rich-text-editor :id="item.id" :value="item.description" @changed="item.description = arguments[0]; commitSchemeChange('description')" ></rich-text-editor>
            </div>
        </div>

        <div v-if="textType === 'rich'">
            <h5 class="section">Text</h5>
            <div class="textarea-wrapper">
                <rich-text-editor :id="item.id" :value="item.text" @changed="item.text = arguments[0]; commitSchemeChange('text')" ></rich-text-editor>
            </div>
        </div>
        <div v-if="textType === 'simple'">
            <h5 class="section">Text</h5>
            <div class="textarea-wrapper">
                <textarea :value="item.text" @input="item.text = arguments[0].target.value; commitSchemeChange('text')"></textarea>
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
import EventBus from '../EventBus';
import Shape from '../items/shapes/Shape';

export default {
    props: {
        'projectId': {type: String},
        'item': {type: Object}
    },

    components: {VueTagsInput, Panel, RichTextEditor},

    mounted() {
        if (this.tagsUsed) {
            apiClient.getTags(this.projectId).then(tags => {
                this.existingItemTags = _.map(tags, tag => {
                    return {text: tag};
                });
            });
        }
    },

    data() {
        const shapeComponent = Shape.find(this.item.shape);
        let descriptionType = 'rich';
        let textType = 'rich';
        if (shapeComponent && shapeComponent.editorProps) {
            if (shapeComponent.editorProps.description) {
                descriptionType = shapeComponent.editorProps.description;
            }
            if (shapeComponent.editorProps.text) {
                textType = shapeComponent.editorProps.text;
            }
        }

        return {
            itemTag: '',
            existingItemTags: [],
            shapeComponent: shapeComponent,
            descriptionType,
            textType
        };
    },

    methods: {
        onItemTagChange(newTags) {
            this.item.tags = _.map(newTags, tag => tag.text);
        },

        commitSchemeChange(propertyName) {
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${propertyName}`);
            EventBus.emitItemChanged(this.item.id, propertyName);
        }
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
