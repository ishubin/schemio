<template>
    <div class="app-container">
        <Navigator v-if="projectPath && projectName && fileTree"
            :projectPath="projectPath"
            :projectName="projectName"
            :fileTree="fileTree"
            :fileTreeReloadKey="fileTreeReloadKey"
            :focusedFile="currentFocusedFilePath"
            :folderToExpand="navigatorFolderToExpand"
            @schemio-doc-selected="onSchemioDocSelected"
            @entry-added="onFileTreeEntryAdded"
            @renamed-folder="onFolderRenamed"
            @renamed-diagram="onDiagramRenamed"
            @moved-entries="onFileTreeEntriesMoved"
            @new-diagram-requested="onNewDiagramRequested"
            />
        <div class="elec-main-body">
            <div v-if="progressBarShown" class="elec-file-progress-bar"></div>
            <FileTabPanel :files="files" :currentOpenFileIndex="currentOpenFileIdx" @selected-file="focusFile" @closed-file="closeFile"/>
            <div class="elec-file-container">
                <div v-if="!projectPath" class="elec-no-project">
                    <span class="btn btn-primary" @click="openProject">Open Project...</span>
                </div>
                <div v-else style="height: 100%">
                    <div :key="file.path" v-for="(file, fileIdx) in files" style="height: 100%" :style="{display: fileIdx === currentOpenFileIdx ? 'block': 'none'}">
                        <SchemioEditorApp
                            :key="`editor-${file.path}`"
                            :editorId="`${file.editorId}`"
                            :scheme="file.document"
                            :schemeReloadKey="file.schemeReloadKey"
                            :mode="file.schemeMode"
                            :active="fileIdx === currentOpenFileIdx"
                            :editAllowed="true"
                            :modified="file.modified"
                            :historyUndoable="file.historyUndoable"
                            :historyRedoable="file.historyRedoable"
                            :isSaving="file.isSaving"
                            :userStylesEnabled="true"
                            @scheme-save-requested="saveFile(file, arguments[0], arguments[1])"
                            @mode-change-requested="onModeChangeRequested(file, arguments[0])"
                            @history-committed="onHistoryCommitted(file, arguments[0], arguments[1])"
                            @undo-history-requested="undoHistory(file)"
                            @redo-history-requested="redoHistory(file)"
                            @export-picture-requested="openExportPictureModal(file, arguments[0], arguments[1])"
                            @context-menu-requested="onContextMenuRequested(files, arguments[2])"
                            @new-diagram-requested-for-item="onNewDiagramRequestedForItem(file, arguments[0], arguments[1])"
                        />
                    </div>
                </div>
            </div>
        </div>

        <Modal v-if="warnModifiedFileCloseModal.shown" title="Unsaved changes"
            closeName="Cancel"
            primaryButton="Close"
            :width="300"
            @primary-submit="submitWarnCloseModal"
            @close="warnModifiedFileCloseModal.shown = false"
            >
            Unsaved changes in <b>{{warnModifiedFileCloseModal.name}}</b>.
            <br/> Close anyway?
        </Modal>

        <Modal v-if="staticExporterModal.shown"
            :showHeader="false"
            :showFooter="false"
            :closable="false"
            :width="300"
            >

            <div style="padding: 20px">
                <i class="fas fa-spinner fa-spin fa-1x"></i>
                <span>Exporting project files...</span>
            </div>
        </Modal>


        <export-json-modal v-if="exportJSONModalShown" :scheme="scheme" @close="exportJSONModalShown = false"/>

        <export-picture-modal v-if="exportPictureModal.shown"
            :exported-items="exportPictureModal.exportedItems"
            :kind="exportPictureModal.kind"
            :width="exportPictureModal.width"
            :height="exportPictureModal.height"
            :background-color="exportPictureModal.backgroundColor"
            @close="exportPictureModal.shown = false"/>

        <CreateNewSchemeModal v-if="newDiagramModal.shown" :name="newDiagramModal.name" @scheme-submitted="newDiagramSubmitted" @close="newDiagramModal.shown = false"/>
    </div>
</template>

