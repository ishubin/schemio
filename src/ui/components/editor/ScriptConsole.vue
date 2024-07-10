<template>
    <div>
        <span class="toggle-button" title="Script console" @click="showConsole()">
            <i class="fa-solid fa-terminal"></i>
            <span v-if="entries.length > 0" class="notifier-marker" :class="{'notifier-error': isError}"></span>
        </span>

        <Modal v-if="modalShown" title="Console" @close="modalShown = false" :useMask="false"
            extraButton="Clear console"
            @extra-submit="clearConsole">
            <div class="script-console-container">
                <ul class="script-console-entries">
                    <li :class="`status-${entry.level}`" v-for="entry in entries">
                        <span class="console-status-label">{{ entry.level }}</span>
                        <div class="console-message">{{ entry.message }}</div>
                    </li>
                </ul>
            </div>
        </Modal>
    </div>
</template>

<script>
import EditorEventBus from './EditorEventBus';
import Modal from '../Modal.vue';

export default {
    props: {
        editorId: {type: String, required: true},
        newEntries : {type: Array, default: () => []}
    },

    components: {Modal},

    beforeMount() {
        EditorEventBus.scriptLog.$on(this.editorId, this.addLogEntry);
    },

    beforeDestroy() {
        EditorEventBus.scriptLog.$off(this.editorId, this.addLogEntry);
    },

    data() {
        const entries = [].concat(this.newEntries);
        return {
            entries: entries,
            modalShown: false,
            isError: entries.indexOf(e => e.level === 'error') >= 0
        };
    },

    methods: {
        showConsole() {
            this.modalShown = true;
        },

        addLogEntry(level, message) {
            if (level === 'error') {
                this.isError = true;
            }
            this.entries.push({level, message});
        },

        clearConsole() {
            this.entries = [];
        }
    },

    watch: {
        newEntries(newEntries) {
            if (Array.isArray(newEntries)) {
                newEntries.forEach(entry => {
                    this.entries.push(entry);
                    if (entry.level === 'error') {
                        this.isError = true;
                    }
                });
            }
        }
    }
}
</script>