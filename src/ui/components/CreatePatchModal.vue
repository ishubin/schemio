<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Create patch" @close="$emit('close')" primaryButton="Create" @primary-submit="onCreatePatch">
        <span class="btn btn-primary" @click="schemeSearchModalShown = true">Choose base diagram</span>

        <div v-if="isLoading" class="loader">
            <div class="loader-element"></div>
        </div>
        <div v-else>
            <div v-if="patch">

            </div>
            <div v-else-if="errorMessage" class="msg msg-error">
                {{errorMessage}}
            </div>
            <div v-else class="hint">
                Select a base diagram for which you want to generate a patch
            </div>

        </div>

        <scheme-search-modal v-if="schemeSearchModalShown" @close="schemeSearchModalShown = false" @selected-scheme="onBaseSelected"></scheme-search-modal>
    </modal>
</template>

<script>
import Modal from './Modal.vue';
import SchemeSearchModal from './editor/SchemeSearchModal.vue';
import {generateSchemePatch} from '../scheme/SchemePatch';

export default {
    props: ['scheme'],

    components: {Modal, SchemeSearchModal},
    
    data() {
        return {
            schemeSearchModalShown: false,
            patch: null,
            isLoading: false,
            errorMessage: null
        };
    },

    methods: {
        onCreatePatch() {
            this.$emit('close');
        },

        onBaseSelected(baseSchemeRef) {
            this.schemeSearchModalShown = false;
            this.loadBaseScheme(baseSchemeRef.id);
        },

        loadBaseScheme(id) {
            this.isLoading = true;
            this.errorMessage = null;
            this.$store.state.apiClient.getScheme(id)
            .then(baseScheme => {
                this.isLoading = false;
                this.patch = generateSchemePatch(baseScheme.scheme, this.scheme);
                console.log(this.patch);
            })
            .catch(err => {
                console.error(err);
                this.errorMessage = 'Something went wrong, failed to load base diagram';
            });
        }
    }
}
</script>