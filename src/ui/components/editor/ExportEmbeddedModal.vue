<template>
    <modal title="Export as Embedded iframe" @close="$emit('close')" primary-button="Copy to Clipboard" @primary-submit="copyToClipboard()">
        <textarea class="textfield" :value="iframeContent"></textarea>

        <div style="height: 60px; position: relative;">
            <div class="msg msg-info" style="position: absolute; width: 100%;" v-if="message">{{message}}</div>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';

export default {
    props: ['scheme', 'projectId'],

    components: {Modal},

    data() {
        const url = new URL(window.location);
        return {
            iframeContent: `<iframe width="800" height="600" src="${url.protocol}//${url.host}/embed/${this.projectId}/schemes/${this.scheme.id}" frameborder="0" allowfullscreen></iframe>`,
            message: '',
        };
    },

    methods: {
        copyToClipboard() {
            navigator.clipboard.writeText(this.iframeContent)
            .then(() => {
                this.message = 'Copied to clipboard';
            });
        }
    }
}
</script>