<script>
import shortid from 'shortid';
import { enrichSchemeWithDefaults } from '../../ui/scheme/Scheme';
import { Keys, simulateKeyPress } from '../../ui/events';
import SchemioEditorApp from '../../ui/SchemioEditorApp.vue';
import Navigator from './Navigator.vue';
import History from '../../ui/history/History';
import FileTabPanel from './FileTabPanel.vue';
import CreateNewSchemeModal from '../../ui/components/CreateNewSchemeModal.vue';
import Modal from '../../ui/components/Modal.vue';
import ExportJSONModal from '../../ui/components/editor/ExportJSONModal.vue';
import ExportPictureModal from '../../ui/components/editor/ExportPictureModal.vue';
import {addEntryToFileTree, deleteEntryFromFileTree, findEntryInFileTree, traverseFileTree, renameEntryInFileTree, findParentEntryInFileTree } from '../../common/fs/fileTree';
import StoreUtils from '../../ui/store/StoreUtils';
import { prepareDiagramForPictureExport } from '../../ui/diagramExporter';
import EditorEventBus from '../../ui/components/editor/EditorEventBus';
import { stripAllHtml } from '../../htmlSanitize';

const fileHistories = new Map();

function initSchemioDiagramFile(originalFile) {
    const file = {
        ...originalFile,
        document: {},
        error: null,
        editorId: shortid.generate(),
        modified: false,
        schemeMode: 'view',
        schemeReloadKey: shortid.generate(),
        // Take it out of here so that it does not become reactive
        historyId: originalFile.path + shortid.generate(),
        historyUndoable: false,
        historyRedoable: false,
        isSaving: false
    };

    const history = new History({size: 30});
    fileHistories.set(file.historyId, history);

    try {
        file.document = JSON.parse(file.content);
        file.name = file.document.name || 'Unnamed';
        if (!file.document.items || file.document.items.length === 0) {
            file.schemeMode = 'edit';
        }
    }
    catch (err) {
        file.error = 'Failed to read schemio diagram';
    }

    enrichSchemeWithDefaults(file.document);
    history.commit(file.document);
    return file;
}



