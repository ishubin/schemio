<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <editor-menu-bar v-if="editor" :editor="editor" v-slot="{ commands, isActive, getMarkAttrs }">
            <div class="rich-text-editor-menubar">
                <span class="editor-icon" :class="{ 'is-active': isActive.bold() }" @click="commands.bold">
                    <i class="fas fa-bold"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.italic() }" @click="commands.italic">
                    <i class="fas fa-italic"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.strike() }" @click="commands.strike">
                    <i class="fas fa-strikethrough"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.underline() }" @click="commands.underline">
                    <i class="fas fa-underline"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.code() }" @click="commands.code">
                    <i class="fas fa-code"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.heading({ level: 1 }) }" @click="commands.heading({level: 1})">
                    H1
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.heading({ level: 2 }) }" @click="commands.heading({level: 2})">
                    H2
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.heading({ level: 3 }) }" @click="commands.heading({level: 3})">
                    H3
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.bullet_list() }" @click="commands.bullet_list">
                    <i class="fas fa-list-ul"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.ordered_list() }" @click="commands.ordered_list">
                    <i class="fas fa-list-ol"></i>
                </span>
                <span class="editor-icon" :class="{ 'is-active': isActive.blockquote() }" @click="commands.blockquote">
                    <i class="fas fa-quote-left"></i>
                </span>
            </div>
        </editor-menu-bar>

        <div v-if="textSlot">
            <table class="properties-table">
                <tbody>
                    <tr>
                        <td class="label" width="50%">Color</td>
                        <td class="value" width="50%">
                            <color-picker :color="textSlot.color" @input="emitTextSlotPropertyChange('color', arguments[0])"></color-picker>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font</td>
                        <td class="value" width="50%">
                            <dropdown :options="allFonts" :value="textSlot.font" @selected="emitTextSlotPropertyChange('font', arguments[0].name)"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font Size</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.fontSize" @changed="emitTextSlotPropertyChange('fontSize', arguments[0])" :min="0"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Horizontal Align</td>
                        <td class="value" width="50%">
                            <ul class="button-group">
                                <li v-for="opt in halignOptions">
                                    <span class="toggle-button" :class="{toggled: textSlot.halign === opt.value}"
                                        :title="opt.name"
                                        @click="emitTextSlotPropertyChange('halign', opt.value)">
                                        <i :class="opt.iconCss"></i>
                                    </span>
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Vertical Align</td>
                        <td class="value" width="50%">
                            <ul class="button-group">
                                <li v-for="opt in valignOptions">
                                    <span class="toggle-button" :class="{toggled: textSlot.valign === opt.value}"
                                        :title="opt.name"
                                        @click="emitTextSlotPropertyChange('valign', opt.value)">
                                        <i :class="opt.iconCss"></i>
                                    </span>
                                </li>
                            </ul>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Left</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.paddingLeft" @changed="emitTextSlotPropertyChange('paddingLeft', arguments[0])"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Right</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.paddingRight" @changed="emitTextSlotPropertyChange('paddingRight', arguments[0])"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Top</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.paddingTop" @changed="emitTextSlotPropertyChange('paddingTop', arguments[0])"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Bottom</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.paddingBottom" @changed="emitTextSlotPropertyChange('paddingBottom', arguments[0])"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">White Space</td>
                        <td class="value" width="50%">
                            <select :value="textSlot.whiteSpace" @input="emitTextSlotPropertyChange('whiteSpace', arguments[0].target.value)">
                                <option :value="option.value" v-for="option in supportedWhiteSpaceOptions">{{option.name}}</option>
                            </select>
                        </td>
                    </tr>
                    <tr v-for="availableTextSlot in availableTextSlots" v-if="slotName !== availableTextSlot">
                        <td colspan="2">
                            <span class="btn btn-secondary" style="width: 100%" @click="onMoveToSlotClicked(availableTextSlot)">Move to "{{availableTextSlot}}" slot</span>
                        </td>
                    </tr>
                </tbody>
            </table>

        </div>
    </div>
</template>

<script>
import EventBus from '../EventBus';
import { EditorMenuBar } from 'tiptap';
import {getAllFonts} from '../../../scheme/Fonts';
import map from 'lodash/map';
import Shape from '../../editor/items/shapes/Shape';
import Dropdown from '../../Dropdown.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import ColorPicker from '../ColorPicker.vue';
import {textWhiteSpaceOptions} from '../../../scheme/Item';

export default {
    props: ['item', 'slotName'],
    components: {EditorMenuBar, Dropdown, NumberTextfield, ColorPicker},

    beforeMount() {
        EventBus.$on(EventBus.ITEM_IN_PLACE_TEXT_EDITOR_CREATED, this.onTextEditorCreated);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EventBus.$off(EventBus.ITEM_IN_PLACE_TEXT_EDITOR_CREATED, this.onTextEditorCreated);
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },
    data() {
        const shape = Shape.find(this.item.shape);

        return {
            editor: null,
            textSlot: this.item.textSlots[this.slotName],
            availableTextSlots: map(shape.getTextSlots(this.item), textSlot => textSlot.name),
            allFonts: map(getAllFonts(), font => {return {name: font.name, style: {'font-family': font.family}}}),
            supportedWhiteSpaceOptions: textWhiteSpaceOptions,

            halignOptions: [{
                name: 'Left', value: 'left', iconCss: 'fas fa-align-left'
            }, {
                name: 'Center', value: 'center', iconCss: 'fas fa-align-center'
            }, {
                name: 'Right', value: 'right', iconCss: 'fas fa-align-right'
            }],

            valignOptions: [{
                name: 'Top', value: 'top', iconCss: 'fas fa-angle-down'
            }, {
                name: 'Middle', value: 'middle', iconCss: 'fas fa-arrows-alt-v'
            }, {
                name: 'Bottom', value: 'bottom', iconCss: 'fas fa-angle-up'
            }],

        };
    },
    methods: {
        onItemChanged(propertyPath) {
            if (propertyPath && propertyPath.startsWith('textSlots.')) {
                this.textSlot = this.item.textSlots[this.slotName];
                this.$forceUpdate();
            }
        },
        onTextEditorCreated(editor) {
            this.editor = editor;
        },
        onMoveToSlotClicked(anotherSlotName) {
            this.$emit('moved-to-slot', anotherSlotName);
        },

        emitTextSlotPropertyChange(propertyPath, value) {
            this.$emit('property-changed', propertyPath, value);
        }
    }
}
</script>