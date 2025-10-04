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
        <span class="editor-icon" v-if="linkEnabled" @click="$emit('link-toggled')">
            <i class="fa-solid fa-link"></i>
        </span>
        <span class="editor-icon" v-if="editor.isActive('link')" @click="editor.chain().focus().unsetLink().run()">
            <i class="fa-solid fa-link-slash"></i>
        </span>
        <span class="editor-icon" data-type="icon-modal-toggle-button" @click="toggleIconsPopup">
            <i class="fa-solid fa-face-smile"></i>
        </span>

        <slot></slot>

        <div v-if="iconsModalShown" ref="iconsModal" class="rich-text-editor-icons-modal" :style="{top: `${emY}px`, left: `${emX}px`}">
            <input type="text" class="icons-search-keyword" placeholder="Search..." v-model="iconsSearchQuery" @input="onIconSearchInput"/>
            <div class="icons-container">
                <Pagination
                    :key="`icons-pagination-${iconsPages}`"
                    :currentPage="iconsCurrentPage"
                    :totalPages="iconsPages"
                    @page-clicked="onIconsPage"
                    />

                <ul class="icons">
                    <li v-for="icon in pageIcons" :title="icon.searchTerms.join(', ')" @click="insertIcon(icon.iconClass)">
                        <i :class="icon.iconClass"></i>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import { getTextIconsIndex } from '../../../app/client/clientCommons';
import { createDelayer } from '../../../delayer';
import Pagination from '../../Pagination.vue';

export default {
    props: {
        editor     : {required: true},
        linkEnabled: {type: Boolean, default: true},
    },

    components: {Pagination},

    data() {
        return {
            iconsModalShown : false,
            //iconsModal X and Y
            emX: 0,
            emY: 0,
            iconsLoading: false,
            iconsIndex: [],
            iconsPages: 0,
            iconsCurrentPage: 1,
            iconsSearchQuery: '',
            filteredIcons: [],
            pageIcons: [],
            iconsMaxPageSize: 63,
            iconFilterDelayer: createDelayer(300, () => {
                this.filterIcons();
            }),
        };
    },

    mounted() {
        document.body.addEventListener('click', this.onGlobalClick);
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onGlobalClick);
        this.iconFilterDelayer.destroy();
    },

    methods: {
        onGlobalClick(event) {
            if (!event.target.closest('body')) {
                // this happens due to a race condition between the events triggered by clicking pagination link
                // and a global click handler.
                // when user clicks pagination links - it updates the dom of pagination links
                // and the original link is no longer attached to dom. Therefore it is not possible to check if the
                // event.target is inside of the modal
                return;
            }
            const modalSelector = '.rich-text-editor-icons-modal';
            const modalToggleButtonSelector = 'span[data-type="icon-modal-toggle-button"]';

            if (this.iconsModalShown && !(event.target.closest(modalSelector) || event.target.closest(modalToggleButtonSelector))) {
                this.iconsModalShown = false;
            }
        },

        filterIcons() {
            this.iconsCurrentPage = 1;
            if (this.iconsSearchQuery) {
                const words = this.iconsSearchQuery.trim().split(/\s+/);
                this.filteredIcons = this.iconsIndex.filter(iconData => {
                    for (let i = 0; i < words.length; i++) {
                        let wordMatched = false;
                        for (let j = 0; j < iconData.searchTerms.length && !wordMatched; j++) {
                            wordMatched = iconData.searchTerms[j].indexOf(words[i]) >= 0;
                        }
                        if (!wordMatched) {
                            return false;
                        }
                    }
                    return true;
                });
            } else {
                this.filteredIcons = [].concat(this.iconsIndex);
            }


            this.pageIcons = this.filteredIcons.slice(0, this.iconsMaxPageSize);
            this.iconsPages = Math.ceil(this.filteredIcons.length / this.iconsMaxPageSize);
        },

        onIconsPage(page) {
            page = Math.max(1, Math.min(page, this.iconsPages));
            const idx1 = (page-1) * this.iconsMaxPageSize;
            const idx2 = page * this.iconsMaxPageSize;
            this.pageIcons = this.filteredIcons.slice(idx1, idx2);
            this.iconsCurrentPage = page;
        },

        toggleIconsPopup(event) {
            if (this.iconsModalShown) {
                this.iconsModalShown = true;
                return;
            }
            this.iconsLoading = true;
            getTextIconsIndex().then(index => {
                this.iconsLoading = false;
                if (Array.isArray(index)) {
                    this.iconsIndex = index;
                }
                this.filteredIcons = [].concat(this.iconsIndex);
                this.pageIcons = this.filteredIcons.slice(0, this.iconsMaxPageSize);
                this.iconsPages = Math.ceil(this.filteredIcons.length / this.iconsMaxPageSize);
                this.iconsCurrentPage = 1;
            });

            if (this.iconsModalShown) {
                this.iconsModalShown = false;
                return;
            }
            const box = event.target.getBoundingClientRect();
            this.emX = box.left;
            this.emY = box.bottom;
            this.iconsModalShown = true;
            this.$nextTick(() => {
                const box = this.$refs.iconsModal.getBoundingClientRect();
                const rightOffset = Math.min(0, window.innerWidth - box.right - 5);
                const topOffset = Math.min(0, window.innerHeight - box.bottom - 5);
                this.emX += rightOffset;
                this.emY += topOffset;
            });
        },

        insertIcon(iconClass) {
            this.editor.commands.insertContent({type: 'icon', attrs: {class: `icon icon-fa ${iconClass}`}});
            this.iconsModalShown = false;
        },

        onIconSearchInput($event) {
            this.iconFilterDelayer.delay();
        }
    }
}
</script>