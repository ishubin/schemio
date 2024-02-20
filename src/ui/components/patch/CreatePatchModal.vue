<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Create patch" @close="$emit('close')" primaryButton="Download" :primaryButtonDisabled="primaryButtonDisabled" @primary-submit="onDownloadPatch">
        <span class="btn btn-primary" v-if="!originScheme" @click="schemeSearchModalShown = true">Choose base diagram</span>

        <div v-if="isLoading" class="loader">
            <div class="loader-element"></div>
        </div>
        <div v-else>
            <div v-if="patch && originSchemeContainer">
                <patch-details :originSchemeContainer="originSchemeContainer" :modifiedSchemeContainer="modifiedSchemeContainer" :patch="patch"/>

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
import Modal from '../Modal.vue';
import SchemeSearchModal from '../editor/SchemeSearchModal.vue';
import { generateSchemePatch } from '../../scheme/SchemePatch';
import { downloadContent } from '../../downloader';
import PatchDetails from './PatchDetails.vue';
import SchemeContainer from '../../scheme/SchemeContainer';


export default {
    props: ['scheme', 'originScheme', 'editorId'],

    components: {Modal, SchemeSearchModal, PatchDetails},

    data() {
        return {
            schemeSearchModalShown : false,
            patch                  : null,
            isLoading              : false,
            errorMessage           : null,
            originSchemeContainer  : null,
            modifiedSchemeContainer: new SchemeContainer(this.scheme, this.editorId, 'edit', this.$store.state.apiClient)
        };
    },

    beforeMount() {
        if (this.originScheme) {
            this.originSchemeContainer = new SchemeContainer(this.originScheme, this.editorId, 'edit', this.$store.state.apiClient);
            this.patch = generateSchemePatch(this.originSchemeContainer.scheme, this.scheme);
        }
    },

    methods: {
        onDownloadPatch() {
            if (this.patch) {
                downloadContent('patch.json', 'application/json', JSON.stringify(this.patch));
            }
        },

        onBaseSelected(baseSchemeRef) {
            this.schemeSearchModalShown = false;
            this.loadBaseScheme(baseSchemeRef.id);
        },

        loadBaseScheme(id) {
            this.isLoading = true;
            this.errorMessage = null;
            this.$store.state.apiClient.getScheme(id)
            .then(originScheme => {
                this.isLoading = false;
                // we need to wrap it into SchemeContainer so that it enriches all missing fields
                // of all items with their defaults
                this.originSchemeContainer = new SchemeContainer(originScheme.scheme, this.editorId, 'edit', this.$store.state.apiClient);
                this.patch = generateSchemePatch(this.originSchemeContainer.scheme, this.scheme);
            })
            .catch(err => {
                console.error(err);
                this.errorMessage = 'Something went wrong, failed to load base diagram';
            });
        }
    },

    computed: {
        primaryButtonDisabled() {
            return this.patch === null;
        }
    }
}
</script>