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
                <rich-text-editor :value="item.description" @changed="item.description = arguments[0]; commitSchemeChange('description')" ></rich-text-editor>
            </div>
        </div>
    </panel>
</template>

<script>
import map from 'lodash/map';
import RichTextEditor from '../../RichTextEditor.vue';
import Panel from '../Panel.vue';
import VueTagsInput from '@johmun/vue-tags-input';
import EditorEventBus from '../EditorEventBus';
import Shape from '../items/shapes/Shape';

export default {
    props: {
        editorId: {type: String, required: true},
        item: {type: Object},
        schemeContainer: {type: Object}
    },

    components: {VueTagsInput, Panel, RichTextEditor},

    data() {
        const shapeComponent = Shape.find(this.item.shape);
        let descriptionType = 'rich';
        if (shapeComponent && shapeComponent.editorProps) {
            if (shapeComponent.editorProps.description) {
                descriptionType = shapeComponent.editorProps.description;
            }
        }

        return {
            itemTag: '',
            existingItemTags: map(this.schemeContainer.itemTags, tag => {return {text: tag}}),
            shapeComponent: shapeComponent,
            descriptionType,
        };
    },

    methods: {
        onItemTagChange(newTags) {
            this.$emit('tags-changed', map(newTags, tag => tag.text));
        },

        commitSchemeChange(propertyName) {
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.${propertyName}`);
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, propertyName);
        }
    },

    computed: {
        filteredItemTags() {
            return this.existingItemTags.filter(i => new RegExp(this.itemTag, 'i').test(i.text));
        },
        itemTags() {
            return map(this.item.tags, tag => {return {text: tag}});
        }
    },
}
</script>
