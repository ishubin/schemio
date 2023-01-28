<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="scheme-editor-view" :class="{'diagram-404-view': is404}">
        <schemio-header>
            <div slot="middle-section">
                <ul class="header-breadcrumbs">
                    <li v-for="(crumb,  crumbIdx) in breadcrumbs">
                        <router-link v-if="crumb.kind === 'dir'" :to="`/f/${crumb.path}`">
                            <i class="fas fa-folder"/>
                            {{crumb.name}}
                        </router-link>
                        <span v-if="crumb.kind === 'ellipsis'">...</span>
                        <i v-if="crumbIdx < breadcrumbs.length - 1" class="fas fa-caret-right breadcrumb-separator"></i>
                    </li>
                </ul>
                <div class="scheme-title" v-if="scheme">
                    <img class="icon" :src="`${assetsPath}/images/schemio-logo-white.small.png`" height="20"/>
                    <span>{{scheme.name}}</span>
                </div>
            </div>
            <div slot="loader">
                <div v-if="isLoading" class="loader">
                    <div class="loader-element"></div>
                </div>
            </div>
        </schemio-header>

        <div v-if="is404" class="middle-content">
            <h4>Sorry, requested document was not found</h4>
        </div>
        <div v-else-if="errorMessage" class="middle-content">
            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
        </div>
        <SchemioEditorWebApp v-if="scheme"
            :key="`scheme-${appReloadKey}`"
            :editorId="`scheme-${appReloadKey}`"
            :scheme="scheme"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :editorMode="editorMode"
            :editAllowed="editAllowed"
            :menuOptions="menuOptions"
            :isStaticEditor="isStaticEditor"
            :isOfflineEditor="isOfflineEditor"
            @mode-changed="onSchemeEditorModeChanged"
            @delete-diagram-requested="deleteSchemeWarningShown = true"
        />

        <CreateNewSchemeModal v-if="newSchemePopup.show"
            :name="newSchemePopup.name"
            :description="newSchemePopup.description"
            @close="newSchemePopup.show = false"
            @scheme-submitted="submitNewScheme"
            />

        <modal v-if="duplicateDiagramModal.shown" title="Duplicate diagram" @close="duplicateDiagramModal.shown = false" @primary-submit="duplicateDiagram()" primaryButton="Create copy">
            <p>
                Duplicate current diagram in a new file
            </p>
            <input type="text" class="textfield" placeholder="Name" v-model="duplicateDiagramModal.name"/>
            <div v-if="duplicateDiagramModal.errorMessage" class="msg msg-danger">
                {{duplicateDiagramModal.errorMessage}}
            </div>
        </modal>

        <modal v-if="deleteSchemeWarningShown" title="Delete diagram" primaryButton="Delete" @close="deleteSchemeWarningShown = false" @primary-submit="deleteScheme()">
            Are you sure you want to delete <b>{{scheme.name}}</b> scheme?
        </modal>

        <export-as-link-modal v-if="exportAsLinkModalShown" :scheme="scheme" @close="exportAsLinkModalShown = false"/>
    </div>
</template>
<script>
import JSZip from 'jszip';
import forEach from 'lodash/forEach';
import StoreUtils from '../../store/StoreUtils';
import utils from '../../utils';
import { enrichSchemeWithDefaults } from '../../scheme/Scheme';
import shortid from 'shortid';
import { createHasher } from '../../url/hasher';
import Modal from '../../components/Modal.vue';
import CreateNewSchemeModal from '../../components/CreateNewSchemeModal.vue';
import ExportAsLinkModal from '../../components/editor/ExportAsLinkModal.vue';
import {stripAllHtml} from '../../../htmlSanitize';
import EditorEventBus from '../../components/editor/EditorEventBus';

import SchemioEditorWebApp from '../../components/SchemioEditorWebApp.vue';

function loadOfflineScheme() {
    const offlineSchemeEncoded = window.localStorage.getItem('offlineScheme');
    if (offlineSchemeEncoded) {
        try {
            return JSON.parse(offlineSchemeEncoded);
        } catch (err) {
        }
    }
    return {};
}