export default {
    components: {
        Navigator, SchemioEditorApp, FileTabPanel, Modal,
        ExportPictureModal, CreateNewSchemeModal,
        'export-json-modal': ExportJSONModal,
    },

    created() {
        this.contextMenu = {
            id: null,
            options: new Map(),
        };
    },

    beforeMount() {
        window.electronAPI.$on('navigator:entry-deleted', this.ipcOnFileTreeEntryDeleted);
        window.electronAPI.$on('navigator:open', this.ipcOnNavigatorOpen);
        window.electronAPI.$on('history:undo', this.undoHistoryForCurrentFile);
        window.electronAPI.$on('history:redo', this.redoHistoryForCurrentFile);
        window.electronAPI.$on('edit:cut', this.onMenuEditCut);
        window.electronAPI.$on('edit:copy', this.onMenuEditCopy);
        window.electronAPI.$on('edit:paste', this.onMenuEditPaste);
        window.electronAPI.$on('edit:delete', this.onMenuEditDelete);
        window.electronAPI.$on('edit:selectAll', this.onMenuEditSelectAll);
        window.electronAPI.$on('view:zoomIn', this.onMenuViewZoomIn);
        window.electronAPI.$on('view:zoomOut', this.onMenuViewZoomOut);
        window.electronAPI.$on('view:resetZoom', this.onMenuViewResetZoom);
        window.electronAPI.$on('file:exportStatic:started', this.onStaticExporterStarted);
        window.electronAPI.$on('file:exportStatic:stopped', this.onStaticExporterStopped);
        window.electronAPI.$on('menu:contextMenuOptionSelected', this.onContextMenuOptionSelected);
    },

    beforeDestroy() {
        window.electronAPI.$off('navigator:entry-deleted', this.ipcOnFileTreeEntryDeleted);
        window.electronAPI.$off('navigator:open', this.ipcOnNavigatorOpen);
        window.electronAPI.$off('history:undo', this.undoHistoryForCurrentFile);
        window.electronAPI.$off('history:redo', this.redoHistoryForCurrentFile);
        window.electronAPI.$off('edit:cut', this.onMenuEditCut);
        window.electronAPI.$off('edit:copy', this.onMenuEditCopy);
        window.electronAPI.$off('edit:paste', this.onMenuEditPaste);
        window.electronAPI.$off('edit:delete', this.onMenuEditDelete);
        window.electronAPI.$off('edit:selectAll', this.onMenuEditSelectAll);
        window.electronAPI.$off('view:zoomIn', this.onMenuViewZoomIn);
        window.electronAPI.$off('view:zoomOut', this.onMenuViewZoomOut);
        window.electronAPI.$off('view:resetZoom', this.onMenuViewResetZoom);
        window.electronAPI.$off('file:exportStatic:started', this.onStaticExporterStarted);
        window.electronAPI.$off('file:exportStatic:stopped', this.onStaticExporterStopped);
        window.electronAPI.$off('menu:contextMenuOptionSelected', this.onContextMenuOptionSelected);
    },

    data() {
        return {
            projectPath: null,
            projectName: null,
            fileTree: null,
            fileTreeReloadKey: 1,
            files: [],
            currentOpenFileIdx: -1,
            currentFocusedFilePath: null,
            navigatorWidth: 250,
            progressBarShown: false,
            warnModifiedFileCloseModal: {
                name: null,
                fileIdx: null,
                shown: false
            },

            staticExporterModal: {
                shown: false,
            },

            exportJSONModalShown: false,
            exportPictureModal: {
                kind: 'svg',
                width: 100,
                height: 100,
                shown: false,
                exportedItems: [],
                backgroundColor: 'rgba(255,255,255,1.0)'
            },

            newDiagramModal: {
                name: '',
                shown: false,
                folderPath: null,
                item: null,
                editorId: null
            },

            navigatorFolderToExpand: null
        };
    },

    methods: {
        onStaticExporterStarted() {
            this.staticExporterModal.shown = true;
        },

        onStaticExporterStopped() {
            this.staticExporterModal.shown = false;
        },

        openProject() {
            window.electronAPI.openProject()
            .then(project => {
                if (project) {
                    this.projectPath = project.path;
                    this.projectName = project.name;
                    this.fileTree = project.fileTree
                }

                window.electronAPI.menu.enableMenuItem('file-exportStatic');
            });
        },

        ipcOnNavigatorOpen(event, filePath) {
            this.onSchemioDocSelected(filePath);
        },

        onSchemioDocSelected(docPath) {
            const idx = this.findFileIdxByPath(docPath);
            if (idx >= 0) {
                this.focusFile(idx);
                return;
            }

            this.progressBarShown = true;
            this.$nextTick(() => {
                window.electronAPI.readFile(docPath).then(file => {
                    // protection from a race condition so that it does not open same file in two tabs
                    for (let i = 0; i < this.files.length; i++) {
                        if (this.files[i].path === file.path) {
                            return;
                        }
                    }
                    const newIdx = this.appendFile(file);
                    this.focusFile(newIdx);
                    this.progressBarShown = false;
                })
                .catch(err => {
                    this.progressBarShown = false;
                });
            });
        },

        appendFile(file) {
            const newIdx = Math.min(this.files.length, this.currentOpenFileIdx + 1);
            if (file.kind === 'schemio:doc')  {
                file = initSchemioDiagramFile(file);
            }
            this.files.splice(newIdx, 0, file);
            this.$forceUpdate();
            return newIdx;
        },

        findFileIdxByPath(filePath) {
            for (let i = 0; i < this.files.length; i++) {
                if (this.files[i].path === filePath) {
                    return i;
                }
            }
            return -1;
        },

        focusFile(idx) {
            this.currentOpenFileIdx = idx;
            const file = this.files[idx];
            this.currentFocusedFilePath = file.path;
            this.updateHistoryState(file);
        },

        onModeChangeRequested(file, mode) {
            file.schemeMode = mode;
        },

        onHistoryCommitted(file, scheme, affinityId) {
            fileHistories.get(file.historyId).commit(scheme, affinityId);
            this.updateHistoryState(file);
            file.modified = true;
        },

        undoHistory(file) {
            const history = fileHistories.get(file.historyId);
            if (history.undoable()) {
                const scheme = history.undo();
                if (scheme) {
                    file.document = scheme;
                    file.schemeReloadKey = shortid.generate();
                }
                file.modified = true;
                this.updateHistoryState(file);
            }
        },

        redoHistory(file) {
            const history = fileHistories.get(file.historyId);
            if (history.redoable()) {
                const scheme = history.redo();
                if (scheme) {
                    file.document = scheme;
                    file.schemeReloadKey = shortid.generate();
                }
                file.modified = true;
                this.updateHistoryState(file);
            }
        },

        updateHistoryState(file) {
            const history = fileHistories.get(file.historyId);
            file.historyUndoable = history.undoable();
            file.historyRedoable = history.redoable();
            window.electronAPI.menu.updateHistoryState(file.historyUndoable, file.historyRedoable);
        },

        undoHistoryForCurrentFile() {
            if (this.currentOpenFileIdx < 0) {
                return;
            }
            this.undoHistory(this.files[this.currentOpenFileIdx]);
        },

        redoHistoryForCurrentFile() {
            if (this.currentOpenFileIdx < 0) {
                return;
            }
            this.redoHistory(this.files[this.currentOpenFileIdx]);
        },

        saveFile(file, document, preview) {
            file.isSaving = true;
            let content = document;
            if (file.kind === 'schemio:doc') {
                content = JSON.stringify(document);
            }
            this.$store.dispatch('clearStatusMessage');
            window.electronAPI.writeFile(file.path, content)
            .then(() => {
                file.isSaving = false;
                file.modified = false;
                const entry = findEntryInFileTree(this.fileTree, file.path);
                if (!entry) {
                    return;
                }
                if (file.kind === 'schemio:doc' && entry.name !== document.name) {
                    file.name = document.name;
                    entry.name = document.name;
                    this.fileTreeReloadKey++;
                }

                return window.electronAPI.uploadDiagramPreview(document.id, preview);
            })
            .catch(err => {
                console.error(err);
                file.isSaving = false;
                this.$store.dispatch('setErrorStatusMessage', 'Failed to save, please try again');
                file.modified = true;
            });
        },

        closeFile(fileIdx) {
            if (this.files[fileIdx].modified) {
                this.warnModifiedFileCloseModal.name = this.files[fileIdx].name;
                this.warnModifiedFileCloseModal.fileIdx = fileIdx;
                this.warnModifiedFileCloseModal.shown = true;
            } else {
                this.submitCloseFile(fileIdx);
            }
        },

        submitCloseFile(fileIdx) {
            if (this.currentOpenFileIdx >= fileIdx) {
                let newFocusedIdx = this.currentOpenFileIdx - 1;
                if (newFocusedIdx < 0 && this.files.length > 1) {
                    newFocusedIdx = 0;
                }
                if (newFocusedIdx >= 0) {
                    this.focusFile(newFocusedIdx);
                }
            }
            this.files.splice(fileIdx, 1);
        },

        submitWarnCloseModal() {
            this.warnModifiedFileCloseModal.shown = false;
            this.submitCloseFile(this.warnModifiedFileCloseModal.fileIdx);
        },

        onFileTreeEntryAdded(parent, entry) {
            addEntryToFileTree(this.fileTree, parent, entry);
            this.fileTreeReloadKey++;
            if (entry.kind === 'schemio:doc') {
                this.$nextTick(() => {
                    this.onSchemioDocSelected(entry.path);
                });
            }
        },

        onFolderRenamed(folderPath, name) {
            const entry = findEntryInFileTree(this.fileTree, folderPath);
            if (!entry) {
                return;
            }

            const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + name;
            renameEntryInFileTree(this.fileTree, folderPath, name);
            this.files.forEach(file => {
                if (file.path.startsWith(folderPath)) {
                    file.path = newPath + file.path.substring(folderPath.length);
                }
            });
            this.fileTreeReloadKey++;
        },

        onDiagramRenamed(filePath, name) {
            const entry = findEntryInFileTree(this.fileTree, filePath);
            if (!entry) {
                return;
            }
            entry.name = name;
            for (let i = 0; i < this.files.length; i++) {
                if (this.files[i].path === filePath) {
                    this.files[i].name = name;
                    this.files[i].document.name = name;
                    break;
                }
            }
            this.fileTreeReloadKey++;
        },

        onFileTreeEntriesMoved(movedEntries) {
            window.electronAPI.getProjectFileTree()
            .then(fileTree => {
                this.fileTree = fileTree;
                this.fileTreeReloadKey++;

                //correcting any open files that were affected by the move
                const m = new Map();
                movedEntries.forEach(e => {
                    m.set(e.src, e.dst);
                });
                this.files.forEach(file => {
                    if (m.has(file.path)) {
                        file.path = m.get(file.path);
                    }
                });
            });
        },

        ipcOnFileTreeEntryDeleted(event, path) {
            const entry = findEntryInFileTree(this.fileTree, path);
            if (!entry) {
                return;
            }
            deleteEntryFromFileTree(this.fileTree, path);

            traverseFileTree([entry], e => {
                for (let i = 0; i < this.files.length; i++) {
                    if (this.files[i].path === e.path) {
                        this.files.splice(i, 1);
                        if (this.currentOpenFileIdx === i) {
                            if (this.files.length > 0) {
                                this.currentOpenFileIdx-=1;
                                this.focusFile((this.files.length - this.currentOpenFileIdx + 1) % this.files.length);
                            } else {
                                this.currentOpenFileIdx = -1;
                                this.currentFocusedFilePath = null;
                            }
                        }
                        break;
                    }
                }
            });
            this.fileTreeReloadKey++;
        },

        onMenuEditCut() {
            simulateKeyPress(Keys.CTRL_X, true);
        },
        onMenuEditCopy() {
            simulateKeyPress(Keys.CTRL_C, true);
        },
        onMenuEditPaste() {
            simulateKeyPress(Keys.CTRL_V, true);
        },
        onMenuEditDelete() {
            simulateKeyPress(Keys.DELETE, true);
        },
        onMenuEditSelectAll() {
            simulateKeyPress(Keys.CTRL_A, true);
        },
        onMenuViewZoomIn() {
            simulateKeyPress(Keys.EQUALS, true);
        },
        onMenuViewZoomOut() {
            simulateKeyPress(Keys.MINUS, true);
        },
        onMenuViewResetZoom() {
            simulateKeyPress(Keys.CTRL_ZERO, true);
        },

        openExportPictureModal(file, items, kind) {
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
            this.exportPictureModal.backgroundColor = file.document.style.backgroundColor;
            this.exportPictureModal.kind = kind;
            this.exportPictureModal.shown = true;
        },


        onContextMenuRequested(file, menuOptions) {
            this.contextMenu.id = shortid.generate();
            this.contextMenu.options = new Map();
            const convertMenuOptions = (options) => {
                return options.map(option => {
                    const eventOption = {
                        label: option.name,
                    };
                    if (option.subOptions) {
                        eventOption.submenu = convertMenuOptions(option.subOptions);
                    }

                    if (option.clicked) {
                        this.contextMenu.options.set(option.name, option);
                    }
                    return eventOption;
                });
            };

            window.electronAPI.menu.openContextMenu(this.contextMenu.id, convertMenuOptions(menuOptions));
        },

        onContextMenuOptionSelected(event, menuId, label) {
            if (this.contextMenu.id !== menuId) {
                return;
            }

            if (this.contextMenu.options.has(label)) {
                this.contextMenu.options.get(label).clicked();
            }
        },

        onNewDiagramRequested(folderPath) {
            this.newDiagramModal.folderPath = folderPath;
            this.newDiagramModal.name = '';
            this.newDiagramModal.item = null;
            this.newDiagramModal.editorId = null;
            this.newDiagramModal.shown = true;
        },

        newDiagramSubmitted(diagram) {
            const folderPath = this.newDiagramModal.folderPath;

            window.electronAPI.createNewDiagram(folderPath, diagram)
            .then(entry => {
                const parent = entry.parent !== '.' ? entry.parent : null;

                this.onFileTreeEntryAdded(parent, {
                    name: entry.name,
                    kind: entry.kind,
                    path: entry.path
                });

                this.$nextTick(() => {
                    this.navigatorFolderToExpand = folderPath;
                });

                if (this.newDiagramModal.item) {
                    const item = this.newDiagramModal.item;
                    if (item.shape === 'component') {
                        item.shapeProps.schemeId = entry.id;
                        EditorEventBus.item.changed.specific.$emit(this.newDiagramModal.editorId, item.id, 'shapeProps.schemeId');
                    } else {
                        if (!item.links) {
                            item.links = [];
                        }
                        item.links.push({
                            title: entry.name,
                            url: `/docs/${entry.id}`,
                            type: 'doc'
                        });
                    }
                    EditorEventBus.schemeChangeCommitted.$emit(this.newDiagramModal.editorId);

                }
                this.newDiagramModal.shown = false;
            });
        },

        onNewDiagramRequestedForItem(file, item, isExternalComponent) {
            const parentEntry = findParentEntryInFileTree(this.fileTree, file.path);
            this.newDiagramModal.folderPath = parentEntry ? parentEntry.path : null;
            this.newDiagramModal.name = item.name;

            if (isExternalComponent && item.shape === 'component') {
                const title = stripAllHtml(item.textSlots.body.text);
                if (title.length > 0) {
                    this.newDiagramModal.name = title;
                }
            }
            this.newDiagramModal.item = item;
            this.newDiagramModal.editorId = file.editorId;
            this.newDiagramModal.shown = true;
        }
    }
}
</script>