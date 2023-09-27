<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="folder-view web-view">
        <schemio-header>
            <div slot="loader">
                <div v-if="isLoading" class="loader">
                    <div class="loader-element"></div>
                </div>
            </div>
        </schemio-header>

        <div class="middle-content">
            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
            <div v-if="is404">
                <h4>Sorry, specfied path does not exist</h4>
            </div>
            <div v-else>
                <div class="fs-toolbar" v-if="!viewOnly && toolbarShown">
                    <span class="btn btn-secondary" @click="showNewDirectoryModel()">
                        <i class="fas fa-folder-plus"></i> New directory
                    </span>
                    <span class="btn btn-secondary" @click="showNewSchemeModel()">
                        <i class="fas fa-file"></i> New Diagram
                    </span>
                    <input type="text" class="textfield" placeholder="Search ..." v-model="searchKeyword" @keydown.enter="searchSchemes"/>
                    <span class="btn btn-primary" @click="searchSchemes">
                        <i class="fas fa-search"></i> Search
                    </span>
                </div>

                <ul class="breadcrumbs">
                    <li v-for="(entry, entryIdx) in breadcrumbs">
                        <router-link class="breadcrumb-link" :to="`/f/${entry.path}`">{{entry.name}}</router-link>
                        <i v-if="entryIdx < breadcrumbs.length - 1" class="fas fa-caret-right breadcrumb-separator"></i>
                    </li>
                </ul>

                <table class="entries-table">
                    <thead>
                        <tr>
                            <th colspan="2">Name</th>
                            <th class="time-column">Modified</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(entry, entryIdx) in entries">
                            <td class="icon-column">
                                <router-link class="entry-link" v-if="entry.kind === 'dir'" :to="`/f/${entry.path}`">
                                    <i class="icon fas fa-folder fa-2x"></i>
                                </router-link>
                                <router-link class="entry-link" v-else-if="entry.kind === 'schemio:doc'" :to="`/docs/${entry.id}`">
                                    <img v-if="entry.previewURL" class="scheme-preview" :src="`${entry.previewURL}?v=${entry.encodedTime}`"/>
                                    <i v-else class="icon far fa-file fa-2x"></i>
                                </router-link>
                            </td>
                            <td class="name-column">
                                <router-link class="entry-link" v-if="entry.kind === 'dir'" :to="`/f/${entry.path}`">
                                    <span class="entry-link-text">{{entry.name}}</span>
                                </router-link>
                                <router-link class="entry-link" v-else-if="entry.kind === 'schemio:doc'" :to="`/docs/${entry.id}`">
                                    <span class="entry-link-text">{{entry.name}}</span>
                                </router-link>
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

                <p v-if="nextPageToken && !isLoading" style="text-align: center;">
                    <span class="btn btn-primary" @click="loadNextPage">Load more</span>
                </p>
            </div>

            <modal v-if="newDirectoryModal.shown" title="New Directory" @close="newDirectoryModal.shown = false" primaryButton="Create" @primary-submit="submitNewDirectory()">
                <input ref="newDirectoryModalInput" type="text" class="textfield" v-model="newDirectoryModal.name" placeholder="Type name of new directory..." v-on:keyup.enter="submitNewDirectory()"/>

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
                <input ref="renameEntryModalInput" type="text" class="textfield" v-model="renameEntryModal.name" v-on:keyup.enter="confirmEntryRename()"/>

                <div class="msg msg-error" v-if="renameEntryModal.errorMessage">{{renameEntryModal.errorMessage}}</div>
            </modal>

            <CreateNewSchemeModal v-if="newSchemeModal.shown"
                @scheme-submitted="onSchemeSubmitted"
                @close="newSchemeModal.shown = false"
            />

            <MoveToFolderModal v-if="moveEntryModal.shown"
                :apiClient="apiClient"
                :source="moveEntryModal.source"
                :path="path"
                @close="moveEntryModal.shown = false"
                @moved="onEntryMoved"/>

            <modal v-if="progressModal.shown" :title="progressModal.title" @close="progressModal.shown = false">
                <i class="fas fa-spinner fa-spin fa-1x"></i>
                <span>{{ progressModal.text }}</span>
            </modal>
        </div>
    </div>
</template>

