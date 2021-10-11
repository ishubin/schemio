<template>
    <div>
        <div class="fs-toolbar">
            <span class="btn btn-secondary" @click="showNewDirectoryModel()">
               <i class="fas fa-folder-plus"></i> New directory
            </span>
        </div>
        <table class="entries-table">
            <thead>
                <tr>
                    <th>Name</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="entry in entries">
                    <td>
                        <a v-if="entry.kind === 'dir'" :href="`/?path=${entry.encodedPath}`">{{entry.name}}</a>
                        <a v-else :href="`/scheme?path=${entry.encodedPath}`">{{entry.name}}</a>
                    </td>
                </tr>
            </tbody>
        </table>

        <modal v-if="newDirectoryModel.shown" title="New Directory" @close="newDirectoryModel.shown = false" primaryButton="Create" @primary-submit="submitNewDirectory()">
            <input type="text" class="textfield" v-model="newDirectoryModel.name" placeholder="Type name of new directory..."/>
        </modal>
    </div>
</template>

<script>
import apiClient from '../apiClient';
import forEach from 'lodash/forEach';
import Modal from '../../components/Modal.vue';


function isValidCharCode(code) {
    return (code >= 48 && code <= 57) 
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code === 32
        || (code >= 39 && code <= 46);
}

export default {

    components: {Modal},
    
    beforeCreate() {
        this.path = this.$route.query.path;
        apiClient.listEntries(this.path)
        .then(result => {
            forEach(result.entries, entry => {
                entry.encodedPath = encodeURIComponent(entry.path);
            });
            this.entries = result.entries;

        }).catch(err => {
            this.errorMessage = 'Oops, something went wrong';
        })
    },

    data() {
        return {
            path: '',
            entries: [],
            errorMessage: null,

            newDirectoryModel: {
                name: '',
                shown: false,
                errorMessage: null
            }
        };
    },

    methods: {
        showNewDirectoryModel() {
            this.newDirectoryModel.name = '';
            this.newDirectoryModel.err = null;
            this.newDirectoryModel.shown = true;
        },

        submitNewDirectory() {
            this.newDirectoryModel.errorMessage = null;
            const name = this.newDirectoryModel.name.trim();
            if (!name) {
                this.newDirectoryModel.errorMessage = 'Directory name should not be empty';
                return;
            }

            for (let i = 0; i < name.length; i++) {
                if (!isValidCharCode(name.charCodeAt(i))) {
                    this.newDirectoryModel.errorMessage = 'Unsupported symbol: ' + name.charAt(i);
                    return;
                }
            }

            apiClient.createDirectory(name, this.path)
            .then(() => {
                window.location.reload();
            })
            .catch(err => {
                this.newDirectoryModel.errorMessage = 'Failed to create new directory';
            });
        }
    }
}
</script>