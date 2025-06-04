<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="New Diagram" primaryButton="Create" @primary-submit="submitNewScheme()" @close="$emit('close')">
        <h5>Name</h5>
        <input ref="schemeNameInput" class="textfield" :class="{'field-error' : mandatoryFields.name.highlight}"
            type="text"
            v-model="schemeName"
            placeholder="Name..."
            v-on:keyup.enter="submitNewScheme()"
            />

        <h5>Description</h5>
        <RichTextEditor :value="schemeDescription" @changed="schemeDescription = $event" />

        <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

    </modal>
</template>

<script>
import RichTextEditor from './editor/text-editor/RichTextEditor.vue';
import Modal from './Modal.vue';

export default {
    components: {Modal, RichTextEditor},
    props: {
        name         : {type: String, default: ''},
        description  : {type: String, default: ''},
    },

    mounted() {
        this.$refs.schemeNameInput.focus();
    },

    data() {
        return {
            schemeName: this.name,
            schemeDescription: this.description,
            imageUrl: '',

            mandatoryFields: {
                name: {
                    highlight: false
                }
            },

            errorMessage: null,
        }
    },

    methods: {
        submitNewScheme() {
            const name = this.schemeName.trim();
            if (name) {
                this.$emit('scheme-submitted', {
                    name: name,
                    description: this.schemeDescription,
                    tags: [],
                    items: []
                });

            } else {
                this.mandatoryFields.name.highlight = true;
                this.errorMessage = 'Diagram name should not be empty';
            }
        },
    }
}
</script>

<style lang="css">
</style>
