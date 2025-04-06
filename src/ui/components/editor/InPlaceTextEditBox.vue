<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="in-place-edit-editor-wrapper"
        ref="wrapper"
        :id="`in-place-text-edit-wrapper-${editorId}-${item.id}`"
        :data-slot-name="textSlot.name"
        :style="cssStyle2"
        >
        <div class="in-place-text-editor-menu" ref="floatingMenu" v-if="isRichEditor && !isSimpleText" :style="editorMenuStyle">
            <editor-menu-bar :editor="editor" v-slot="{ commands, isActive, getMarkAttrs }">
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
                </div>
            </editor-menu-bar>
        </div>
        <textarea v-if="textSlot.display === 'textarea'" ref="textarea"
            class="in-place-text-editor"
            data-type="item-in-place-text-editor"
            :value="text"
            :style="editorCssStyle"
            @keydown="onTextareaKeyDown"
            @input="onTextareaInput"
        ></textarea>
        <input v-else-if="textSlot.display === 'textfield'"
            ref="textfield"
            type="text"
            class="in-place-text-editor"
            data-type="item-in-place-text-editor"
            :value="text"
            :style="editorCssStyle"
            @input="onTextareaInput"
        />
        <div v-else-if="textSlot.display === 'dropdown'" class="in-place-text-edit-dropdown-container">
            <input ref="dropdownInput"
                type="text"
                class="in-place-text-editor"
                data-type="item-in-place-text-editor"
                :value="dropdownText"
                :style="editorCssStyle"
                @keydown="onDropdownKeyDown"
                @input="onDropdownInput"
                @click="onDropdownClicked"
            />
            <ul ref="suggestions"
                class="in-place-text-edit-dropdown-options"
                :style="{'max-height': `${suggestionsMaxHeight}px`}"
                v-if="suggestionsShown">
                <li v-for="(suggestion, suggestionIdx) in filteredSuggestions"
                    @click="onDropdownSuggestionSelected(suggestion)"
                    :class="{selected: suggestionIdx === suggestionActiveIdx}"
                    >
                    {{ suggestion }}
                </li>
            </ul>
        </div>
        <div v-else-if="editor" ref="editor" data-type="item-in-place-text-editor" class="item-text-container" :style="editorCssStyle">
            <editor-content :editor="editor" />
        </div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize';
import utils from '../../utils';
import RichTextEditor from '../RichTextEditor.vue';
import { Keys, identifyKeyPress } from '../../events';
import { Editor, EditorContent, EditorMenuBar } from 'tiptap';
import {
    CodeBlock, HardBreak, Heading, OrderedList, BulletList, ListItem,
    TodoItem, TodoList, Bold, Code, Italic, Strike, Underline, History
} from 'tiptap-extensions';
import EditorEventBus from './EditorEventBus';
import Dropdown from '../Dropdown.vue';


