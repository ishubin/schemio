<template>
    <div class="scheme-editor-webapp">
        <SchemioEditorApp
            :key="`schemio-editor-app-${appReloadKey}`"
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
            :overridePatchControls="overridePatchControls"
            :patchControls="patchControls"
            :extraTabs="extraTabs"
            :customItemMenuPanels="customItemMenuPanels"
            :contextMenuExtraProvider="contextMenuExtraProvider"
            :starterTemplates="starterTemplates"
            :screenTransform="screenTransform"
            @custom-tab-event="$emit('custom-tab-event', $event)"
            @patch-applied="onPatchApplied"
            @mode-change-requested="onModeChangeRequested"
            @scheme-save-requested="saveScheme"
            @history-committed="onHistoryCommitted($event.scheme, $event.affinityId)"
            @undo-history-requested="undoHistory"
            @redo-history-requested="redoHistory"
            @editor-state-changed="onEditorStateChanged"
            @delete-diagram-requested="deleteDiagram"
            @context-menu-requested="onContextMenuRequested($event.x, $event.y, $event.menuOptions)"
            @patch-origin-toggled="onPatchOriginToggled"
            @patch-modified-toggled="onPatchModifiedToggled"
            @patch-modified-generated="onPatchModifiedGenerated"
            @new-diagram-requested-for-item="$emit('new-diagram-requested-for-item', $event)"
            @patched-history-committed="onPatchedHistoryCommitted($event.scheme, $event.affinityId)"
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
import ExportHTMLModal from './editor/ExportHTMLModal.vue';
import History from '../history/History.js';
import EditorEventBus from './editor/EditorEventBus';

const defaultHistorySize = 30;

