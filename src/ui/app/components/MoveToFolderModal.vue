<template>
    <Modal title="Move to category" @close="$emit('close')" :primaryButton="primaryButton" @primary-submit="moveToCurrentLocation">
        <div v-if="errorMessage" class="msg msg-error">{{errorMessage}}</div>

        <ul class="breadcrumbs">
            <li v-for="(entry, entryIdx) in breadcrumbs">
                <span class="breadcrumb-link" @click="selectNewPath(entry.path)">{{entry.name}}</span>
                <i v-if="entryIdx < breadcrumbs.length - 1" class="fas fa-caret-right breadcrumb-separator"></i>
            </li>
        </ul>
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
import { buildBreadcrumbs } from '../breadcrumbs';

export default {
    components: { Modal },
    props: {
        apiClient: {type: Object},
        path     : {type: String, default: ''},
        source   : {type: Object, required: true},
    },

    beforeMount() {
        this.selectNewPath(this.path);
    },

    data() {
        return {
            selectedPath: this.path,
            breadcrumbs: [],
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
            if (this.source.kind === 'dir' && this.source.path === path) {
                return;
            }
            this.selectedPath = path;
            
            this.breadcrumbs = buildBreadcrumbs(path);
            this.$forceUpdate();

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
        },

        moveToCurrentLocation() {
            this.moveTo(this.selectedPath);
        },

    },

    computed: {
        primaryButton() {
            if (this.selectedPath !== this.path) {
                return 'Move here';
            }
            return null;
        }
    }
}
</script>