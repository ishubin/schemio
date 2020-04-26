<template>
    <g :transform="textEditArea.type === 'viewport' ? viewportTransform : relativeTransform">
        <foreignObject :x="area.x" :y="area.y" :width="area.w" :height="area.h">
            <div id="item-in-place-text-editor" class="item-text-container" :style="textEditArea.style">
                <editor-content :editor="editor" />
            </div>
        </foreignObject>
    </g>
</template>

<script>
import EventBus from './EventBus';
import htmlSanitize from '../../../htmlSanitize';
import utils from '../../utils';
import RichTextEditor from '../RichTextEditor.vue';
import { Editor, EditorContent } from 'tiptap';
import {
    Blockquote, CodeBlock, HardBreak, Heading, OrderedList, BulletList, ListItem, 
    TodoItem, TodoList, Bold, Code, Italic, Link, Strike, Underline, History,
} from 'tiptap-extensions';


export default {
    props: ['viewportTransform', 'relativeTransform', 'item', 'textEditArea', 'point'],
    components: {RichTextEditor, EditorContent},

    beforeMount() {
        this.init();
    },

    mounted() {
    },

    data() {
        return {
            editor: null,
            area: {
                x: 0, y: 0, w: 1, h: 1
            }
        };
    },

    methods: {
        init() {
            this.item.meta.hiddenTextProperty = this.textEditArea.property;
            EventBus.emitItemChanged(this.item.id);

            document.addEventListener('click', this.outsideClickListener);

            this.editor = this.creatEditor(this.item[this.textEditArea.property]);

            if (this.textEditArea.area) {
                this.area.x = this.point.x + this.textEditArea.area.x;
                this.area.y = this.point.y + this.textEditArea.area.y;
                this.area.w = this.textEditArea.area.w;
                this.area.h = this.textEditArea.area.h;
            } else {
                this.area.x = this.point.x
                this.area.y = this.point.y;
                this.area.w = this.item.area.w;
                this.area.h = this.item.area.h;
            }
        },

        creatEditor(text) {
            return new Editor({
                extensions: [
                    new Blockquote(), new CodeBlock(), new HardBreak(), new Heading({ levels: [1, 2, 3] }), new BulletList(), new OrderedList(), new ListItem(),
                    new TodoItem(), new TodoList(), new Bold(), new Code(), new Italic(), new Link(), new Strike(), new Underline(), new History(), ],

                autoFocus: true,
                content: text,
                onUpdate: (event) => {
                    const content = event.getHTML();
                    this.item[this.textEditArea.property] = content;
                    EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${this.textEditArea.property}`);
                }
            });
        },

        outsideClickListener(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.id === 'item-in-place-text-editor')) {
                document.removeEventListener('click', this.outsideClickListener);
                this.item.meta.hiddenTextProperty = null;
                EventBus.emitItemChanged(this.item.id);
                this.$emit('close');
            }
        },
    }

}
</script>