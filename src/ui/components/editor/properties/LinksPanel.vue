<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <panel name="Links">
        <div v-if="!item.links || item.links.length === 0">There are no links</div>
        <ul class="links-editor">
            <li v-for="(link, linkId) in item.links">
                <a class="link" :href="link.url" target="_blank">
                   <i :class="getLinkCssClass(link)"></i>
                    {{link | formatLinkTitle }}
                </a>
                <span class="link edit-link" @click="editLink(linkId, link)"><i class="fas fa-pen-square"></i></span>
                <span class="link delete-link" @click="deleteLink(linkId)"><i class="fas fa-times"></i></span>
            </li>
        </ul>
        <span class="btn btn-secondary" v-on:click="addLink()"><i class="fas fa-link"></i> Add</span>


        <link-edit-popup v-if="editLinkData"
            :edit="editLinkData.edit" :title="editLinkData.title" :url="editLinkData.url" :type="editLinkData.type"
            @submit-link="onLinkSubmit"
            @close="editLinkData = null"/>
    </panel>
</template>

<script>
import LinkEditPopup from '../LinkEditPopup.vue';
import Panel from '../Panel.vue';
import linkTypes from '../LinkTypes.js';
import EditorEventBus from '../EditorEventBus.js';
import shortid from 'shortid';

export default {
    props: {
        editorId: {type: Object, required: true},
        item: {type: Object, required: true}
    },
    components: { Panel, LinkEditPopup },

    data() {
        return {
            editLinkData: null
        };
    },

    methods: {
        getLinkCssClass(link) {
            return linkTypes.findTypeByNameOrDefault(link.type).cssClass;
        },
        addLink() {
            this.editLinkData = {
                linkId: -1,
                edit: false,
                title: '',
                url: '',
                type: ''
            };
        },
        deleteLink(linkId) {
            this.item.links.splice(linkId, 1);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },
        editLink(linkId, link) {
            this.editLinkData = {
                linkId: linkId,
                edit: true,
                title: link.title,
                url: link.url,
                type: link.type
            };
        },
        onLinkSubmit(link) {
            if (this.editLinkData.linkId >= 0) {
                this.item.links[this.editLinkData.linkId].title = link.title;
                this.item.links[this.editLinkData.linkId].url = link.url;
                this.item.links[this.editLinkData.linkId].type = link.type;
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.links.${this.editLinkData.linkId}`);
            } else {
                if (!this.item.links) {
                    this.item.links = [];
                }
                this.item.links.push({
                    id: shortid.generate(),
                    title: link.title,
                    url: link.url,
                    type: link.type
                });
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            }
        },
    },
    filters: {
        formatLinkTitle(link) {
            if (link.title) {
                return link.title;
            } else {
                return link.url;
            }
        }
    }
}
</script>

<style lang="css">
</style>
