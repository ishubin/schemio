<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Import Diagram" @close="$emit('close')" primaryButton="Import" @primary-submit="onImportSubmitted">
        Are you sure you want to import <b>{{scheme.name}}</b>? All your current changes will be lost and overwritten with this scheme.
    </modal>
</template>
<script>
import Modal from '../Modal.vue';

export default {
    props: ['scheme'],

    components: {Modal},

    methods: {
        onImportSubmitted() {
            this.$emit('import-scheme-submitted', this.scheme);
            this.$emit('close');
        }
    }
}
</script>