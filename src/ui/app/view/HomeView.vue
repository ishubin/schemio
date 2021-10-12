<template>
    <div>
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
                <tr v-for="entry in entries">
                    <td>
                        <a v-if="entry.kind === 'dir'" :href="`/?path=${entry.encodedPath}`"><i class="fas fa-folder fa-2x"></i> {{entry.name}} / </a>
                        <a v-else-if="entry.kind === 'scheme'" :href="`/scheme?path=${entry.encodedPath}&id=${entry.id}`"><i class="fas fa-file fa-2x"></i> {{entry.name}}</a>
                    </td>
                    <td>
                        <span v-if="entry.modifiedTime">{{entry.modifiedTime}}</span>
                    </td>
                    <td>
                        <menu-dropdown name="" iconClass="fas fa-ellipsis-v" :options="entry.menuOptions"
                            @delete="onDeleteEntry(entry)"
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
                }];
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
        }
    }
}
</script>