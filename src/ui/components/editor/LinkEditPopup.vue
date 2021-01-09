<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal :title="popupTitle" :primary-button="submitTitle" @primary-submit="submitLink()" @close="$emit('close')">
       <h5>Title</h5>
       <input type="text" class="textfield" v-model:value="editTitle"/>

       <h5>Type</h5>
       <select v-model="editType">
           <option v-for="type in knownTypes">{{type.name}}</option>
       </select>

       <h5>URL</h5>
       <div v-if="editType === 'scheme'">
           <table width="100%">
               <tbody>
                   <tr>
                       <td v-if="projectId" width="30px">
                           <span class="btn btn-secondary"><i class="fas fa-search" @click="toggleSchemeSearch"></i></span>
                       </td>
                       <td>
                           <input type="text" class="textfield" v-model:value="editUrl"/>
                       </td>
                   </tr>
               </tbody>
           </table>
       </div>
       <div v-else>
           <input type="text" class="textfield" v-model:value="editUrl"/>
       </div>

       <scheme-search-modal v-if="showSchemeSearchModal" :projectId="projectId" @close="showSchemeSearchModal = false" @selected-scheme="onSchemeSelect"></scheme-search-modal>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import SchemeSearchModal from './SchemeSearchModal.vue';
import linkTypes from './LinkTypes.js';

export default {
    props: ['edit', 'title', 'url', 'type', 'projectId'],
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
            this.editType = 'scheme';
            this.editUrl = scheme.id;
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
