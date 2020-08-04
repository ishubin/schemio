<template>
    <g :transform="transformType === 'viewport' ? viewportTransform : relativeTransform">
        <foreignObject :x="area.x" :y="area.y" :width="area.w" :height="area.h">
            <div v-if="editor" id="item-in-place-text-editor" class="item-text-container" :style="cssStyle">
                <editor-content :editor="editor" />
            </div>
        </foreignObject>
    </g>
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
    props: ['viewportTransform', 'relativeTransform', 'area', 'text', 'cssStyle', 'transformType'],
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
        return {
            editor: null,
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
            if (!utils.domHasParentNode(event.target, domElement => domElement.id === 'item-in-place-text-editor' || domElement.classList.contains('side-panel-right'))) {
                document.removeEventListener('click', this.outsideClickListener);
                this.closeEditBox();
            }
        },
        
        closeEditBox() {
            this.$emit('close');
        }
    }

}
</script>