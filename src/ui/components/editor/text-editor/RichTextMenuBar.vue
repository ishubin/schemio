<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="rich-text-editor-menubar">
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">
            <i class="fas fa-bold"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">
            <i class="fas fa-italic"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()">
            <i class="fas fa-strikethrough"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">
            <i class="fas fa-underline"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('code') }" @click="editor.chain().focus().toggleCode().run()">
            <i class="fas fa-code"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('heading', {level: 1})}" @click="editor.chain().focus().toggleHeading({level: 1}).run()">
            H1
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('heading', {level: 2})}" @click="editor.chain().focus().toggleHeading({level: 2}).run()">
            H2
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('heading', {level: 3})}" @click="editor.chain().focus().toggleHeading({level: 3}).run()">
            H3
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">
            <i class="fas fa-list-ul"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()">
            <i class="fas fa-list-ol"></i>
        </span>
        <span class="editor-icon" :class="{ 'is-active': editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()">
            <i class="fas fa-quote-left"></i>
        </span>
        <span class="editor-icon" @click="toggleEmoticonsPopup">
            <i class="fa-solid fa-face-smile"></i>
        </span>
        <slot></slot>
        <div v-if="emoticonsModalShown" class="rech-text-editor-emoticons-modal" :style="{top: `${emY}px`, left: `${emX}px`}">
            <input type="text" class="emoticons-search-keyword"/>
            <ul>
                <li>
                    <i class="fa-solid fa-poo" @click="insertEmoticon('fa-solid fa-poo')"></i>
                </li>
                <li>
                    <i class="fa-solid fa-face-grin-squint-tears" @click="insertEmoticon('fa-solid fa-face-grin-squint-tears')"></i>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        editor: {required: true}
    },

    data() {
        return {
            emoticonsModalShown : false,
            //emoticonsModal X and Y
            emX: 0,
            emY: 0,
        };
    },

    methods: {
        toggleEmoticonsPopup(event) {
            if (this.emoticonsModalShown) {
                this.emoticonsModalShown = false;
                return;
            }
            const box = event.target.getBoundingClientRect();
            this.emX = box.left;
            this.emY = box.bottom;
            this.emoticonsModalShown = true;
        },

        insertEmoticon(iconClass) {
            this.editor.commands.insertContent({type: 'icon', attrs: {class: iconClass}});
            this.emoticonsModalShown = false;
        },
    }
}
</script>