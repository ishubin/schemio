<template>
    <div class="in-place-edit-editor-wrapper" :style="{left: `${area.x}px`, top: `${area.y}px`}">
        <div ref="editor" v-if="editor" data-type="item-in-place-text-editor" class="item-text-container" :style="editorCssStyle">
            <editor-content :editor="editor" />
        </div>
    </div>
</template>

<script>
import htmlSanitize from '../../../htmlSanitize';
import utils from '../../utils';
import RichTextEditor from '../RichTextEditor.vue';
import EventBus from './EventBus';
import { Editor, EditorContent } from 'tiptap';
import {
    Blockquote, CodeBlock, HardBreak, Heading, OrderedList, BulletList, ListItem, 
    TodoItem, TodoList, Bold, Code, Italic, Strike, Underline, History,
} from 'tiptap-extensions';


export default {
    props: ['item', 'area', 'text', 'cssStyle', 'zoom'],
    components: {RichTextEditor, EditorContent},

    beforeMount() {
        document.addEventListener('mousedown', this.outsideClickListener);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_MOVED, this.closeEditBox);
        this.init();
    },

    beforeDestroy() {
        document.removeEventListener('mousedown', this.outsideClickListener);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_MOVED, this.closeEditBox);
    },

    data() {
        const editorCssStyle = utils.clone(this.cssStyle);
        let scale = 1.0
        if (this.item.area.type !== 'viewport') {
            scale = this.zoom;
            editorCssStyle.transform = `scale(${this.zoom})`;
            editorCssStyle['transform-origin'] = 'top left';
        }

        if (this.item.area.w > 20) {
            editorCssStyle.width = `${this.area.w/scale}px`;
        }
        if (this.item.area.h > 20) {
            editorCssStyle.height = `${this.area.h/scale}px`;
        }

        return {
            editor: null,
            editorCssStyle
        };
    },

    methods: {
        init() {
            this.editor = this.createEditor(this.text);
            EventBus.emitItemInPlaceTextEditorCreated(this.editor);
        },

        createEditor(text) {
            const editor = new Editor({
                extensions: [
                    new Blockquote(), new CodeBlock(), new HardBreak(), new Heading({ levels: [1, 2, 3] }), new BulletList(), new OrderedList(), new ListItem(),
                    new TodoItem(), new TodoList(), new Bold(), new Code(), new Italic(), new Strike(), new Underline(), new History(), ],

                autoFocus: true,
                content: '',
                onUpdate: (event) => {
                    const content = event.getHTML();
                    this.$emit('updated', content);
                }
            });
            editor.setContent(this.text, true, {preserveWhitespace: true})
            return editor;
        },

        outsideClickListener(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.getAttribute('data-type') === 'item-in-place-text-editor' || domElement.classList.contains('side-panel-right'))) {
                document.removeEventListener('click', this.outsideClickListener);
                this.closeEditBox();
            }
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
                    this.$emit('item-area-changed', this.item, rect.width, rect.height);
                } else {
                    this.$emit('item-text-cleared', this.item);
                }
            }
            this.$emit('close');
        }
    }

}
</script>