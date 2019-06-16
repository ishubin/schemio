<template lang="html">
    <div class="rich-text-editor-container">
        <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
            <div class="editor-menubar">
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

        <div class="editor-frame" :style="{width, height}" :class="{focused}">
            <div class="editor-content" :style="{width, height}">
                <editor-content :editor="editor" />
            </div>
            <span class="editor-enlarge" @click="enlarged = true"><i class="fas fa-expand"></i></span>
        </div>



        <modal v-if="enlarged" title="Text Editor" @close="enlarged = false" :width="enlargedWidth">
            <div class="textarea-enlarged-container">
                <div :style="{height: 400 + 'px'}">
                    <editor-menu-bar :editor="editor" v-slot="{ commands, isActive }">
                        <div class="editor-menubar">
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
                    <div class="editor-frame" :style="{height: enlargedHeight+'px'}">
                        <div class="editor-content" :style="{width, height: enlargedHeight+'px'}">
                            <editor-content :editor="editorLarge" />
                        </div>
                        <span class="editor-enlarge" @click="enlarged = true"><i class="fas fa-expand"></i></span>
                    </div>
                </div>
            </div>
        </modal>
    </div>
</template>

<script>
import { Editor, EditorContent, EditorMenuBar } from 'tiptap';
import {
    Blockquote, CodeBlock, HardBreak, Heading, OrderedList, BulletList, ListItem, 
    TodoItem, TodoList, Bold, Code, Italic, Link, Strike, Underline, History,
} from 'tiptap-extensions';
import Modal from './Modal.vue';


export default {
    props: {
        value: {type: String},
        width: {type: String, default: '100%'},
        height: {type: String, default: '150px'}
    },
    components: {Modal, Editor, EditorContent, EditorMenuBar},

    mounted() {
        this.editor = new Editor({
            extensions: [
                new Blockquote(),
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
                new Link(),
                new Strike(),
                new Underline(),
                new History(),
            ],
            content: this.value,
            onUpdate: (event) => {
                const content = event.getHTML();
                this.$emit('changed', content);
                this.editorLarge.setContent(content, false);
            },
            onFocus: () => {
                this.focused = true;
            },
            onBlur: () => {
                this.focused = false;
            }
        });

        this.editorLarge = new Editor({
            extensions: [
                new Blockquote(),
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
                new Link(),
                new Strike(),
                new Underline(),
                new History(),
            ],
            content: this.value,
            onUpdate: (event) => {
                const content = event.getHTML();
                this.$emit('changed', content);
                this.editor.setContent(content, false);
            }
        });
    },
    beforeDestroy() {
        this.editor.destroy();
        this.editorLarge.destroy();
    },

    data() {
        return {
            editor: null,
            focused: false,
            enlarged: false,
            editorLarge: null,
            enlargedWidth: window.innerWidth - 100,
            enlargedHeight: window.innerHeight - 440
        };
    }
}
</script>