<script>
import {forEach, map} from '../../collections';
import Modal from '../../components/Modal.vue';
import CreateNewSchemeModal from '../../components/CreateNewSchemeModal.vue';
import MenuDropdown from '../../components/MenuDropdown.vue';
import MoveToFolderModal from '../components/MoveToFolderModal.vue';

const _kindPrefix = (kind) => kind === 'dir' ? 'a': 'b';
function entriesSorter(a, b) {
    const name1 = _kindPrefix(a.kind) + a.name.toLowerCase();
    const name2 = _kindPrefix(b.kind) + b.name.toLowerCase();
    if (name1 < name2) {
        return -1;
    } else {
        return 1;
    }
}


function isValidCharCode(code) {
    return (code >= 48 && code <= 57)
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code === 32
        || (code >= 39 && code <= 46);
}

export default {

    components: {Modal, CreateNewSchemeModal, MenuDropdown, MoveToFolderModal},

    props: {
        clientProvider : {type: Object, required: true},
        toolbarShown   : {type: Boolean, default: true},
    },

    beforeMount() {
        this.loadNextPage();
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
            breadcrumbs: [],
            entries: [],
            errorMessage: null,
            viewOnly: true,
            searchKeyword: '',
            nextPageToken: null,
            isLoading: true,

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

            progressModal: {
                title: '',
                text: '',
                shown: false,
            },

            apiClient: null,
        };
    },

    methods: {
        reload() {
            this.nextPageToken = null;
            this.entries = [];
            this.loadNextPage();
            this.newDirectoryModal.shown = false;
            this.renameEntryModal.shown = false;
            this.moveEntryModal.shown = false;
            this.deleteEntryModal.shown = false;
            this.newSchemeModal.shown = false;
        },

        showProgressModal(title, text) {
            this.progressModal.shown = true;
            this.progressModal.title = title;
            this.progressModal.text = text;
        },

        showNewSchemeModel() {
            this.newSchemeModal.shown = true;
        },

        showNewDirectoryModel() {
            this.newDirectoryModal.name = '';
            this.newDirectoryModal.err = null;
            this.newDirectoryModal.shown = true;
            this.$nextTick(() => {
                this.$refs.newDirectoryModalInput.focus();
            });
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

            this.showProgressModal('Creating directory', `Creating directory "${name}"`);
            this.apiClient.createDirectory(this.path, name)
            .then(entry => {
                this.entries.push({
                    ...entry,
                    // TODO this is ugly duplication, menuOptions do not differ between entries
                    menuOptions: [{
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
                    }]
                });
                this.entries.sort(entriesSorter);
                this.newDirectoryModal.shown = false;
                this.progressModal.shown = false;
            })
            .catch(err => {
                this.newDirectoryModal.errorMessage = 'Failed to create new directory';
                this.progressModal.shown = false;
            });
        },

        onSchemeSubmitted(scheme) {
            this.showProgressModal('Creating diagram', `Creating diagram "${scheme.name}"`);
            this.apiClient.createNewScheme(this.path, scheme).then(createdScheme => {
                this.progressModal.shown = false;
                if (this.$router.mode === 'history') {
                        this.$router.push({path: `/docs/${createdScheme.id}#m=edit`});
                } else {
                    this.$router.push({path: `/docs/${createdScheme.id}?m=edit`});
                }
            })
            .catch(err => {
                console.error('Failed to create diagram', err);
                this.errorMessage = 'Failed to create diagram';
                this.progressModal.shown = false;
            });
        },

        onDeleteEntry(entry) {
            this.deleteEntryModal.entry = entry;
            this.deleteEntryModal.errorMessage = null;
            this.deleteEntryModal.shown = true;
        },

        confirmDeleteEntry(entry) {
            const deleteEntry = (checker) => {
                for (let i = this.entries.length - 1; i >= 0; i--) {
                    if (checker(this.entries[i])) {
                        this.entries.splice(i, 1);
                    }
                }
            };
            if (entry.kind === 'dir') {
                this.showProgressModal('Deleting directory', `Deleting directory "${entry.name}"`);
                this.apiClient.deleteDir(entry.path, entry.name).then(() => {
                    deleteEntry(e => e.path === entry.path);
                    this.deleteEntryModal.shown = false;
                    this.progressModal.shown = false;
                })
                .catch(err => {
                    this.deleteEntryModal.errorMessage = 'Failed to delete directory';
                    this.progressModal.shown = false;
                });
            } else if (entry.kind === 'schemio:doc') {
                this.showProgressModal('Deleting diagram', `Deleting diagram "${entry.name}"`);
                this.apiClient.deleteScheme(entry.id).then(() => {
                    deleteEntry(e => e.id === entry.id);
                    this.deleteEntryModal.shown = false;
                    this.progressModal.shown = false;
                })
                .catch(err => {
                    this.deleteEntryModal.errorMessage = 'Failed to delete diagram';
                    this.progressModal.shown = false;
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
            const path = this.entries[this.renameEntryModal.entryIdx].path;
            const oldName = this.entries[this.renameEntryModal.entryIdx].name;
            if (oldName === this.renameEntryModal.name) {
                return;
            }
            if (this.renameEntryModal.kind === 'dir') {
                this.showProgressModal('Renaming directory', `Renaming directory "${this.renameEntryModal.name}"`);
                this.apiClient.renameDirectory(path, this.renameEntryModal.name).then(changedEntry => {
                    this.entries[this.renameEntryModal.entryIdx].name = changedEntry.name;
                    this.entries[this.renameEntryModal.entryIdx].path = changedEntry.path;
                    this.renameEntryModal.shown = false;
                    this.progressModal.shown = false;
                })
                .catch(err => {
                    if (err.response  && err.response.status === 400) {
                        this.renameEntryModal.errorMessage = 'Such directory name is not allowed';
                    } else {
                        this.renameEntryModal.errorMessage = 'Sorry, something went wrong. Was not able to rename this directory';
                    }
                    this.progressModal.shown = false;
                });
            } else if (this.renameEntryModal.kind === 'schemio:doc') {
                this.showProgressModal('Renaming diagram', `Renaming diagram "${this.renameEntryModal.name}"`);
                this.apiClient.renameScheme(this.entries[this.renameEntryModal.entryIdx].id, this.renameEntryModal.name).then(() => {
                    this.entries[this.renameEntryModal.entryIdx].name = this.renameEntryModal.name;
                    this.renameEntryModal.shown = false;
                    this.progressModal.shown = false;
                })
                .catch(err => {
                    if (err.response  && err.response.status === 400) {
                        this.renameEntryModal.errorMessage = 'Such document is not allowed';
                    } else {
                        this.renameEntryModal.errorMessage = 'Sorry, something went wrong. Was not able to rename this scheme';
                    }
                    this.progressModal.shown = false;
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
        },

        searchSchemes() {
            this.$router.push({
                path: `/search?q=${encodeURIComponent(this.searchKeyword)}`
            });
        },

        loadNextPage() {
            this.isLoading = true;
            this.clientProvider.create()
            .then(apiClient => {
                this.$store.dispatch('setApiClient', apiClient);
                this.apiClient = apiClient;
            })
            .then(() => {
                const filters = {};
                if (this.nextPageToken) {
                    filters.nextPageToken = this.nextPageToken;
                }
                return this.apiClient.listEntries(this.path, filters);
            })
            .then(result => {
                this.nextPageToken = result.nextPageToken;

                this.breadcrumbs = map(result.breadcrumbs, b => {
                    return {
                        kind: 'dir',
                        path: b.path,
                        name: b.name
                    };
                });

                result.entries.sort(entriesSorter);
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

                    if (entry.kind === 'schemio:doc') {
                        entry.encodedTime = encodeURIComponent(new Date(entry.modifiedTime).getTime());
                    }
                });
                this.entries = this.entries.concat(result.entries);
                this.viewOnly = result.viewOnly;
                this.isLoading = false;
            }).catch(err => {
                console.error(err);
                this.isLoading = false;
                if (err.response && err.response.status === 404) {
                    this.is404 = true;
                } else {
                    this.errorMessage = 'Oops, something went wrong';
                }
            })
        }
    },

    computed: {
        renameEntryModalTitle() {
            if (this.renameEntryModal.kind === 'dir') {
                return 'Rename directory';
            } else if (this.renameEntryModal.kind === 'schemio:doc') {
                return 'Rename scheme';
            }
            return 'Rename';
        }
    },
}
</script>