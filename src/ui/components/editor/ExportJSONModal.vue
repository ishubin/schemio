<template>
    <modal title="Export as JSON" @close="$emit('close')" primaryButton="Export" @primary-submit="onExportSubmitted">
        <p>
            Exports scheme as JSON. You can later import the scheme back.
        </p>
        <input type="checkbox" v-model="optimized" id="chk-export-json-optimized"><label for="chk-export-json-optimized"> Optimized</label>
        <p v-if="optimized">
            With <b>optimized</b> export it will remove all the fields that have default values, and thus will only export fields that you have modified
        </p>
        <p v-else>
            With <b>unoptimized</b> export it will export all fields in the document.
        </p>
    </modal>
</template>


<script>
import Modal from '../Modal.vue';
import { defaultifyScheme } from './../../scheme/Scheme';
import utils from '../../utils';

export default {
    props: ['scheme'],

    components: {Modal},

    data() {
        return {
            optimized: true
        };
    },

    methods: {
        onExportSubmitted() {
            let scheme = utils.sanitizeScheme(utils.clone(this.scheme));
            if (this.optimized) {
                scheme = defaultifyScheme(scheme);
            }
            this.saveAs(`${this.scheme.name}.json`, JSON.stringify(scheme));
            this.$emit('close');
        },

        saveAs(fileName, content) {
            fileName = fileName.replace(/[^a-zA-Z0-9\-\_\.]/g, '-').replace(/\s/g, '-');
            const dataUrl = `data:application/json;base64,${btoa(content)}`;

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