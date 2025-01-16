<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="General">
        <h5>Name</h5>
        <input class="textfield" :class="{disabled: isTemplatedChild}" type="text" v-model="item.name" @input="commitSchemeChange('name')" :disabled="isTemplatedChild"/>

        <div v-if="!isTemplatedChild">
            <div>
                <h5>Tags</h5>
                <vue-tags-input v-model="itemTag"
                    :tags="itemTags"
                    :autocomplete-items="filteredItemTags"
                    @tags-changed="onItemTagChange"
                    ></vue-tags-input>
            </div>
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
import {map} from '../../../collections';
import RichTextEditor from '../../RichTextEditor.vue';
import Panel from '../Panel.vue';
import VueTagsInput from '@sipec/vue3-tags-input';
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
            const lowerText = this.itemTag.toLowerCase();
            return this.existingItemTags.filter(tag => {
                return tag.text.toLowerCase().indexOf(lowerText) >= 0;
            });
        },
        itemTags() {
            return map(this.item.tags, tag => {return {text: tag}});
        },

        // determins whether this is a templated item that is not a root of the template
        // Users may change the name of the templated item
        isTemplatedChild() {
            return this.item.args && this.item.args.templated && !this.item.args.templateRef;
        }
    },
}
</script>
