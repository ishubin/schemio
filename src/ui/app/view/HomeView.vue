<template>
    <div class="middle-content">
        <div class="fs-toolbar">
            <span class="btn btn-secondary" @click="showNewDirectoryModel()">
                <i class="fas fa-folder-plus"></i> New directory
            </span>
            <span class="btn btn-secondary" @click="showNewSchemeModel()">
                <i class="fas fa-file"></i> Create Scheme
            </span>
        </div>
        <table class="entries-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Modified</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(entry, entryIdx) in entries">
                    <td>
                        <a class="entry-link" v-if="entry.kind === 'dir'" :href="`/?path=${entry.encodedPath}`">
                            <i class="icon fas fa-folder fa-2x"></i> <span class="entry-link-text">{{entry.name}}</span>
                        </a>
                        <a class="entry-link" v-else-if="entry.kind === 'scheme'" :href="`/scheme?path=${entry.encodedPath}&id=${entry.id}`">
                            <img class="scheme-preview" :src="`/media/scheme-preview/${entry.id}?v=${entry.encodedTime}`"/>
                            <span class="entry-link-text">{{entry.name}}</span>
                        </a>
                    </td>
                    <td class="time-column">
                        <span v-if="entry.modifiedTime">{{entry.modifiedTime}}</span>
                    </td>
                    <td class="operation-column">
                        <menu-dropdown name="" iconClass="fas fa-ellipsis-v" :options="entry.menuOptions"
                            @delete="onDeleteEntry(entry)"
                            @rename="onRenameEntry(entry, entryIdx)"
                            />
                    </td>
                </tr>
            </tbody>
        </table>

        <modal v-if="newDirectoryModal.shown" title="New Directory" @close="newDirectoryModal.shown = false" primaryButton="Create" @primary-submit="submitNewDirectory()">
            <input type="text" class="textfield" v-model="newDirectoryModal.name" placeholder="Type name of new directory..."/>

            <div class="msg msg-error" v-if="newDirectoryModal.errorMessage">{{newDirectoryModal.errorMessage}}</div>
        </modal>

        <modal v-if="deleteEntryModal.shown" title="Confirm delete" @close="deleteEntryModal.shown = false" primaryButton="Delete" @primary-submit="confirmDeleteEntry(deleteEntryModal.entry)">
            Are you sure you want to delete
            <span v-if="deleteEntryModal.entry.kind === 'dir'">
                <b>{{deleteEntryModal.entry.name}}</b> and all of its documents?
            </span>
            <span v-else>
                scheme <b>{{deleteEntryModal.entry.name}}</b>?
            </span>

            <div class="msg msg-error" v-if="deleteEntryModal.errorMessage">{{deleteEntryModal.errorMessage}}</div>
        </modal>

        <modal v-if="renameEntryModal.shown" :title="renameEntryModalTitle" @close="renameEntryModal.shown = false" primaryButton="Rename" @primary-submit="confirmEntryRename()">
            <input ref="renameEntryModalInput" type="text" class="textfield" v-model="renameEntryModal.name"/>

            <div class="msg msg-error" v-if="renameEntryModal.errorMessage">{{renameEntryModal.errorMessage}}</div>
        </modal>

        <CreateNewSchemeModal v-if="newSchemeModal.shown"
            :categoriesEnabled="false"
            :apiClient="apiClient"
            @scheme-created="onSchemeCreated"
            @close="newSchemeModal.shown = false"
        />
    </div>
</template>

<script>
import { createApiClient } from '../apiClient';
import forEach from 'lodash/forEach';
import Modal from '../../components/Modal.vue';
import CreateNewSchemeModal from '../../components/CreateNewSchemeModal.vue';
import MenuDropdown from '../../components/MenuDropdown.vue';


function isValidCharCode(code) {
    return (code >= 48 && code <= 57) 
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code === 32
        || (code >= 39 && code <= 46);
}

