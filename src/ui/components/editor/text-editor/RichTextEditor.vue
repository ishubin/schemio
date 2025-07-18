<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template lang="html">
    <div class="rich-text-editor-container">
        <RichTextMenuBar :editor="editor"/>
        <div class="editor-frame" :style="{width, height}" :class="{focused}">
            <div class="editor-content" @click="onEditorClick" :style="{width, height}">
                <EditorContent :editor="editor" />
            </div>
            <span class="text-editor-enlarge" @click="enlarged = true"><i class="fas fa-expand"></i></span>
        </div>


        <div class="textarea-enlarged-container" v-if="enlarged && editorLarge">
            <RichTextMenuBar :editor="editorLarge">
                <span class="btn btn-secondary action-close" @click="enlarged = false">Close</span>
            </RichTextMenuBar>

            <div class="editor-frame">
                <div class="editor-content" @click="onEditorClick">
                    <EditorContent :editor="editorLarge" />
                </div>
            </div>
        </div>


        <modal v-if="linkModal.shown" title="Add Link" @close="linkModal.shown = false" primary-button="Save" @primary-submit="onLinkModalSubmit">
            <input class="textfield" v-model="linkModal.url" placeholder="https://"  @keyup.enter="onLinkModalSubmit"/>
        </modal>
    </div>
</template>

<script>
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { Editor, EditorContent } from '@tiptap/vue-2';
import Underline from '@tiptap/extension-underline';
import Modal from '../../Modal.vue';
import RichTextMenuBar from './RichTextMenuBar.vue';
import IconTipTapExtension from './IconTipTapExtension';

export default {
    props: {
        value : {type: String},
        id    : {type: String},
        width : {type: String, default: '100%'},
        height: {type: String, default: '150px'},
    },
    components: {Modal, EditorContent, RichTextMenuBar},

    beforeMount() {
        this.editor = new Editor({
            disablePasteRules: true,
            disableInputRules: true,
            extensions: [
                IconTipTapExtension,
                StarterKit,
                Underline,
                Link.configure({
                    openOnClick: false,
                    defaultProtocol: 'https',
                }),
            ],
            content: this.value,
            onUpdate: ({ editor }) => {
                const content = editor.getHTML();
                this.$emit('changed', content);
                this.editorLarge.commands.setContent(content, false, {preserveWhitespace: true});
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
                IconTipTapExtension,
                StarterKit,
                Underline,
                Link.configure({
                    openOnClick: false,
                    defaultProtocol: 'https',
                }),
            ],
            content: this.value,
            onUpdate: ({ editor }) => {
                const content = editor.getHTML();
                this.$emit('changed', content);
                this.editor.commands.setContent(content, false, {preserveWhitespace: true});
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
                onSubmit: null
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


        toggleLink(editor) {
            const previousUrl = this.editor.getAttributes('link').href || '';
            this.linkModal.url = previousUrl;
            this.linkModal.onSubmit = () => {
                if (this.linkModal.url) {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: this.linkModal.url }).run();
                } else {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                }
            };
            this.linkModal.shown = true;
        },

        onLinkModalSubmit() {
            this.linkModal.onSubmit();
            this.linkModal.shown = false;
        }
    },

    watch: {
        // Used in order to track switching from one item to another.
        // In such cases we should reset the text in the text area.
        // Otherwise it will not get updated
        id(val) {
            this.editor.commands.setContent(this.value, false, {preserveWhitespace: true});
            this.editorLarge.commands.setContent(this.value, false, {preserveWhitespace: true});
        }
    }
}
</script>
