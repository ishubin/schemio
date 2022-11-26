<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Export as JSON" @close="$emit('close')" primaryButton="Export" @primary-submit="onExportSubmitted">
        <p>
            Exports diagram in JSON format.
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
import { downloadContent } from '../../downloader';

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
            downloadContent(fileName, 'aplication/json', content)
        }
    }
}
</script>