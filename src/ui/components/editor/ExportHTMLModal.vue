<template>
    <modal title="Export as HTML" @close="$emit('close')" primaryButton="Export" @primary-submit="exportSubmitted">
        <p>
            Exports scheme into a separate HTML page with standalone Schemio player.
            It packages your scheme together with Schemio javascript files into a zip archive.
        </p>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import JSZip from 'jszip';
import utils from '../../utils';
import axios from 'axios';

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

            Promise.all([
                axios.get('/schemio-standalone.css'),
                axios.get('/schemio-standalone.html'),
                axios.get('/standalone.js'),
            ]).then(values => {
                const css  = values[0].data;
                const html = values[1].data;
                const js   = values[2].data;

                zip.file('schemio-standalone.css', css);
                zip.file('index.html', html);
                zip.file('schemio-standalone.js', js);

                zip.generateAsync({type: 'base64'})
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