<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div style="height: 100%; display: flex; flex-direction: column" class="scheme-editor-view" :class="{'diagram-404-view': is404}">
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
        <SchemioEditorApp v-else-if="clientProvider.type === 'offline'"
            :key="`offline-scheme-${appReloadKey}`"
            :editorId="`offline-scheme-${appReloadKey}`"
            :scheme="scheme"
            :schemePatch="schemePatch"
            :mode="mode"
            :schemeReloadKey="schemeReloadKey"
            :editAllowed="true"
            :modified="modified"
            :userStylesEnabled="false"
            :projectArtEnabled="false"
            :menuOptions="menuOptions"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            @mode-change-requested="onModeChangeRequested"
            @scheme-save-requested="saveOfflineScheme"
            @history-committed="onHistoryCommitted"
            @undo-history-requested="undoHistory"
            @redo-history-requested="redoHistory"
            @editor-state-changed="onEditorStateChanged"
            @export-picture-requested="openExportPictureModal"
            @context-menu-requested="onContextMenuRequested"
        />
        <SchemioEditorApp v-else-if="scheme"
            :key="`scheme-${appReloadKey}`"
            :editorId="`scheme-${appReloadKey}`"
            :scheme="scheme"
            :schemePatch="schemePatch"
            :mode="mode"
            :schemeReloadKey="schemeReloadKey"
            :editAllowed="shouldAllowEdit"
            :modified="modified"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :menuOptions="menuOptions"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            @patch-applied="onPatchApplied"
            @mode-change-requested="onModeChangeRequested"
            @scheme-save-requested="saveScheme"
            @history-committed="onHistoryCommitted"
            @undo-history-requested="undoHistory"
            @redo-history-requested="redoHistory"
            @editor-state-changed="onEditorStateChanged"
            @delete-diagram-requested="deleteSchemeWarningShown = true"
            @export-picture-requested="openExportPictureModal"
            @context-menu-requested="onContextMenuRequested"
            @new-diagram-requested-for-item="onNewDiagramRequestedForItem(arguments[0], arguments[1])"
        />

        <ContextMenu v-if="customContextMenu.show"
            :key="customContextMenu.id"
            :mouse-x="customContextMenu.mouseX"
            :mouse-y="customContextMenu.mouseY"
            :options="customContextMenu.menuOptions"
            @close="customContextMenu.show = false"
            @selected="onCustomContextMenuOptionSelected"
        />


        <CreatePatchModal v-if="createPatchModalShown" :key="`create-patch-modal-${appReloadKey}`" :editorId="`scheme-${appReloadKey}`" :originScheme="originSchemeForPatch" :scheme="modifiedScheme" @close="createPatchModalShown = false"/>

        <CreateNewSchemeModal v-if="newSchemePopup.show"
            :name="newSchemePopup.name"
            :description="newSchemePopup.description"
            @close="newSchemePopup.show = false"
            @scheme-submitted="submitNewScheme"
        />

        <div v-if="importSchemeFileShown" style="display: none">
            <input ref="importSchemeFileInput" type="file" @change="onImportSchemeFileInputChanged" accept="application/json"/>
        </div>

        <ImportSchemeModal v-if="importSchemeModal.shown" :scheme="importSchemeModal.scheme"
            @close="importSchemeModal.shown = false"
            @import-scheme-submitted="importScheme"/>

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

        <div v-if="loadPatchFileShown" style="display: none">
            <input ref="loadPatchFileInput" type="file" @change="onLoadPatchFileInputChanged" accept="application/json"/>
        </div>

        <export-json-modal v-if="exportJSONModalShown" :scheme="scheme" @close="exportJSONModalShown = false"/>

        <export-picture-modal v-if="exportPictureModal.shown"
            :exported-items="exportPictureModal.exportedItems"
            :kind="exportPictureModal.kind"
            :width="exportPictureModal.width"
            :height="exportPictureModal.height"
            :background-color="exportPictureModal.backgroundColor"
            @close="exportPictureModal.shown = false"/>

        <export-as-link-modal v-if="exportAsLinkModalShown" :scheme="scheme" @close="exportAsLinkModalShown = false"/>

        <export-html-modal v-if="exportHTMLModalShown" :scheme="scheme" @close="exportHTMLModalShown = false"/>


    </div>
