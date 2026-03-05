<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Export as HTML" @close="$emit('close')" primaryButton="Export" @primary-submit="exportSubmitted">
        <p>
            Exports diagram into a separate HTML page with standalone Schemio player.
            It packages your diagram together with Schemio javascript files into a zip archive.
        </p>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import { exportSchemeAsStandaloneArchive } from '../../standalone-exporter';
import StoreUtils from '../../store/StoreUtils';

export default {
    props: ['scheme'],

    components: {Modal},

    data() {
        return {
        };
    },

    methods: {
        exportSubmitted() {
            exportSchemeAsStandaloneArchive(this.scheme, this.$store.state.apiClient, this.$store.state.assetsPath)
            .then(content => {
                this.saveAs('scheme.zip', content);
                this.$emit('close');
            }).catch(err => {
                console.error('failed to export standalone HTML player', err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to export as HTML')
            });
        },

        saveAs(fileName, content) {
            const dataUrl = `data:application/zip;base64,${content}`;

            const link = document.createElement('a');
            document.body.appendChild(link);

            try {
                link.href = dataUrl;
                link.download = fileName;
                link.click();
            } catch(e) {
                console.error(e);
            }
            setTimeout(() => document.body.removeChild(link), 100);
        }
    }
}
</script>