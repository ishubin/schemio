<template>
    <div class="scheme-editor-webapp">
        <SchemioEditorApp
            :editorId="editorId"
            :scheme="scheme"
            :schemePatch="schemePatch"
            :mode="mode"
            :schemeReloadKey="schemeReloadKey"
            :editAllowed="editAllowed"
            :modified="modified"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :schemeTagsEnabled="schemeTagsEnabled"
            :menuOptions="editorMenuOptions"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            :modeControlEnabled="modeControlEnabled"
            :saveControlEnabled="saveControlEnabled"
            @patch-applied="onPatchApplied"
            @mode-change-requested="onModeChangeRequested"
            @scheme-save-requested="saveScheme"
            @history-committed="onHistoryCommitted"
            @undo-history-requested="undoHistory"
            @redo-history-requested="redoHistory"
            @editor-state-changed="onEditorStateChanged"
            @delete-diagram-requested="deleteDiagram"
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


        <CreatePatchModal v-if="createPatchModalShown" :key="`create-patch-modal-${appReloadKey}`" :editorId="`scheme-${appReloadKey}`" :originScheme="originScheme" :scheme="modifiedScheme" @close="createPatchModalShown = false"/>

        <div v-if="importSchemeFileShown" style="display: none">
            <input ref="importSchemeFileInput" type="file" @change="onImportSchemeFileInputChanged" accept="application/json"/>
        </div>

        <ImportSchemeModal v-if="importSchemeModal.shown" :scheme="importSchemeModal.scheme"
            @close="importSchemeModal.shown = false"
            @import-scheme-submitted="importScheme"/>

        <export-json-modal v-if="exportJSONModalShown" :scheme="scheme" @close="exportJSONModalShown = false"/>

        <export-picture-modal v-if="exportPictureModal.shown"
            :exported-items="exportPictureModal.exportedItems"
            :kind="exportPictureModal.kind"
            :width="exportPictureModal.width"
            :height="exportPictureModal.height"
            :background-color="exportPictureModal.backgroundColor"
            @close="exportPictureModal.shown = false"/>

        <export-html-modal v-if="exportHTMLModalShown" :scheme="scheme" @close="exportHTMLModalShown = false"/>

        <div v-if="loadPatchFileShown" style="display: none">
            <input ref="loadPatchFileInput" type="file" @change="onLoadPatchFileInputChanged" accept="application/json"/>
        </div>
    </div>
</template>

<script>
import SchemioEditorApp from './SchemioEditorApp.vue';
import StoreUtils from '../store/StoreUtils';
import CreatePatchModal from './patch/CreatePatchModal.vue';
import utils from '../utils';
import {enrichSchemeWithDefaults } from '../scheme/Scheme';
import shortid from 'shortid';
import Modal from './Modal.vue';
import ImportSchemeModal from './editor/ImportSchemeModal.vue';
import ContextMenu from './editor/ContextMenu.vue';
import ExportJSONModal from './editor/ExportJSONModal.vue';
import ExportPictureModal from './editor/ExportPictureModal.vue';
import ExportHTMLModal from './editor/ExportHTMLModal.vue';
import History from '../history/History.js';
import { prepareDiagramForPictureExport } from '../diagramExporter';
import EditorEventBus from './editor/EditorEventBus';

const defaultHistorySize = 30;

export default {
    components: {
        SchemioEditorApp, CreatePatchModal, ImportSchemeModal, ContextMenu, ExportPictureModal, Modal,
        'export-json-modal': ExportJSONModal,
        'export-html-modal': ExportHTMLModal,
    },
    props: {
        editorId          : {type: String, default: 'default'},
        scheme            : {type: Object, required: true},
        detectBrowserClose: {type: Boolean, default: true},
        editorMode        : {type: String, default: 'view'},
        menuOptions       : {type: Array, default: () => []},
        userStylesEnabled : {type: Boolean, default: false},
        projectArtEnabled : {type: Boolean, default: true},
        schemeTagsEnabled: {type: Boolean, default: true},
        editAllowed       : {type: Boolean, default: false},
        isStaticEditor    : {type: Boolean, default: false},
        isOfflineEditor   : {type: Boolean, default: false},
        // allows to switch between edit and view modes from quick helper panel
        modeControlEnabled: {type: Boolean, default: true},
        saveControlEnabled: { type: Boolean, default: true},
        isSaving          : {type: Boolean, default: false},
        modificationKey   : {type: String, default: ''},
    },

    beforeMount() {
        if (this.detectBrowserClose) {
            window.onbeforeunload = this.onBrowseClose;
        }
        if (this.isStaticEditor) {
            this.originScheme = utils.clone(this.scheme);
            enrichSchemeWithDefaults(this.originScheme);
        }
        EditorEventBus.silentSchemeChangeCommitted.$on(this.editorId, this.onSilentSchemeChangeCommitted);
    },

    beforeDestroy() {
        EditorEventBus.silentSchemeChangeCommitted.$off(this.editorId, this.onSilentSchemeChangeCommitted);
    },

    created() {
        //history object does not have to be reactive
        this.history = new History({size: defaultHistorySize});
        this.history.commit(this.scheme);
    },

    data() {
        return {
            schemeReloadKey: null,
            modified: this.isModified,
            mode: this.editorMode,
            originScheme: null,

            customContextMenu: {
                id: shortid.generate(),
                show: false,
                mouseX: 0, mouseY: 0,
                menuOptions: []
            },

            editorMenuOptions: this.menuOptions.concat([
                {name: 'Import diagram',    callback: () => this.showImportJSONModal(), iconClass: 'fas fa-file-import'},
                {name: 'Create patch',      callback: () => this.openSchemePatchModal(this.scheme), iconClass: 'fas fa-file-export', disabled: !this.editAllowed || this.isStaticEditor || this.isOfflineEditor},
                {name: 'Apply patch',       callback: () => this.triggerApplyPatchUpload(), iconClass: 'fas fa-file-import'},
                {name: 'Export as JSON',    callback: () => {this.exportJSONModalShown = true}, iconClass: 'fas fa-file-export'},
                {name: 'Export as SVG',     callback: () => this.exportAsSVG(),  iconClass: 'fas fa-file-export'},
                {name: 'Export as PNG',     callback: () => this.exportAsPNG(),  iconClass: 'fas fa-file-export'},
                {name: 'Export as HTML',    callback: () => {this.exportHTMLModalShown = true}, iconClass: 'fas fa-file-export'}
            ]),

            createPatchModalShown: false,
            exportJSONModalShown: false,
            importSchemeFileShown: false,

            importSchemeModal: {
                sheme: null,
                shown: false
            },

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
        }
    },

    methods: {
        onBrowseClose() {
            if (this.modified) {
                return 'The changes were not saved';
            }
            return null;
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
                    console.error(err);
                    alert('Not able to load patch. Malformed json');
                }
            };

            reader.readAsText(file);
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

        onModeChangeRequested(mode) {
            this.mode = mode;
        },

        saveScheme(scheme, preview) {
            if (this.isStaticEditor) {
                this.openSchemePatchModal(scheme);
                return;
            }

            this.$emit('scheme-save-requested', scheme, preview);
        },

        onSilentSchemeChangeCommitted() {
            this.modified = true;
        },

        deleteDiagram() {
            this.$emit('delete-diagram-requested', this.scheme.id);
        },
    },

    watch: {
        mode(value) {
            this.$emit('mode-changed', value);
        },

        editorMode(value) {
            this.mode = value;
        },

        modificationKey(value) {
            this.modified = false;
        }
    }
}
</script>