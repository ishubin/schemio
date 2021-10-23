<template>
    <div>
        <Header>
            <div slot="middle-section">
            </div>
        </Header>

        <div class="middle-content">
            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
            <div v-if="is404">
                <h4>Sorry, specfied path does not exist</h4>
            </div>
            <div v-else>
                <div class="fs-toolbar" v-if="!viewOnly">
                    <span class="btn btn-secondary" @click="showNewDirectoryModel()">
                        <i class="fas fa-folder-plus"></i> New directory
                    </span>
                    <span class="btn btn-secondary" @click="showNewSchemeModel()">
                        <i class="fas fa-file"></i> Create Scheme
                    </span>
                </div>

                <ul class="breadcrumbs">
                    <li v-for="(entry, entryIdx) in breadcrumbs">
                        <a class="breadcrumb-link" :href="`/f/${entry.path}`">{{entry.name}}</a>
                        <i v-if="entryIdx < breadcrumbs.length - 1" class="fas fa-caret-right breadcrumb-separator"></i>
                    </li>
                </ul>

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
                                <a class="entry-link" v-if="entry.kind === 'dir'" :href="`/f/${entry.path}`">
                                    <i class="icon fas fa-folder fa-2x"></i> <span class="entry-link-text">{{entry.name}}</span>
                                </a>
                                <a class="entry-link" v-else-if="entry.kind === 'scheme'" :href="`/schemes/${entry.fullPath}`">
                                    <img class="scheme-preview" :src="`/media/scheme-preview/${entry.id}?v=${entry.encodedTime}`"/>
                                    <span class="entry-link-text">{{entry.name}}</span>
                                </a>
                            </td>
                            <td class="time-column">
                                <span v-if="entry.modifiedTime">{{entry.modifiedTime | formatDateTime }}</span>
                            </td>
                            <td class="operation-column">
                                <menu-dropdown v-if="entry.name !== '..' && !viewOnly" name="" iconClass="fas fa-ellipsis-v" :options="entry.menuOptions"
                                    @delete="onDeleteEntry(entry)"
                                    @rename="onRenameEntry(entry, entryIdx)"
                                    @move="onMoveEntry(entry, entryIdx)"
                                    />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

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

            <MoveToFolderModal v-if="moveEntryModal.shown"
                :apiClient="apiClient"
                :source="moveEntryModal.source"
                :path="path"
                @close="moveEntryModal.shown = false"
                @moved="onEntryMoved"/>
        </div>
    </div>
</template>

<script>
import { createApiClient } from '../apiClient';
import forEach from 'lodash/forEach';
import Modal from '../../components/Modal.vue';
import CreateNewSchemeModal from '../../components/CreateNewSchemeModal.vue';
import MenuDropdown from '../../components/MenuDropdown.vue';
import MoveToFolderModal from '../components/MoveToFolderModal.vue';
import { buildBreadcrumbs } from '../breadcrumbs';
import Header from '../components/Header.vue';


function isValidCharCode(code) {
    return (code >= 48 && code <= 57) 
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code === 32
        || (code >= 39 && code <= 46);
}

export default {

    components: {Modal, CreateNewSchemeModal, MenuDropdown, MoveToFolderModal, Header},
    
    beforeMount() {
        this.apiClient.listEntries(this.path)
        .then(result => {
            forEach(result.entries, entry => {
                entry.menuOptions = [{
                    name: 'Delete',
                    iconClass: 'fas fa-trash',
                    event: 'delete'
                }, {
                    name: 'Rename',
                    iconClass: 'fas fa-edit',
                    event: 'rename'
                }, {
                    name: 'Move',
                    iconClass: 'fas fa-share',
                    event: 'move'
                }];

                if (entry.kind === 'scheme') {
                    entry.encodedTime = encodeURIComponent(new Date(entry.modifiedTime).getTime());
                    let fullPath = entry.path;
                    if (fullPath.charAt(fullPath.length - 1) !== '/') {
                        fullPath += '/';
                    }
                    entry.fullPath = fullPath + entry.id;
                }
            });
            this.entries = result.entries;
            this.viewOnly = result.viewOnly;
        }).catch(err => {
            if (err.response && err.response.status === 404) {
                this.is404 = true;
            } else {
                this.errorMessage = 'Oops, something went wrong';
            }
        })
    },

    data() {
        let path = this.$route.fullPath.trim();
        if (path === '/') {
            path = '';
        }
        if (path.indexOf('/f/') === 0) {
            path = decodeURI(path.substring(3));
        }

        return {
            path: path,
            breadcrumbs: buildBreadcrumbs(path),
            entries: [],
            errorMessage: null,
            viewOnly: true,

            is404: false,

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

            moveEntryModal: {
                entryIdx: -1,
                shown: false,
                errorMessage: null,
                source: null
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
            let url = '/schemes/';
            if (this.path) {
                url += this.path + '/';
            }
            url += scheme.id;
            window.location = `${url}#m:edit`;
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
        },

        onMoveEntry(entry, entryIdx) {
            this.moveEntryModal.entryIdx = entryIdx;
            this.moveEntryModal.errorMessage = null;
            this.moveEntryModal.shown = true;
            this.moveEntryModal.source = entry;
        },

        onEntryMoved() {
            this.entries.splice(this.moveEntryModal.entryIdx, 1);
            this.moveEntryModal.shown = false;
            this.$forceUpdate();
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
    },
}
</script>