</template>
<script>
import JSZip from 'jszip';
import SchemioEditorApp from '../../SchemioEditorApp.vue';
import forEach from 'lodash/forEach';
import StoreUtils from '../../store/StoreUtils';
import CreatePatchModal from '../../components/patch/CreatePatchModal.vue';
import utils from '../../utils';
import {prepareSchemeForSaving, enrichSchemeWithDefaults } from '../../scheme/Scheme';
import shortid from 'shortid';
import { createHasher } from '../../url/hasher';
import Modal from '../../components/Modal.vue';
import CreateNewSchemeModal from '../../components/CreateNewSchemeModal.vue';
import ImportSchemeModal from '../../components/editor/ImportSchemeModal.vue';
import ContextMenu from '../../components/editor/ContextMenu.vue';
import ExportJSONModal from '../../components/editor/ExportJSONModal.vue';
import ExportPictureModal from '../../components/editor/ExportPictureModal.vue';
import ExportAsLinkModal from '../../components/editor/ExportAsLinkModal.vue';
import ExportHTMLModal from '../../components/editor/ExportHTMLModal.vue';
import History from '../../history/History.js';
import { prepareDiagramForPictureExport } from '../../diagramExporter';
import {stripAllHtml} from '../../../htmlSanitize';
import EditorEventBus from '../../components/editor/EditorEventBus';


