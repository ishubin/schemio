<template lang="html">
    <modal :title="title" @close="$emit('close')" :width="width">
        <div class="textarea-enlarged-container">
            <div class="toolbar">
                <ul class="button-group">
                    <li v-for="mode in modes">
                        <span class="toggle-button"
                            :class="{'toggled': mode === currentMode}"
                            @click="currentMode = mode"
                            >{{mode}}</span>
                    </li>
                </ul>
            </div>

            <div :style="{height: height + 'px'}">
                <textarea v-model="textareaText" v-if="currentMode === 'edit'"></textarea>
                <div v-else class="markdown-preview">
                    <vue-markdown :source="textareaText" class="markdown"></vue-markdown>
                </div>
            </div>
        </div>
    </modal>
</template>

<script>
import Modal from './Modal.vue';
import VueMarkdown from 'vue-markdown';

export default {
    props: {
        title: {
            type: String,
            default: 'Text Editor'
        },
        text: String
    },
    components: {Modal, VueMarkdown},
    mounted() {

    },
    data() {
        return {
            textareaText: this.text,
            currentMode: 'edit',
            modes: ['edit', 'view'],
            width: window.innerWidth - 100,
            height: window.innerHeight - 240
        }
    },

    watch: {
        textareaText(newText) {
            this.$emit('changed', newText);
        }
    }
}
</script>

<style lang="css">
</style>
