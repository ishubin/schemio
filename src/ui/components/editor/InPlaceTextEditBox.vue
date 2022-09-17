<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="in-place-edit-editor-wrapper" :style="cssStyle2">
        <textarea v-if="markupDisabled" ref="textarea" class="in-place-text-editor" data-type="item-in-place-text-editor"
            :value="text"
            :style="editorCssStyle"
            @keydown="onTextareaKeyDown"
            @input="onTextareaInput"></textarea>
        <div v-else-if="editor" ref="editor" data-type="item-in-place-text-editor" class="item-text-container" :style="editorCssStyle">
            <editor-content :editor="editor" />
        </div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize';
import utils from '../../utils';
import RichTextEditor from '../RichTextEditor.vue';
import EventBus from './EventBus';
import { Keys, identifyKeyPress } from '../../events';
import { Editor, EditorContent } from 'tiptap';
import {
    Blockquote, CodeBlock, HardBreak, Heading, OrderedList, BulletList, ListItem, 
    TodoItem, TodoList, Bold, Code, Italic, Strike, Underline, History,
} from 'tiptap-extensions';


export default {
    props: {
        item           : {type: Object},
        area           : {type: Object},
        text           : {type: String},
        cssStyle       : {type: Object},
        zoom           : {type: Number},
        creatingNewItem: {type: Boolean},
        scalingVector  : {type: Number},
        markupDisabled : {type: Boolean, default: false}
    },
    components: {RichTextEditor, EditorContent},

    beforeMount() {
        document.addEventListener('mousedown', this.outsideClickListener);
        document.addEventListener('keydown', this.onKeyDown);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_MOVED, this.closeEditBox);
        this.init();
    },

    beforeDestroy() {
        document.removeEventListener('mousedown', this.outsideClickListener);
        document.removeEventListener('keydown', this.onKeyDown);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_MOVED, this.closeEditBox);
    },

    mounted() {
        if (this.markupDisabled) {
            this.$refs.textarea.focus();
        }
    },

    data() {

        return {
            editor: null,
            editorCssStyle: this.generateStyle(this.cssStyle)
        };
    },

    methods: {
        init() {
            if (!this.markupDisabled) {
                this.editor = this.createEditor(this.text);
                EventBus.emitItemInPlaceTextEditorCreated(this.editor);
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
                editorCssStyle.height = `${this.area.h/scale}px`;
            }
            return editorCssStyle;
        },

        createEditor(text) {
            const editor = new Editor({
                disablePasteRules: true,
                disableInputRules: true,
                extensions: [
                    new Blockquote(), new CodeBlock(), new HardBreak(), new Heading({ levels: [1, 2, 3] }), new BulletList(), new OrderedList(), new ListItem(),
                    new TodoItem(), new TodoList(), new Bold(), new Code(), new Italic(), new Strike(), new Underline(), new History(), ],

                autoFocus: true,
                content: '',
                onUpdate: (event) => {
                    this.$emit('updated', event.getHTML());
                }
            });
            editor.setContent(this.text, true, {preserveWhitespace: true})
            return editor;
        },

        outsideClickListener(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.getAttribute('data-type') === 'item-in-place-text-editor' || domElement.classList.contains('side-panel-right'))) {
                this.closeEditBox();
            }
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

        onTextareaInput(event) {
            this.$emit('updated', event.target.value);
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

                        this.$emit('item-area-changed', this.item, rect.width + 2, rect.height + 2);
                    }
                } else {
                    this.$emit('item-text-cleared', this.item);
                }
            }
            this.$emit('close');
        }
    },

    computed: {
        cssStyle2() {
            return {
                left: `${this.area.x}px`,
                top: `${this.area.y}px`,
                transform: `scale(${this.scalingVector.x}, ${this.scalingVector.y})`
            };
        }
    },

    watch: {
        cssStyle(newStyle) {
            this.editorCssStyle = this.generateStyle(newStyle);
        }
    }

}
</script>