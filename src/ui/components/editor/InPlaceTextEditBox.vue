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
    TodoItem, TodoList, Bold, Code, Italic, Link, Strike, Underline, History,
} from 'tiptap-extensions';


export default {
    props: ['viewportTransform', 'relativeTransform', 'area', 'text', 'cssStyle', 'transformType'],
    components: {RichTextEditor, EditorContent},

    beforeMount() {
        this.init();
    },

    data() {
        return {
            editor: null,
        };
    },

    methods: {
        init() {
            document.addEventListener('click', this.outsideClickListener);
            this.editor = this.createEditor(this.text);
            EventBus.emitItemInPlaceTextEditorCreated(this.editor);
        },

        createEditor(text) {
            return new Editor({
                extensions: [
                    new Blockquote(), new CodeBlock(), new HardBreak(), new Heading({ levels: [1, 2, 3] }), new BulletList(), new OrderedList(), new ListItem(),
                    new TodoItem(), new TodoList(), new Bold(), new Code(), new Italic(), new Link(), new Strike(), new Underline(), new History(), ],

                autoFocus: true,
                content: text,
                onUpdate: (event) => {
                    const content = event.getHTML();
                    this.$emit('updated', content);
                }
            });
        },

        outsideClickListener(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.id === 'item-in-place-text-editor' || domElement.classList.contains('side-panel-right'))) {
                document.removeEventListener('click', this.outsideClickListener);
                this.$emit('close');
            }
        },
    }

}
</script>