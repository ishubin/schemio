<template>
    <modal title="Import Scheme" @close="$emit('close')" primaryButton="Import" @primary-submit="onImportSubmitted">
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