const defaultHistorySize = 30;

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
        SchemioEditorApp, Modal, CreatePatchModal, CreateNewSchemeModal, ImportSchemeModal,
        ExportPictureModal, ContextMenu,
        'export-json-modal': ExportJSONModal,
        'export-as-link-modal': ExportAsLinkModal,
        'export-html-modal': ExportHTMLModal,
    },

    props: {
        clientProvider: {type: Object,  required: true},
        isOfflineEditor  : {type: Boolean, default: false},
        editAllowed      : {type: Boolean, default: true},
        userStylesEnabled: {type: Boolean, default: true},
        projectArtEnabled: {type: Boolean, default: true},
    },

    beforeMount() {
        window.onbeforeunload = this.onBrowseClose;

        const pageParams = this.hasher.decodeURLHash(window.location.hash);
        if (this.editAllowed && pageParams.m && pageParams.m === 'edit') {
            this.mode = 'edit';
        } else {
            this.mode = 'view';
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

                this.history = new History({size: defaultHistorySize});
                this.history.commit(this.scheme);
                this.modified = false;

                this.originScheme = utils.clone(schemeDetails.scheme);
                enrichSchemeWithDefaults(this.originScheme);
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

    beforeDestroy() {
    },

    created() {
        //history object does not have to be reactive
        this.history = new History({size: defaultHistorySize});
    },

    data() {
        const schemeId = this.$route.params.schemeId;

        return {
            schemeId: schemeId,
            hasher: createHasher(this.$router ? this.$router.mode : 'history'),
            path: '',
            breadcrumbs: [],
            shouldAllowEdit: this.editAllowed,
            isStaticEditor: false,
            scheme: this.isOfflineEditor ? loadOfflineScheme() : null,
            modified: false,
            mode: 'view',
            apiClient: null,
            is404: false,
            errorMessage: null,
            isLoading: false,
            isSaving: false,

            originScheme: null,
            modifiedScheme: null,
            createPatchModalShown: false,

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
                {name: 'Import diagram',    callback: () => this.showImportJSONModal(), iconClass: 'fas fa-file-import'},
                {name: 'Duplicate diagram', callback: () => this.showDuplicateDiagramModal(), iconClass: 'fas fa-copy', disabled: !this.editAllowed || this.isStaticEditor},
                {name: 'Delete diagram',    callback: () => {this.deleteSchemeWarningShown = true}, iconClass: 'fas fa-trash', disabled: !this.editAllowed || this.isStaticEditor},
                {name: 'Create patch',      callback: () => this.openSchemePatchModal(this.scheme), iconClass: 'fas fa-file-export', disabled: !this.editAllowed || this.isStaticEditor},
                {name: 'Apply patch',       callback: () => this.triggerApplyPatchUpload(), iconClass: 'fas fa-file-import'},
                {name: 'Export as JSON',    callback: () => {this.exportJSONModalShown = true}, iconClass: 'fas fa-file-export'},
                {name: 'Export as SVG',     callback: () => this.exportAsSVG(),  iconClass: 'fas fa-file-export'},
                {name: 'Export as PNG',     callback: () => this.exportAsPNG(),  iconClass: 'fas fa-file-export'},
                {name: 'Export as link',    callback: () => {this.exportAsLinkModalShown = true}, iconClass: 'fas fa-file-export'},
                {name: 'Export as HTML',    callback: () => {this.exportHTMLModalShown = true}, iconClass: 'fas fa-file-export'}
            ],

            exportAsLinkModalShown: false,
            exportJSONModalShown: false,
            importSchemeFileShown: false,

            importSchemeModal: {
                sheme: null,
                shown: false
            },

            deleteSchemeWarningShown: false,
            loadPatchFileShown: false,

            schemePatch: null,

            exportPictureModal: {
                kind: 'svg',
                width: 100,
                height: 100,
                shown: false,
                exportedItems: [],
                backgroundColor: 'rgba(255,255,255,1.0)'
            },

            exportHTMLModalShown: false,

            // used to trigger update of SchemeContainer inside of SchemeEditor component
            schemeReloadKey: shortid.generate(),

            historyUndoable: false,
            historyRedoable: false,

            customContextMenu: {
                id: shortid.generate(),
                show: false,
                mouseX: 0, mouseY: 0,
                menuOptions: []
            },

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

        onModeChangeRequested(mode) {
            this.mode = mode;
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

        openSchemePatchModal(modifiedScheme) {
            this.modifiedScheme = modifiedScheme;
            this.createPatchModalShown = true;
        },

        onPatchApplied(patchedScheme) {
            this.scheme = patchedScheme;
            this.schemePatch = null;
            this.appReloadKey = shortid.generate();
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
                    this.history = new History({size: defaultHistorySize});
                    this.history.commit(this.scheme);
                    this.modified = false;
                    this.appReloadKey = shortid.generate();
                })
                .catch(err => {
                    console.log(err);
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load document from URL', 'link-loader');
                });
            }
        },

        saveScheme(scheme, preview) {
            if (this.isStaticEditor) {
                this.openSchemePatchModal(scheme);
                return;
            }

            if (!this.$store.state.apiClient || !this.$store.state.apiClient.saveScheme) {
                return;
            }

            this.$store.dispatch('clearStatusMessage');
            this.isSaving = true;
            this.$store.state.apiClient.saveScheme(prepareSchemeForSaving(scheme))
            .then(() => {
                this.modified = false;

                // it is not a big deal if it fails to save preview
                if (this.schemeId && this.$store.state.apiClient && this.$store.state.apiClient.uploadSchemeSvgPreview) {
                    this.$store.state.apiClient.uploadSchemeSvgPreview(this.schemeId, preview);
                }
                this.isSaving = false;
            })
            .catch(err => {
                this.$store.dispatch('setErrorStatusMessage', 'Failed to save, please try again');
                this.modified = true;
                this.isSaving = false;
            });
        },

        saveOfflineScheme(scheme) {
            window.localStorage.setItem('offlineScheme', JSON.stringify(scheme));
            StoreUtils.addInfoSystemMessage(this.$store, 'Saved diagram to local storage', 'offline-save');
            this.modified = false;
        },

        onBrowseClose() {
            if (this.modified) {
                return 'The changes were not saved';
            }
            return null;
        },

        showImportJSONModal() {
            this.importSchemeFileShown = true;
            this.$nextTick(() => {
                this.$refs.importSchemeFileInput.click();
            });
        },

        onImportSchemeFileInputChanged(event) {
            this.loadSchemeFile(event.target.files[0]);
        },

        loadSchemeFile(file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                this.importSchemeFileShown = false;
                try {
                    const scheme = JSON.parse(event.target.result);
                    //TODO verify if it is correct scheme file
                    this.importSchemeModal.scheme = scheme;
                    this.importSchemeModal.shown = true;
                } catch(err) {
                    alert('Not able to import scheme. Malformed json');
                }
            };

            reader.readAsText(file);
        },

        importScheme(scheme) {
            scheme.id = this.scheme.id;
            enrichSchemeWithDefaults(scheme);
            this.scheme = scheme;
            this.history.commit(this.scheme);
            this.modified = true;
            this.updateHistoryState();
            this.appReloadKey = shortid.generate();
            this.schemeReloadKey = shortid.generate();
        },

        updateHistoryState() {
            this.historyUndoable = this.history.undoable();
            this.historyRedoable = this.history.redoable();
        },

        onHistoryCommitted(scheme, affinityId) {
            this.history.commit(scheme, affinityId);
            this.modified = true;
            this.updateHistoryState();
        },

        undoHistory() {
            const scheme = this.history.undo();
            if (scheme) {
                this.scheme = scheme;
                this.schemeReloadKey = shortid.generate();
            }
            this.modified = true;
            this.updateHistoryState();
        },

        redoHistory() {
            const scheme = this.history.redo();
            if (scheme) {
                this.scheme = scheme;
                this.schemeReloadKey = shortid.generate();
            }
            this.modified = true;
            this.updateHistoryState();
        },

        onEditorStateChanged(state) {
            if (state !== 'editPath') {
                this.updateHistoryState();
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

        triggerApplyPatchUpload() {
            this.loadPatchFileShown = true;
            this.$nextTick(() => {
                this.$refs.loadPatchFileInput.click();
            });
        },

        onLoadPatchFileInputChanged(fileEvent) {
            const file = fileEvent.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                this.loadPatchFileShown = false;
                try {
                    const patch = JSON.parse(event.target.result);
                    //TODO verify that it is correct patch file
                    this.schemePatch = patch;
                    this.appReloadKey = shortid.generate();
                } catch(err) {
                    alert('Not able to load patch. Malformed json');
                }
            };

            reader.readAsText(file);
        },


        exportAsSVG() {
            this.openExportPictureModal(this.scheme.items, 'svg');
        },

        exportAsPNG() {
            this.openExportPictureModal(this.scheme.items, 'png');
        },

        openExportPictureModal(items, kind) {
            if (!Array.isArray(items) || items.length === 0) {
                StoreUtils.addErrorSystemMessage(this.$store, 'You have no items in your document');
                return;
            }
            const result = prepareDiagramForPictureExport(items);
            if (!result) {
                return;
            }

            this.exportPictureModal.exportedItems = result.exportedItems;
            this.exportPictureModal.width = result.width;
            this.exportPictureModal.height = result.height;
            this.exportPictureModal.backgroundColor = this.scheme.style.backgroundColor;
            this.exportPictureModal.kind = kind;
            this.exportPictureModal.shown = true;
        },

        onCustomContextMenuOptionSelected(option) {
            if (!option.subOptions) {
                option.clicked();
            }
            this.customContextMenu.show = false;
        },

        onContextMenuRequested(x, y, menuOptions) {
            this.customContextMenu.id = shortid.generate();
            this.customContextMenu.mouseX = x;
            this.customContextMenu.mouseY = y;
            this.customContextMenu.menuOptions = menuOptions;
            this.customContextMenu.show = true;
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

        }
    },
    computed: {
        originSchemeForPatch() {
            if (this.clientProvider.type === 'static') {
                return this.originScheme;
            }
            return null;
        },

        assetsPath() {
            return this.$store.getters.assetsPath;
        }
    },

    watch: {
        mode(value) {
            const pageParams = this.hasher.decodeURLHash(window.location.hash);
            pageParams.m = value;
            this.hasher.changeURLHash(pageParams);
        }
    }
}
</script>