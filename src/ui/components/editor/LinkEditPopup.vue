<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal :title="popupTitle" :primary-button="submitTitle" @primary-submit="submitLink()" @close="$emit('close')">
       <h5>Title</h5>
       <input type="text" class="textfield" v-model="editTitle"/>

       <h5>Type</h5>
        <div class="toggle-group">
            <span v-for="linkType in knownTypes" class="toggle-button"
                :class="{toggled: linkType.name === editType}" @click="editType = linkType.name">
                <i :class="linkType.cssClass"></i> {{linkType.name}}
            </span>
        </div>

       <h5>URL</h5>
       <div v-if="editType === 'doc'" class="scheme-ref-control">
            <input type="text" class="textfield" v-model="editUrl"/>
            <span class="btn btn-secondary" @click="toggleSchemeSearch"><i class="fas fa-search"></i></span>
       </div>
       <div v-else>
           <input type="text" class="textfield" v-model="editUrl"/>
       </div>

       <scheme-search-modal v-if="showSchemeSearchModal" @close="showSchemeSearchModal = false" @selected-scheme="onSchemeSelect"></scheme-search-modal>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import SchemeSearchModal from './SchemeSearchModal.vue';
import linkTypes from './LinkTypes.js';

export default {
    props: ['edit', 'title', 'url', 'type'],
    components : {Modal, SchemeSearchModal},

    data() {
        return {
            popupTitle: this.edit ? 'Edit Link' : 'Create Link',
            submitTitle: this.edit ? 'Update' : 'Create',
            editTitle: this.title,
            editUrl: this.url,
            editType: this.type && this.type.length > 0 ? this.type : 'default',
            knownTypes: linkTypes.knownTypes,
            showSchemeSearchModal: false
        }
    },
    methods: {
        submitLink() {
            this.$emit('submit-link', {
                title: this.editTitle,
                url: this.editUrl,
                type: this.editType
            });
            this.$emit('close');
        },

        toggleSchemeSearch() {
            this.showSchemeSearchModal = true;
        },

        onSchemeSelect(scheme) {
            this.editType = 'doc';
            this.editUrl = scheme.publicLink;

            if (!this.editTitle) {
                this.editTitle = scheme.name;
            }
            this.showSchemeSearchModal = false;
        }
    }
}
</script>

<style lang="css">
</style>