export default {

    components: {Modal, CreateNewSchemeModal, MenuDropdown},
    
    beforeMount() {
        this.apiClient.listEntries(this.path)
        .then(result => {
            forEach(result.entries, entry => {
                entry.encodedPath = encodeURIComponent(entry.path);
                entry.menuOptions = [{
                    name: 'Delete',
                    iconClass: 'fas fa-trash',
                    event: 'delete'
                }, {
                    name: 'Rename',
                    iconClass: 'fas fa-edit',
                    event: 'rename'
                }];

                if (entry.kind === 'scheme') {
                    entry.encodedTime = encodeURIComponent(new Date(entry.modifiedTime).getTime());
                }
            });
            this.entries = result.entries;

        }).catch(err => {
            this.errorMessage = 'Oops, something went wrong';
        })
    },

    data() {
        const path = this.$route.query.path || ''; 
        return {
            path: path,
            entries: [],
            errorMessage: null,

            newDirectoryModal: {
                name: '',
                shown: false,
                errorMessage: null
            },

            newSchemeModal: {
                shown: false
            },

            deleteEntryModal: {
                entry: null,
                shown: false,
                errorMessage: null
            },

            renameEntryModal: {
                entryIdx: -1,
                name: '',
                kind: null,
                shown: false,
                errorMessage: null
            },

            apiClient: createApiClient(path)
        };
    },

    methods: {
        showNewSchemeModel() {
            this.newSchemeModal.shown = true;
        },

        showNewDirectoryModel() {
            this.newDirectoryModal.name = '';
            this.newDirectoryModal.err = null;
            this.newDirectoryModal.shown = true;
        },

        submitNewDirectory() {
            this.newDirectoryModal.errorMessage = null;
            const name = this.newDirectoryModal.name.trim();
            if (!name) {
                this.newDirectoryModal.errorMessage = 'Directory name should not be empty';
                return;
            }

            for (let i = 0; i < name.length; i++) {
                if (!isValidCharCode(name.charCodeAt(i))) {
                    this.newDirectoryModal.errorMessage = 'Unsupported symbol: ' + name.charAt(i);
                    return;
                }
            }

            this.apiClient.createDirectory(name)
            .then(() => {
                window.location.reload();
            })
            .catch(err => {
                this.newDirectoryModal.errorMessage = 'Failed to create new directory';
            });
        },

        onSchemeCreated(scheme) {
            window.location = `/scheme?path=${encodeURIComponent(this.path)}&id=${encodeURIComponent(scheme.id)}#m:edit`;
        },

        onDeleteEntry(entry) {
            this.deleteEntryModal.entry = entry;
            this.deleteEntryModal.errorMessage = null;
            this.deleteEntryModal.shown = true;
        },

        confirmDeleteEntry(entry) {
            if (entry.kind === 'dir') {
                this.apiClient.deleteDir(entry.name).then(() => {
                    window.location.reload();
                })
                .catch(err => {
                    this.deleteEntryModal.errorMessage = 'Failed to delete directory';
                });
            } else if (entry.kind === 'scheme') {
                this.apiClient.deleteScheme(entry.id).then(() => {
                    window.location.reload();
                })
                .catch(err => {
                    this.deleteEntryModal.errorMessage = 'Failed to delete scheme';
                });
            }
        },

        onRenameEntry(entry, entryIdx) {
            this.renameEntryModal.name = entry.name;
            this.renameEntryModal.entryIdx = entryIdx;
            this.renameEntryModal.kind = entry.kind;
            this.renameEntryModal.shown = true;

            this.$nextTick(() => {
                const input = this.$refs.renameEntryModalInput;
                if (input) {
                    input.focus();
                }
            });
        },

        confirmEntryRename() {
            let name = this.renameEntryModal.name.trim();
            if (name.length === 0) {
                this.renameEntryModal.errorMessage = 'Name should not be empty';
                return;
            }
            const oldName = this.entries[this.renameEntryModal.entryIdx].name;
            if (oldName === this.renameEntryModal.name) {
                return;
            }
            if (this.renameEntryModal.kind === 'dir') {
                this.apiClient.renameDirectory(oldName, this.renameEntryModal.name).then(() => {
                    this.entries[this.renameEntryModal.entryIdx].name = this.renameEntryModal.name;
                    this.renameEntryModal.shown = false;
                })
                .catch(err => {
                    if (err.response  && err.response.status === 400) {
                        this.renameEntryModal.errorMessage = 'Such directory name is not allowed';
                    } else {
                        this.renameEntryModal.errorMessage = 'Sorry, something went wrong. Was not able to rename this directory';
                    }
                });
            } else if (this.renameEntryModal.kind === 'scheme') {
                this.apiClient.renameScheme(this.entries[this.renameEntryModal.entryIdx].id, this.renameEntryModal.name).then(() => {
                    this.entries[this.renameEntryModal.entryIdx].name = this.renameEntryModal.name;
                    this.renameEntryModal.shown = false;
                })
                .catch(err => {
                    if (err.response  && err.response.status === 400) {
                        this.renameEntryModal.errorMessage = 'Such scheme name is not allowed';
                    } else {
                        this.renameEntryModal.errorMessage = 'Sorry, something went wrong. Was not able to rename this scheme';
                    }
                });
            }
        }
    },

    computed: {
        renameEntryModalTitle() {
            if (this.renameEntryModal.kind === 'dir') {
                return 'Rename directory';
            } else if (this.renameEntryModal.kind === 'scheme') {
                return 'Rename scheme';
            }
            return 'Rename';
        }
    }
}
</script>