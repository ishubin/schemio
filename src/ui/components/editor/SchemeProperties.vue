<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <div v-if="schemeContainer.scheme">
            <panel name="General">
                <h5 class="section">Name</h5>
                <input class="textfield" type="text" v-model="schemeContainer.scheme.name" placeholder="Title ..." @change="onPropertyChange('name')"/>

                <h5 class="section" v-if="schemeTagsEnabled">Tags</h5>
                <vue-tags-input v-if="schemeTagsEnabled" v-model="schemeTag"
                    :tags="schemeTags"
                    :autocomplete-items="filteredSchemeTags"
                    @tags-changed="onSchemeTagChange"
                    ></vue-tags-input>

                <h5 class="section">Description</h5>
                <rich-text-editor :value="schemeContainer.scheme.description"
                    @changed="schemeContainer.scheme.description = arguments[0]; onPropertyChange('description')"
                    ></rich-text-editor>
            </panel>

            <panel name="Screen Settings">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">
                                Draggable
                                <tooltip>
                                    Allows users to drag screen using mouse in view mode.
                                </tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input type="checkbox" v-model="screenSettings.draggable" id="chk-screen-draggable"/>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Style">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Background</td>
                            <td class="value" width="50%">
                                <color-picker :editorId="editorId" :color="schemeContainer.scheme.style.backgroundColor" @input="onSchemeStylePropertyChange('backgroundColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Grid</td>
                            <td class="value" width="50%">
                                <color-picker :editorId="editorId" :color="schemeContainer.scheme.style.gridColor" @input="onSchemeStylePropertyChange('gridColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Bound box</td>
                            <td class="value" width="50%">
                                <color-picker :editorId="editorId" :color="schemeContainer.scheme.style.boundaryBoxColor" @input="onSchemeStylePropertyChange('boundaryBoxColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Control points</td>
                            <td class="value" width="50%">
                                <color-picker :editorId="editorId" :color="schemeContainer.scheme.style.controlPointsColor" @input="onSchemeStylePropertyChange('controlPointsColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Operations">
                <span v-if="supportsSchemeDeletion" class="btn btn-danger" @click="$emit('delete-diagram-requested')">Delete Diagram</span>
            </panel>

        </div>
    </div>
</template>

<script>
import VueTagsInput from '@sipec/vue3-tags-input';
import RichTextEditor from '../RichTextEditor.vue';
import ColorPicker from '../editor/ColorPicker.vue';
import Panel from '../editor/Panel.vue';
import {map, indexOf} from '../../collections';
import Tooltip from '../Tooltip.vue';
import EditorEventBus from './EditorEventBus.js';

export default {
    props: {
        editorId         : {type: String, required: true},
        schemeContainer  : { type: Object },
        schemeTagsEnabled: { type: Boolean, default: true },
    },
    components: {VueTagsInput, RichTextEditor, ColorPicker, Panel, Tooltip},
    mounted() {
        if (this.$store.state.apiClient && this.$store.state.apiClient.getTags) {
            this.$store.state.apiClient.getTags().then(tags => {
                this.existingSchemeTags = map(tags, tag => {
                    return {text: tag};
                });
            });
        }
    },

    beforeDestroy() {
    },
    data() {
        return {
            schemeTag: '',
            existingSchemeTags: [],
            showDeleteSchemeWarning: false,

            screenSettings: {
                draggable: this.schemeContainer.scheme.settings.screen.draggable
            },
        }
    },

    methods: {
        onSchemeStylePropertyChange(fieldName, value) {
            this.schemeContainer.scheme.style[fieldName] = value;
            this.onPropertyChange(`scheme.style.${fieldName}`);
        },

        onSchemeTagChange(newTags) {
            this.schemeContainer.scheme.tags = map(newTags, tag => tag.text);
            this.onPropertyChange('tags');
        },

        onPropertyChange(propertyName) {
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scheme.${propertyName}`);
        },
    },

    computed: {
        filteredSchemeTags() {
            const lowerText = this.schemeTag.toLowerCase();
            return this.existingSchemeTags.filter(tag => {
                return tag.text.toLowerCase().indexOf(lowerText) >= 0;
            });
        },
        schemeTags() {
            return map(this.schemeContainer.scheme.tags, tag => {return {text: tag}});
        },

        supportsSchemeDeletion() {
            return this.$store.state.apiClient && this.$store.state.apiClient.deleteScheme;
        }
    },

    watch: {
        'screenSettings.draggable': {
            handler(value) {
                this.schemeContainer.scheme.settings.screen.draggable = value;
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, 'scheme.settings.screen.draggable');
            }
        }
    }
}
</script>

<style lang="css">
</style>