export default {
    props: {
        editorId       : {type: String, required: true},
        item           : {type: Object},
        area           : {type: Object},
        textSlot       : {type: Object},
        text           : {type: String},
        cssStyle       : {type: Object},
        zoom           : {type: Number},
        creatingNewItem: {type: Boolean},
        scalingVector  : {type: Object},
        mouseDownId    : {type: Number},
    },
    components: {RichTextEditor, EditorContent, EditorMenuBar, Dropdown},

    beforeMount() {
        document.addEventListener('keydown', this.onKeyDown);
        EditorEventBus.textSlot.moved.$on(this.editorId, this.closeEditBox);
        this.init();
    },

    beforeDestroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        EditorEventBus.textSlot.moved.$off(this.editorId, this.closeEditBox);
    },

    mounted() {
        // have no idea why it doesn't want to focus without timeout
        // autofocus also does not work anymore
        if (this.textSlot.display === 'textarea') {
            const textarea = this.$refs.textarea;
            setTimeout(() => textarea.focus(), 60);
        } else if (this.textSlot.display === 'textfield') {
            const input = this.$refs.textfield;
            setTimeout(() => input.focus(), 60);
        } else if (this.textSlot.display === 'dropdown') {
            const input = this.$refs.dropdownInput;
            setTimeout(() => input.focus(), 60);
        }

        if (this.$refs.suggestions) {
            const rect = this.$refs.suggestions.getBoundingClientRect();
            if (rect.bottom > window.innerHeight - 5) {
                this.suggestionsMaxHeight = Math.min(Math.max(5, window.innerHeight - 5 - rect.top), 300);
            }
        }

        if (this.$refs.floatingMenu) {
            const rect = this.$refs.wrapper.getBoundingClientRect();
            const svgElement = document.getElementById(`svg-plot-${this.editorId}`);
            const svgRect = svgElement.getBoundingClientRect();
            const menuRect = this.$refs.floatingMenu.getBoundingClientRect();

            // visible area of the svg
            let x1 = svgRect.left,
                y1 = svgRect.top,
                x2 = svgRect.right,
                y2 = svgRect.bottom;

            // correcting the visible area by subtracting the space that was taken by the left side panel
            const sideLeftPanel = document.querySelector('.side-panel.side-panel-left');
            if (sideLeftPanel) {
                const sideLeftPanelRect = sideLeftPanel.getBoundingClientRect();
                x1 = Math.max(x1, sideLeftPanelRect.right);
            }

            // correcting the visible area by subtracting the space that was taken by the right side panel
            const sideRightPanel = document.querySelector('.side-panel.side-panel-right');
            if (sideRightPanel) {
                const sideRightPanelRect = sideRightPanel.getBoundingClientRect();
                x2 = Math.min(x2, sideRightPanelRect.left);
            }

            const topSpace = rect.top - y1;
            const bottomSpace = y2 - rect.bottom;
            const style = {};
            if (topSpace > menuRect.height) {
                style.top = `${-menuRect.height}px`;
            } else if (bottomSpace > menuRect.height) {
                style.bottom = `-${menuRect.height}px`;
            } else {
                style.top = `${-topSpace}px`;
            }

            if (menuRect.right > x2) {
                style.left = `${-(menuRect.right - x2)}px`;
            }
            if (menuRect.left < x1) {
                style.left = `${x1 - menuRect.left}px`;
            }
            this.editorMenuStyle = style;
        }
    },

    data() {
        return {
            editor              : null,
            editorCssStyle      : this.generateStyle(this.cssStyle),
            editorMenuStyle     : {top: '-30px'},
            dropdownText        : this.text,
            suggestions         : this.textSlot.suggestions || [],
            suggestionsShown    : this.textSlot.display === 'dropdown',
            filteredSuggestions : this.textSlot.suggestions || [],
            suggestionActiveIdx : -1,
            suggestionsMaxHeight: 250,
        };
    },

    methods: {
        init() {
            if (this.textSlot.display !== 'textarea' && this.textSlot.display !== 'dropdown' & this.textSlot.display !== 'textfield') {
                this.editor = this.createEditor(this.text);
                EditorEventBus.inPlaceTextEditor.created.$emit(this.editorId, this.editor);
            }
        },

        generateStyle(cssStyle) {
            const editorCssStyle = utils.clone(cssStyle);
            let scale = this.zoom;
            editorCssStyle.transform = `scale(${this.zoom})`;
            editorCssStyle['transform-origin'] = 'top left';

            // in case user clicks void - we don't want to limit the typing area
            if (!this.creatingNewItem) {
                editorCssStyle.width = `${this.area.w/scale}px`;

                // for simple labels we want to be able to reduce the editor height in case we delete some lines from the text
                // but we want to make sure that text slot editor rect is correctly positioned for other shapes
                // Also, in case label has valign middle or bottom, the height should be limited, otherwise text will "jump up"
                const valign = this.item.textSlots[this.textSlot.name] ? this.item.textSlots[this.textSlot.name].valign : 'top';
                if (this.item.shape !== 'none' || (this.item.shape === 'none' && valign !== 'top')) {
                    editorCssStyle.height = `${this.area.h/scale}px`;
                }
            }
            return editorCssStyle;
        },

        createEditor(text) {
            const editor = new Editor({
                disablePasteRules: true,
                disableInputRules: true,
                extensions: [
                    new CodeBlock(),
                    new HardBreak(),
                    new Heading({ levels: [1, 2, 3] }),
                    new BulletList(),
                    new OrderedList(),
                    new ListItem(),
                    new TodoItem(),
                    new TodoList(),
                    new Bold(),
                    new Code(),
                    new Italic(),
                    new Strike(),
                    new Underline(),
                    new History(),
                ],

                autoFocus: true,
                content: '',
                onUpdate: (event) => {
                    this.$emit('updated', event.getHTML());
                }
            });
            editor.setContent(text, true, {preserveWhitespace: true})
            return editor;
        },

        onKeyDown(event) {
            if (identifyKeyPress(event) === Keys.ESCAPE) {
                this.closeEditBox();
            }
        },

        onTextareaKeyDown(event) {
            if (event.key == 'Tab') {
                event.preventDefault();
                const target = event.target;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                target.value = target.value.substring(0, start) + '    ' + target.value.substring(end);
                target.selectionStart = target.selectionEnd = start + 4;
                this.$emit('updated', event.target.value);
            }
        },

        onDropdownKeyDown(event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!this.suggestionsShown) {
                    this.suggestionsShown = true;
                    this.suggestionActiveIdx = -1;
                    this.filteredSuggestions = this.suggestions;
                }
                this.suggestionActiveIdx = Math.min(this.filteredSuggestions.length - 1, this.suggestionActiveIdx + 1);
                this.scrollToSelectedSuggestion();
            } else if (event.key === 'ArrowUp' && this.suggestionsShown) {
                event.preventDefault();
                this.suggestionActiveIdx = Math.max(-1, this.suggestionActiveIdx - 1);
                this.scrollToSelectedSuggestion();
            } else if (event.key === 'Enter'
                && this.suggestionsShown
                && this.suggestionActiveIdx >= 0
                && this.suggestionActiveIdx < this.filteredSuggestions.length) {
                this.onDropdownSuggestionSelected(this.filteredSuggestions[this.suggestionActiveIdx]);
            }
        },

        scrollToSelectedSuggestion() {
            if (!this.$refs.suggestions) {
                return;
            }
            const liElements = this.$refs.suggestions.querySelectorAll('li');
            if (liElements && this.suggestionActiveIdx >= 0 && this.suggestionActiveIdx < liElements.length) {
                liElements[this.suggestionActiveIdx].scrollIntoView();
            }
        },

        onTextareaInput(event) {
            this.$emit('updated', event.target.value);
        },

        onDropdownInput(event) {
            this.$emit('updated', event.target.value);
            this.text = event.target.value;
            const text = event.target.value.trim();
            if (this.textSlot.display === 'dropdown') {
                this.suggestionsShown = true;
                this.filteredSuggestions = this.suggestions.filter(suggestion => suggestion.indexOf(text) >= 0);
                this.suggestionActiveIdx = -1;
            }
        },

        onDropdownClicked() {
            this.filteredSuggestions = this.suggestions;
            this.suggestionsShown = true;
        },

        closeEditBox() {
            if (this.item.shape === 'none') {
                const rect = this.$refs.editor.getBoundingClientRect();
                // in case the shape is none - only text matters
                // so if text was removed perhaps it makes sense to remove the item from SchemeContainer if it doesn't have child items
                // the trick we do here is getting pure text from html and checking if it is empty
                const html = this.editor.getHTML();
                const el = document.createElement('div');
                el.innerHTML = htmlSanitize(html);
                const text = el.innerText.trim();

                if (text) {
                    if (this.creatingNewItem) {
                        let name = text;
                        if (name.length > 20) {
                            name = name.substring(0, 20);
                        }
                        this.$emit('item-renamed', this.item, name);
                    }
                    this.$emit('item-area-changed', this.item, (rect.width + 2)/this.zoom, (rect.height + 2)/this.zoom);
                } else {
                    this.$emit('item-text-cleared', this.item);
                }
            }
            this.$emit('close');
        },

        onDropdownSuggestionSelected(suggestion) {
            this.suggestionsShown = false;
            this.filteredSuggestions = this.suggestions;

            this.$emit('updated', suggestion);
            this.dropdownText = suggestion;
        }
    },

    computed: {
        isRichEditor() {
            return this.textSlot.display !== 'textarea' && this.textSlot.display !== 'dropdown';
        },

        isSimpleText() {
            return this.item.args && this.item.args.simpleText;
        },

        cssStyle2() {
            return {
                left: `${this.area.x + 1/this.zoom}px`,
                top: `${this.area.y + 1/this.zoom}px`,
                transform: `scale(${this.scalingVector.x}, ${this.scalingVector.y})`
            };
        }
    },

    watch: {
        cssStyle(newStyle) {
            this.editorCssStyle = this.generateStyle(newStyle);
        },
        mouseDownId() {
            this.closeEditBox();
        },
        text(text) {
            this.dropdownText = text;
        }
    }

}
</script>