export default {
    components: {
        Modal, CreateNewSchemeModal,
        'export-as-link-modal': ExportAsLinkModal,
        SchemioEditorWebApp
    },

    props: {
        clientProvider: {type: Object,  required: true},
        isOfflineEditor  : {type: Boolean, default: false},
        editAllowed      : {type: Boolean, default: true},
        userStylesEnabled: {type: Boolean, default: true},
        projectArtEnabled: {type: Boolean, default: true},
    },

    beforeMount() {
        const pageParams = this.hasher.decodeURLHash(window.location.hash);
        if (this.editAllowed && pageParams.m && pageParams.m === 'edit') {
            this.editorMode = 'edit';
        } else {
            this.editorMode = 'view';
        }

        this.isLoading = true;
        if (this.clientProvider.type === 'static') {
            this.isStaticEditor = true;
        }

        let chain = this.clientProvider.create()
        .then(apiClient => {
            this.$store.dispatch('setApiClient', apiClient);
            this.apiClient = apiClient;
            return apiClient;
        });

        if (this.clientProvider.type === 'offline') {
            chain = chain.then(apiClient => {
                this.loadSchemeFromLink();
                this.isLoading = false;
            });
        } else {
            chain = chain.then(apiClient => apiClient.getScheme(this.schemeId))
            .then(schemeDetails => {
                this.isLoading = false;
                this.path = schemeDetails.folderPath;
                this.buildBreadcrumbs(schemeDetails.folderPath);
                this.scheme = schemeDetails.scheme;
                enrichSchemeWithDefaults(this.scheme);

                if (schemeDetails.viewOnly) {
                    this.shouldAllowEdit = false;
                }
            });
        }

        chain.catch(err => {
            this.isLoading = false;
            if (err.response && err.response.status === 404) {
                this.is404 = true;
            } else {
                console.error(err);
                this.errorMessage = 'Oops, something went wrong';
            }
        });
    },

    data() {
        const schemeId = this.$route.params.schemeId;

        return {
            hasher: createHasher(this.$router ? this.$router.mode : 'history'),
            schemeId: schemeId,
            path: '',
            breadcrumbs: [],
            isStaticEditor: false,
            scheme: this.isOfflineEditor ? loadOfflineScheme() : null,
            apiClient: null,
            is404: false,
            errorMessage: null,
            isLoading: false,
            editorMode: 'view',

            appReloadKey: shortid.generate(),

            newSchemePopup: {
                name: '',
                description: '',
                show: false,
                // item for which new diagram was requested
                item: null
            },

            duplicateDiagramModal: {
                shown: false,
                name: '',
                errorMessage: null
            },

            menuOptions: [
                {name: 'New diagram',       callback: () => {
                    this.newSchemePopup.item = null;
                    this.newSchemePopup.show = true;
                },  iconClass: 'fas fa-file', disabled: !this.editAllowed || this.isOfflineEditor || this.clientProvider.type === 'static'},
                {name: 'Duplicate diagram', callback: () => this.showDuplicateDiagramModal(), iconClass: 'fas fa-copy', disabled: !this.editAllowed || this.isStaticEditor || this.isOfflineEditor},
                {name: 'Delete diagram',    callback: () => {this.deleteSchemeWarningShown = true}, iconClass: 'fas fa-trash', disabled: !this.editAllowed || this.isStaticEditor || this.isOfflineEditor},
                {name: 'Export as link',    callback: () => {this.exportAsLinkModalShown = true}, iconClass: 'fas fa-file-export'},
            ],

            exportAsLinkModalShown: false,

            deleteSchemeWarningShown: false,
        };
    },

    methods: {
        buildBreadcrumbs(path) {
            if (!path) {
                path = '';
            }
            const folders = path.split('/');

            const breadcrumbs = [];

            let folderPath = '';
            forEach(folders, folder => {
                if (folder === '') {
                    return;
                }

                if (folderPath === '') {
                    folderPath = folder;
                } else {
                    folderPath = `${folderPath}/${folder}`;
                }
                breadcrumbs.push({
                    kind: 'dir',
                    name: folder,
                    path: folderPath
                });
            });

            if (breadcrumbs.length > 2) {
                breadcrumbs.splice(1, breadcrumbs.length - 2);
                breadcrumbs.splice(1, 0, {
                    kind: 'ellipsis'
                });
            }
            this.breadcrumbs = breadcrumbs;
        },

        submitNewScheme(scheme) {
            this.newSchemePopup.show = false;
            return this.apiClient.createNewScheme(this.path, scheme)
            .then(createdScheme => {
                if (this.newSchemePopup.item) {
                    const item = this.newSchemePopup.item;
                    if (item.shape === 'component') {
                        item.shapeProps.schemeId = createdScheme.id;
                        EditorEventBus.item.changed.specific.$emit(`scheme-${this.appReloadKey}`, item.id, 'shapeProps.schemeId');
                    } else {
                        if (!item.links) {
                            item.links = [];
                        }
                        item.links.push({
                            title: createdScheme.name,
                            url: `/docs/${createdScheme.id}`,
                            type: 'doc'
                        });
                    }
                    EditorEventBus.schemeChangeCommitted.$emit(`scheme-${this.appReloadKey}`);
                    this.newSchemePopup.item = null;
                }
                const isHistoryMode = this.$router && this.$router.mode === 'history';
                const publicLink = isHistoryMode ?  `/docs/${createdScheme.id}#m=edit` : `#/docs/${createdScheme.id}?m=edit`
                window.open(publicLink, '_blank');
            })
            .catch(err => {
                console.error('Failed to create new diagram', err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to create new diagram');
                if (errorCallback) {
                    errorCallback();
                }
            });
        },

        loadSchemeFromLink() {
            const mode = this.$router ? this.$router.mode : 'history';
            const chars = {'.': '+', '_': '/', '-': '='};

            const pageParams = createHasher(mode).decodeURLHash(window.location.hash);

            if (pageParams.doc) {
                const content = pageParams.doc.replace(/[\._\-]/g, m => chars[m]);
                JSZip.loadAsync(content, {base64: true})
                .then(zip => {
                    if (zip.files['doc.json']) {
                        return zip.files['doc.json'].async('text');
                    } else {
                        throw new Error('Missing doc.json file');
                    }
                })
                .then(text => {
                    this.scheme = JSON.parse(text);
                    this.appReloadKey = shortid.generate();
                })
                .catch(err => {
                    console.log(err);
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load document from URL', 'link-loader');
                });
            }
        },

        showDuplicateDiagramModal() {
            this.duplicateDiagramModal.name = this.scheme.name + ' Copy';
            this.duplicateDiagramModal.errorMessage = null;
            this.duplicateDiagramModal.shown = true;
        },

        duplicateDiagram() {
            const name = this.duplicateDiagramModal.name.trim();
            if (!name) {
                this.duplicateDiagramModal.errorMessage = 'Name should not be empty';
                return;
            }

            const scheme = utils.clone(this.scheme);
            scheme.id = null;
            scheme.name = name;
            this.submitNewScheme(scheme).then(() => {
                this.duplicateDiagramModal.shown = false;
            })
            .catch(err => {
                this.duplicateDiagramModal.errorMessage = 'Oops, something went wrong.';
            });
        },

        deleteScheme() {
            this.$store.state.apiClient.deleteScheme(this.scheme.id).then(() => {
                this.$router.push('/');
            });
        },

        onNewDiagramRequestedForItem(item, isExternalComponent) {
            this.newSchemePopup.name = item.name;
            this.newSchemePopup.description = item.description;
            if (isExternalComponent && item.shape === 'component') {
                const title = stripAllHtml(item.textSlots.body.text);
                if (title.length > 0) {
                    this.newSchemePopup.name = title;
                }
            }
            this.newSchemePopup.item = item;
            this.newSchemePopup.show = true;
        },

        onSchemeEditorModeChanged(mode) {
            const pageParams = this.hasher.decodeURLHash(window.location.hash);
            pageParams.m = mode;
            this.hasher.changeURLHash(pageParams);
        }
    },
    computed: {
        assetsPath() {
            return this.$store.getters.assetsPath;
        }
    },

}
</script>