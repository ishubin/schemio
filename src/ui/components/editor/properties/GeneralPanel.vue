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

        <div v-if="textType !== 'disabled'" class="textarea-wrapper">
            <h5 class="section">Text</h5>
            <rich-text-editor v-if="textType === 'rich'" :value="item.text" @changed="item.text = arguments[0]; commitSchemeChange('text')" ></rich-text-editor>
            <textarea v-else :value="item.text" @input="item.text = arguments[0].target.value; commitSchemeChange('text')"></textarea>

            <table class="properties-table">
                <tbody>
                    <tr>
                        <td class="label" width="50%">Font</td>
                        <td class="value" width="50%">
                            <dropdown :options="allFonts" :value="item.textProps.font" @selected="item.textProps.font = arguments[0].name; commitSchemeChange('textProps.font')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font Size</td>
                        <td class="value" width="50%">
                            <number-textfield :value="item.textProps.fontSize" @changed="item.textProps.fontSize = arguments[0]; commitSchemeChange('textProps.fontSize')" :min="0"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Horizontal Align</td>
                        <td class="value" width="50%">
                            <select :value="item.textProps.halign" @input="item.textProps.halign = arguments[0].target.value; commitSchemeChange('textProps.halign')">
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Vertical Align</td>
                        <td class="value" width="50%">
                            <select :value="item.textProps.valign" @input="item.textProps.valign = arguments[0].target.value; commitSchemeChange('textProps.valign')">
                                <option value="above">Above</option>
                                <option value="top">Top</option>
                                <option value="middle">Middle</option>
                                <option value="bottom">Bottom</option>
                                <option value="below">Below</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Left</td>
                        <td class="value" width="50%">
                            <number-textfield :value="item.textProps.padding.left" @changed="item.textProps.padding.left = arguments[0]; commitSchemeChange('textProps.padding.left')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Right</td>
                        <td class="value" width="50%">
                            <number-textfield :value="item.textProps.padding.right" @changed="item.textProps.padding.right = arguments[0]; commitSchemeChange('textProps.padding.right')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Top</td>
                        <td class="value" width="50%">
                            <number-textfield :value="item.textProps.padding.top" @changed="item.textProps.padding.top = arguments[0]; commitSchemeChange('textProps.padding.top')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Bottom</td>
                        <td class="value" width="50%">
                            <number-textfield :value="item.textProps.padding.bottom" @changed="item.textProps.padding.bottom = arguments[0]; commitSchemeChange('textProps.padding.bottom')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">White Space</td>
                        <td class="value" width="50%">
                            <select :value="item.textProps.whiteSpace" @input="item.textProps.whiteSpace = arguments[0].target.value; commitSchemeChange('textProps.whiteSpace')">
                                <option :value="option.value" v-for="option in supportedWhiteSpaceOptions">{{option.name}}</option>
                            </select>
                        </td>
                    </tr>
                </tbody>
            </table>

        </div>
    </panel>
</template>

<script>
import {map} from 'lodash';
import RichTextEditor from '../../RichTextEditor.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import Panel from '../Panel.vue';
import VueTagsInput from '@johmun/vue-tags-input';
import apiClient from '../../../apiClient.js';
import EventBus from '../EventBus';
import Shape from '../items/shapes/Shape';
import {getAllFonts} from '../../../scheme/Fonts';
import Dropdown from '../../Dropdown.vue';

export default {
    props: {
        'projectId': {type: String},
        'item': {type: Object}
    },

    components: {VueTagsInput, Panel, RichTextEditor, NumberTextfield, Dropdown},

    mounted() {
        if (this.tagsUsed) {
            apiClient.getTags(this.projectId).then(tags => {
                this.existingItemTags = map(tags, tag => {
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
            textType,
            allFonts: map(getAllFonts(), font => {return {name: font.name, style: {'font-family': font.family}}}),

            supportedWhiteSpaceOptions: [{
                name: 'Wrap', value: 'normal'
            }, {
                name: 'No Wrap', value: 'nowrap'
            }, {
                name: 'Preserved', value: 'pre'
            }, {
                name: 'Preserved + Wrap', value: 'pre-wrap'
            }]
        };
    },

    methods: {
        onItemTagChange(newTags) {
            this.item.tags = map(newTags, tag => tag.text);
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
            return map(this.item.tags, tag => {return {text: tag}});
        }
    },
}
</script>
