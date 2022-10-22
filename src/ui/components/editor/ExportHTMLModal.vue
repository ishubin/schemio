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
import JSZip from 'jszip';
import utils from '../../utils';

export default {
    props: ['scheme'],

    components: {Modal},

    data() {
        return {
        };
    },

    methods: {
        exportSubmitted() {
            const zip = new JSZip();

            const scheme = utils.clone(this.scheme);

            zip.file('scheme.json', JSON.stringify(scheme));

            this.$store.state.apiClient.getExportHTMLResources(this.$store.state.assetsPath).then(resources => {
                zip.file('schemio-standalone.css', resources.css);
                zip.file('index.html', resources.html);
                zip.file('schemio-standalone.js', resources.js);
                zip.file('syntax-highlight-worker.js', resources.syntaxHighlightWorker);
                zip.file('syntax-highlight.css', resources.syntaxHighlightCSS);

                zip.generateAsync({
                    type: 'base64',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 9
                    }
                })
                .then(content => {
                    this.saveAs('scheme.zip', content);
                    this.$emit('close');
                });
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