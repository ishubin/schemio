<template>
    <modal title="Export as link" @close="$emit('close')">
        <p>
            Exports diagram as a URL
            <span class="btn btn-secondary" @click="copyToClipboard">Copy to Clipboard</span>
        </p>

        <textarea ref="textarea" name="link" style="width: 100%" rows="30" :value="link" readonly="readonly"></textarea>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import JSZip from 'jszip';
import utils from '../../utils';
import { defaultifyScheme } from './../../scheme/Scheme';
import { copyToClipboard } from '../../clipboard';

export default {
    props: ['scheme'],

    components: {Modal},

    beforeMount() {
        const schemeJSON = JSON.stringify(defaultifyScheme(utils.sanitizeScheme(utils.clone(this.scheme))));

        const zip = new JSZip();
        zip.file('doc.json', schemeJSON);
        zip.generateAsync({
            type: 'base64',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        })
        .then(base64Content => {
            // Escaping some symbols as it might break link parsing in various applications

            const chars = {'+': '.', '/': '_', '=': '-'};
            const content = base64Content.replace(/[+/=]/g, m => chars[m]);
            const mode = this.$router ? this.$router.mode : 'history';

            const routeName = 'offline-editor';

            let path = '';
            if (mode === 'hash') {
                path = `/#/${routeName}/?doc=${content}`;
            } else {
                path = `/${routeName}#doc=${content}`;
            }
            this.link = window.location.origin + path;

            this.$nextTick(() => {
                this.$refs.textarea.focus();
                this.$refs.textarea.select();
            });
        });
    },

    data() {
        return {
            link: ''
        };
    },

    methods: {
        copyToClipboard() {
            copyToClipboard(this.link);
        }
    }
}
</script>