<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template lang="html">
    <div class="rich-text-editor-container">
        <textarea :value="value"></textarea>
        <modal v-if="linkModal.shown" title="Add Link" @close="linkModal.shown = false" primary-button="Save" @primary-submit="onLinkModalSubmit">
            <input class="textfield" v-model="linkModal.url" placeholder="https://"  @keyup.enter="onLinkModalSubmit"/>
        </modal>
    </div>
</template>

<script>
import Modal from './Modal.vue';


export default {
    props: {
        value   : {type: String},
        id      : {type: String},
        width   : {type: String, default: '100%'},
        height  : {type: String, default: '150px'}
    },
    components: {Modal},

    beforeMount() {
    },
    beforeDestroy() {
    },

    data() {
        return {
            focused: false,
            enlarged: false,
            enlargedWidth: window.innerWidth - 100,
            enlargedHeight: window.innerHeight - 340,
            linkModal: {
                shown: false,
                url: '',
                linkCommand: null
            }
        };
    },

    methods: {
        toggleLink(linkCommand, linkAttrs) {
            this.linkModal.linkCommand = linkCommand;
            if (linkAttrs.href) {
                this.linkModal.url = linkAttrs.href.trim();
            }
            this.linkModal.shown = true;
        },

        onLinkModalSubmit() {
            const url = this.linkModal.url.trim();
            if (url) {
                this.linkModal.linkCommand({ href: url });
            } else {
                this.linkModal.linkCommand({ href: null });
            }
            this.linkModal.shown = false;
        }
    },

    watch: {
        // Used in order to track switching from one item to another.
        // In such cases we should reset the text in the text area.
        // Otherwise it will not get updated
        id(val) {
            this.editorLarge.setContent(this.value);
            this.editor.setContent(this.value);
        }
    }
}
</script>
