<template>
    <Modal title="Move to category" @close="$emit('close')">
        <div v-if="errorMessage" class="msg msg-error">{{errorMessage}}</div>

        <div class="entries-path">{{selectedPath}}</div>
        <div class="entries-container">
            <div v-if="isLoading">
                <i class="fas fa-spinner fa-spin fa-1x"></i>
                <span>Loading...</span>
            </div>
            <ul v-else class="entries">
                <li v-for="entry in entries">
                    <div class="entry" :class="{disabled: entry.disabled}" @click="selectNewPath(entry.path)">
                        <i class="icon fas fa-folder fa-2x"></i> <span class="entry-link-text">{{entry.name}}</span>
                    </div>
                    <span v-if="!entry.disabled" class="entry-move-button btn btn-secondary" @click="moveTo(entry.path)">Move here</span>
                </li>
            </ul>
        </div>
    </Modal>
</template>

<script>
import Modal from '../../components/Modal.vue';
import filter from 'lodash/filter';
import map from 'lodash/map';

export default {
    components: { Modal },
    props: {
        apiClient: {type: Object},
        path     : {type: String, default: ''},
        source   : {type: Object, required: true},
    },

    beforeMount() {
        this.loadEntries();
    },

    data() {
        return {
            selectedPath: this.path,
            isLoading: true,
            entries: [],
            cachedEntries: new Map(),
            errorMessage: null
        };
    },

    methods: {
        loadEntries() {

            if (this.cachedEntries.has(this.selectedPath)) {
                this.entries = this.cachedEntries.get(this.selectedPath);
                this.isLoading = false;
                this.$forceUpdate();
                return;
            }

            this.isLoading = true;
            this.apiClient.listEntries(this.selectedPath).then(result => {
                const filteredEntries = map(filter(result.entries, entry => entry.kind === 'dir'), entry => {
                    entry.disabled = this.source.kind === 'dir' && this.source.path === entry.path;
                    return entry;
                });
                this.cachedEntries.set(this.selectedPath, filteredEntries);
                this.entries = filteredEntries;
                this.isLoading = false;
                this.$forceUpdate();
            })
            .catch(err => {
                console.error(err);
                this.isLoading = false;
                this.errorMessage = 'Failed to load directories';
            });
        },

        selectNewPath(path) {
            this.selectedPath = path;
            this.loadEntries();
        },

        moveTo(path) {
            if (this.source.kind === 'dir') {
                this.apiClient.moveDir(this.source.path, path).then(() => {
                    this.$emit('moved');
                });
            } else if (this.source.kind === 'scheme') {
                this.apiClient.moveScheme(this.source.path, this.source.id, path).then(() => {
                    this.$emit('moved');
                });
            }
        }
    }
}
</script>