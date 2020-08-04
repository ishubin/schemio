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
                            <color-picker :color="textSlot.color" @input="textSlot.color = arguments[0]; commitSchemeChange('color')"></color-picker>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font</td>
                        <td class="value" width="50%">
                            <dropdown :options="allFonts" :value="textSlot.font" @selected="textSlot.font = arguments[0].name; commitSchemeChange('font')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Font Size</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.fontSize" @changed="textSlot.fontSize = arguments[0]; commitSchemeChange('fontSize')" :min="0"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Horizontal Align</td>
                        <td class="value" width="50%">
                            <select :value="textSlot.halign" @input="textSlot.halign = arguments[0].target.value; commitSchemeChange('halign')">
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Vertical Align</td>
                        <td class="value" width="50%">
                            <select :value="textSlot.valign" @input="textSlot.valign = arguments[0].target.value; commitSchemeChange('valign')">
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
                            <number-textfield :value="textSlot.padding.left" @changed="textSlot.padding.left = arguments[0]; commitSchemeChange('padding.left')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Right</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.padding.right" @changed="textSlot.padding.right = arguments[0]; commitSchemeChange('padding.right')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Top</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.padding.top" @changed="textSlot.padding.top = arguments[0]; commitSchemeChange('padding.top')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">Padding Bottom</td>
                        <td class="value" width="50%">
                            <number-textfield :value="textSlot.padding.bottom" @changed="textSlot.padding.bottom = arguments[0]; commitSchemeChange('padding.bottom')"/>
                        </td>
                    </tr>
                    <tr>
                        <td class="label" width="50%">White Space</td>
                        <td class="value" width="50%">
                            <select :value="textSlot.whiteSpace" @input="textSlot.whiteSpace = arguments[0].target.value; commitSchemeChange('whiteSpace')">
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
import {map} from 'lodash';
import Shape from '../../editor/items/shapes/Shape';
import Dropdown from '../../Dropdown.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import ColorPicker from '../ColorPicker.vue';


export default {
    props: ['item', 'slotName'],
    components: {EditorMenuBar, Dropdown, NumberTextfield, ColorPicker},

    beforeMount() {
        EventBus.$on(EventBus.ITEM_IN_PLACE_TEXT_EDITOR_CREATED, this.onTextEditorCreated);
    },
    beforeDestroy() {
        EventBus.$off(EventBus.ITEM_IN_PLACE_TEXT_EDITOR_CREATED, this.onTextEditorCreated);
    },
    data() {
        const shape = Shape.find(this.item.shape);

        return {
            editor: null,
            textSlot: this.item.textSlots[this.slotName],
            availableTextSlots: map(shape.getTextSlots(this.item), textSlot => textSlot.name),
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
        onTextEditorCreated(editor) {
            this.editor = editor;
        },
        commitSchemeChange(propertyPath) {
            const propertyFullPath = `item.${this.item.id}.textSlots.${this.slotName}.${propertyPath}`;

            EventBus.emitSchemeChangeCommited(propertyFullPath);
            EventBus.emitItemChanged(this.item.id, propertyFullPath);
        },
        onMoveToSlotClicked(anotherSlotName) {
            this.$emit('moved-to-slot', anotherSlotName);
        }
    }
}
</script>