export default {
    components: {
        SchemioEditorApp, CreatePatchModal, ImportSchemeModal, ContextMenu, Modal,
        'export-json-modal': ExportJSONModal,
        'export-html-modal': ExportHTMLModal
    },
    props: {
        editorId          : {type: String, default: 'default'},
        scheme            : {type: Object, required: true},
        schemeReloadKey   : {type: String, default: ''},
        detectBrowserClose: {type: Boolean, default: true},
        editorMode        : {type: String, default: 'view'},
        menuOptions       : {type: Array, default: () => []},
        userStylesEnabled : {type: Boolean, default: false},
        projectArtEnabled : {type: Boolean, default: true},
        schemeTagsEnabled : {type: Boolean, default: true},
        editAllowed       : {type: Boolean, default: false},
        isStaticEditor    : {type: Boolean, default: false},
        isOfflineEditor   : {type: Boolean, default: false},
        // allows to switch between edit and view modes from quick helper panel
        modeControlEnabled   : {type: Boolean, default: true},
        saveControlEnabled   : {type: Boolean, default: true},
        isSaving             : {type: Boolean, default: false},
        modificationKey      : {type: String, default: ''},
        patch                : {type: Object, default: null},
        overridePatchControls: {type: Boolean, default: false},
        patchControls        : {type: Array, default: () => []},
        extraTabs            : {type: Array, default: () => []},
        customItemMenuPanels : {type: Array, default: () => []},
        screenTransform      : {type: Object, default: null},

        // used for customizing schemio with additional context menu options.
        // The provider should be in form of {provide: (items) => {return []}}
        // It should return an array of options in the format of {name: 'Name', iconClass: '', clicked: () => {}}
        contextMenuExtraProvider: {type: Object, default: null},

        // Array of starter templates ({name, iconUrl, docUrl}) that should be displayed when user starts creating a new doc
        starterTemplates : {type: Array, default: () => []},
    },

    beforeMount() {
        if (this.detectBrowserClose) {
            window.onbeforeunload = this.onBrowseClose;
        }
        if (this.isStaticEditor) {
            this.originScheme = utils.clone(this.scheme);
            enrichSchemeWithDefaults(this.originScheme);
        }

        EditorEventBus.screenTransformUpdated.$on(this.editorId, this.onScreenTransformUpdated);
    },

    beforeDestroy() {
        EditorEventBus.screenTransformUpdated.$off(this.editorId, this.onScreenTransformUpdated);
    },

    created() {
        // history objects do not have to be reactive
        this.histories = {
            origin  : new History({size: defaultHistorySize}),
            modified: new History({size: defaultHistorySize}),
        };

        this.currentHistory = 'origin';
        this.histories[this.currentHistory].commit(this.scheme);
    },

    data() {
        return {
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
                {name: 'Import diagram',    callback: () => this.showImportJSONModal(), iconClass: 'fas fa-file-import'}
            ]).concat(this.overridePatchControls ? [] : [
                {name: 'Create patch',      callback: () => this.openSchemePatchModal(this.scheme), iconClass: 'fas fa-file-export', disabled: !this.editAllowed || this.isStaticEditor || this.isOfflineEditor},
                {name: 'Apply patch',       callback: () => this.triggerApplyPatchUpload(), iconClass: 'fas fa-file-import'},
            ]).concat([
                {name: 'Export as JSON',    callback: () => {this.exportJSONModalShown = true}, iconClass: 'fas fa-file-export'},
                {name: 'Export as HTML',    callback: () => {this.exportHTMLModalShown = true}, iconClass: 'fas fa-file-export'},
            ]),

            createPatchModalShown: false,
            exportJSONModalShown: false,
            importSchemeFileShown: false,

            importSchemeModal: {
                sheme: null,
                shown: false
            },

            loadPatchFileShown: false,

            schemePatch: this.patch,

            exportHTMLModalShown: false,

            historyUndoable: false,
            historyRedoable: false,

            appReloadKey: '',
        }
    },

    methods: {
        onScreenTransformUpdated(transform) {
            this.$emit('screen-transform-updated', transform);
        },

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
                    if (this.scheme.items.length === 0) {
                        this.importScheme(scheme);
                    } else {
                        this.importSchemeModal.scheme = scheme;
                        this.importSchemeModal.shown = true;
                    }
                } catch(err) {
                    alert('Not able to import scheme. Malformed json');
                }
            };

            reader.readAsText(file);
        },

        importScheme(scheme) {
            scheme.id = this.scheme.id;
            enrichSchemeWithDefaults(scheme);
            this.histories[this.currentHistory].commit(scheme);
            this.$emit('scheme-update-requested', scheme);
            this.appReloadKey = shortid.generate();
            this.modified = true;
            this.updateHistoryState();
        },

        updateHistoryState() {
            this.historyUndoable = this.histories[this.currentHistory].undoable();
            this.historyRedoable = this.histories[this.currentHistory].redoable();
        },

        onHistoryCommitted(scheme, affinityId) {
            this.histories.origin.commit(scheme, affinityId);
            this.modified = true;
            this.updateHistoryState();
        },

        onPatchedHistoryCommitted(scheme, affinityId) {
            this.histories.modified.commit(scheme, affinityId);
            this.modified = true;
            this.$emit('patched-history-committed', {scheme, affinityId});
            this.updateHistoryState();
        },

        onPatchModifiedGenerated(patchedScheme) {
            this.histories.modified.commit(patchedScheme);
            this.updateHistoryState();
        },

        undoHistory() {
            const scheme = this.histories[this.currentHistory].undo();
            this.updateHistoryState();
            if (!scheme) {
                return;
            }
            if (this.currentHistory === 'modified') {
                EditorEventBus.patchedSchemeUpdated.$emit(this.editorId, scheme);
            } else {
                this.$emit('scheme-update-requested', scheme);
            }
            this.$emit('history-undone');
            this.modified = true;
        },

        redoHistory() {
            const scheme = this.histories[this.currentHistory].redo();
            this.updateHistoryState();
            if (!scheme) {
                return;
            }
            if (this.currentHistory === 'modified') {
                EditorEventBus.patchedSchemeUpdated.$emit(this.editorId, scheme);
            } else {
                this.$emit('scheme-update-requested', scheme);
            }
            this.$emit('history-redone');
            this.modified = true;
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
                    this.histories.modified.reset();
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
            this.histories.modified.reset();
            this.appReloadKey = shortid.generate();
        },

        onModeChangeRequested(mode) {
            this.mode = mode;
        },

        saveScheme(scheme) {
            if (this.isStaticEditor) {
                this.openSchemePatchModal(scheme);
                return;
            }

            this.$emit('scheme-save-requested', scheme);
        },

        deleteDiagram() {
            this.$emit('delete-diagram-requested', this.scheme.id);
        },

        onPatchOriginToggled() {
            this.currentHistory = 'origin';
            this.updateHistoryState();
        },

        onPatchModifiedToggled() {
            this.currentHistory = 'modified';
            this.updateHistoryState();
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