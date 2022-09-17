<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template lang="html">
    <div class="rich-text-editor-container">
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
                <span class="editor-icon" :class="{ 'is-active': isActive.link() }" @click="toggleLink(commands.link, getMarkAttrs('link'))">
                    <i class="fas fa-link"></i>
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
            <div class="editor-content" @click="onEditorClick" :style="{width, height}">
                <editor-content :editor="editor" />
            </div>
            <span class="editor-enlarge" @click="enlarged = true"><i class="fas fa-expand"></i></span>
        </div>



        <div class="textarea-enlarged-container" v-if="enlarged">
            <div class="textarea-enlarged-top-panel">
                <editor-menu-bar :editor="editorLarge" v-slot="{ commands, isActive, getMarkAttrs }">
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
                        <span class="editor-icon" :class="{ 'is-active': isActive.link() }" @click="toggleLink(commands.link, getMarkAttrs('link'))">
                            <i class="fas fa-link"></i>
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
                <span class="btn btn-secondary action-close" @click="enlarged = false">Close</span>
            </div>
            <div class="editor-frame">
                <div class="editor-content" @click="onEditorClick">
                    <editor-content :editor="editorLarge" />
                </div>
            </div>
        </div>


        <modal v-if="linkModal.shown" title="Add Link" @close="linkModal.shown = false" primary-button="Save" @primary-submit="onLinkModalSubmit">
            <input class="textfield" v-model="linkModal.url" placeholder="https://"  @keyup.enter="onLinkModalSubmit"/>
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
        value   : {type: String},
        id      : {type: String},
        width   : {type: String, default: '100%'},
        height  : {type: String, default: '150px'}
    },
    components: {Modal, EditorContent, EditorMenuBar},

    beforeMount() {
        this.editor = new Editor({
            disablePasteRules: true,
            disableInputRules: true,
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
            disablePasteRules: true,
            disableInputRules: true,
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
            enlargedHeight: window.innerHeight - 340,
            linkModal: {
                shown: false,
                url: '',
                linkCommand: null
            }
        };
    },

    methods: {
        onEditorClick(event) {
            if (event.target.className.indexOf('editor-content') >= 0) {
                this.editor.view.dom.focus();
            }
        },

        onLargeEditorClick(event) {
            if (event.target.className.indexOf('editor-content') >= 0) {
                this.editorLarge.view.dom.focus();
            }
        },


        toggleLink(linkCommand, linkAttrs) {
            this.linkModal.linkCommand = linkCommand;
            if (linkAttrs.href) {
                this.linkModal.url = linkAttrs.href.trim();
            }
            this.linkModal.shown = true;
        },

        onLinkModalSubmit() {
            const url = this.linkModal.url.trim();
            if (url) {
                this.linkModal.linkCommand({ href: url });
            } else {
                this.linkModal.linkCommand({ href: null });
            }
            this.linkModal.shown = false;
        }
    },

    watch: {
        // Used in order to track switching from one item to another.
        // In such cases we should reset the text in the text area.
        // Otherwise it will not get updated
        id(val) {
            this.editorLarge.setContent(this.value);
            this.editor.setContent(this.value);
        }
    }
}
</script>
