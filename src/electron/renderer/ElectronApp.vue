<template>
    <div class="app-container elec-app-container">
        <Navigator v-if="projectPath && projectName && fileTree"
            :key="projectPath"
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
            @navigator-resized="onNavigatorResized"
            />
        <div class="elec-main-body">
            <div v-if="progressBarShown" class="elec-file-progress-bar"></div>
            <FileTabPanel :files="files" :currentOpenFileIndex="currentOpenFileIdx" @selected-file="focusFile" @closed-file="closeFile"/>
            <div class="elec-file-container">

                <div v-if="!projectPath" class="elec-welcome-panel">
                    <div class="elec-welcome-container">
                        <h1>Schemio</h1>
                        <p class="welcome-caption">
                            Building interactive diagrams
                            <span class="app-version" v-if="appVersion">version {{appVersion}}</span>
                        </p>

                        <span class="link with-icon" @click="openProject"><i class="icon fa-regular fa-folder-open"></i> Open Project...</span>

                        <h3>Recent projects</h3>

                        <div class="recent-projects" v-for="(project, projectIdx) in lastOpenProjects">
                            <span class="link" @click="selectProject(project.path)" :title="project.path">{{project.name}}</span>
                            <span class="icon-delete" @click="forgetRecentProject(projectIdx)"><i class="fas fa-times"></i></span>
                        </div>
                    </div>
                </div>
                <div v-else-if="files.length === 0" style="height: 100%" class="elec-no-editor-panel">
                    <div class="elec-no-editor-container">
                        <span class="link with-icon" @click="onNewDiagramRequested(null)"><i class="icon fa-solid fa-diagram-project"></i> Create diagram</span>
                        <span class="link with-icon" @click="showNewFolderModal"><i class="icon fa-solid fa-folder"></i> Create folder</span>
                    </div>
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
                            @items-selected="onItemsSelected(file)"
                            @items-deselected="onItemsDeselected(file)"
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
            Close anyway?
        </Modal>

        <Modal v-if="warnUnsavedChanges.shown" title="Unsaved changes"
            closeName="Cancel"
            primaryButton="Open project"
            :width="300"
            @primary-submit="warnUnsavedChanges.shown = false; openProject();"
            @close="warnUnsavedChanges.shown = false"
            >
            Unsaved changes in this project
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


        <export-json-modal v-if="exportJSONModalShown.shown" :scheme="exportJSONModalShown.diagram" @close="exportJSONModalShown.shown = false"/>

        <ImportSchemeModal v-if="importSchemeModal.shown" :scheme="importSchemeModal.diagram"
            @close="importSchemeModal.shown = false"
            @import-scheme-submitted="importDiagramSubmitted"/>

        <ExportPictureModal v-if="exportPictureModal.shown"
            :items="exportPictureModal.items"
            :kind="exportPictureModal.kind"
            :background-color="exportPictureModal.backgroundColor"
            @close="exportPictureModal.shown = false"/>

        <Modal v-if="newFolderModal.shown" @close="newFolderModal.shown = false" title="New folder" primaryButton="Create" @primary-submit="newFolderSubmitted">
            <input ref="newFolderName" type="text" class="textfield" v-model="newFolderModal.name" placeholder="Folder name..."/>
        </Modal>

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
import ImportSchemeModal from '../../ui/components/editor/ImportSchemeModal.vue';
import ExportPictureModal from '../../ui/components/editor/ExportPictureModal.vue';
import {addEntryToFileTree, deleteEntryFromFileTree, findEntryInFileTree, traverseFileTree, renameEntryInFileTree, findParentEntryInFileTree } from '../../common/fs/fileTree';
import StoreUtils from '../../ui/store/StoreUtils';
import EditorEventBus from '../../ui/components/editor/EditorEventBus';
import { stripAllHtml } from '../../htmlSanitize';
import {registerElectronKeyEvents} from './keyboard.js';

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
        historyId: originalFile.path + shortid.generate(),
        historyUndoable: false,
        historyRedoable: false,
        isSaving: false,
        itemsSelected: false,
    };

    const history = new History({size: 30});
    fileHistories.set(file.historyId, history);

    file.document = file.content;
    file.name = file.document.name || 'Unnamed';
    if (!file.document.items || file.document.items.length === 0) {
        file.schemeMode = 'edit';
    }

    enrichSchemeWithDefaults(file.document);
    history.commit(file.document);
    return file;
}



export default {
    components: {
        Navigator, SchemioEditorApp, FileTabPanel, Modal,
        ExportPictureModal, CreateNewSchemeModal, ImportSchemeModal,
        'export-json-modal': ExportJSONModal,
    },

    created() {
        this.contextMenu = {
            id: null,
            options: new Map(),
        };
    },

    beforeMount() {
        window.electronAPI.appVersion().then(version => this.appVersion = version);
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
        window.electronAPI.$on('file:openProject', this.onMenuFileOpenProject);
        window.electronAPI.$on('file:exportAsPNG', this.onFileExportAsPNG);
        window.electronAPI.$on('file:exportAsSVG', this.onFileExportAsSVG);
        window.electronAPI.$on('file:exportAsJSON', this.onFileExportAsJSON);
        window.electronAPI.$on('file:importDiagramFromText', this.onImportDiagramFromText);
        window.electronAPI.$on('project-selected', this.onProjectSelected);


        window.electronAPI.storage.getLastOpenProjects().then(projects => {
            if (projects.length > 10) {
                projects.splice(10, projects.length - 10);
            }
            this.lastOpenProjects = projects;
        });

        registerElectronKeyEvents();
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
        window.electronAPI.$off('file:openProject', this.onMenuFileOpenProject);
        window.electronAPI.$off('file:exportAsPNG', this.onFileExportAsPNG);
        window.electronAPI.$off('file:exportAsSVG', this.onFileExportAsSVG);
        window.electronAPI.$off('file:exportAsJSON', this.onFileExportAsJSON);
        window.electronAPI.$off('file:importDiagramFromText', this.onImportDiagramFromText);
        window.electronAPI.$off('project-selected', this.onProjectSelected);
    },

    data() {
        return {
            appVersion: '',
            projectPath: null,
            projectName: null,
            fileTree: null,
            fileTreeReloadKey: 1,
            files: [],
            currentOpenFileIdx: -1,
            currentFocusedFilePath: null,
            navigatorWidth: 250,
            progressBarShown: false,
            lastOpenProjects: [],
            warnModifiedFileCloseModal: {
                name: null,
                fileIdx: null,
                shown: false
            },

            warnUnsavedChanges: {
                shown: false
            },

            staticExporterModal: {
                shown: false,
            },

            exportJSONModalShown: {
                diagram: null,
                shown: false
            },

            exportPictureModal: {
                kind: 'svg',
                shown: false,
                items: [],
                backgroundColor: 'rgba(255,255,255,1.0)'
            },

            newDiagramModal: {
                name: '',
                shown: false,
                folderPath: null,
                item: null,
                editorId: null
            },

            importSchemeModal: {
                diagram: null,
                shown: false
            },

            navigatorFolderToExpand: null,

            newFolderModal: {
                shown: false,
                name: ''
            },
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
                    this.switchToProject(project);
                }
            });
        },

        selectProject(projectPath) {
            window.electronAPI.selectProject(projectPath).then(project => {
                if (project) {
                    this.switchToProject(project);
                }
            });
        },

        onProjectSelected(event, project) {
            this.switchToProject(project);
        },

        switchToProject(project) {
            this.projectPath = project.path;
            this.projectName = project.name;
            this.fileTree = project.fileTree

            this.currentOpenFileIdx = -1;
            for(let i = this.files.length; i >=0 ; i--) {
                this.destroyFile(i);
            }
            window.electronAPI.menu.enableMenuItem('file-exportStatic');
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
            window.electronAPI.menu.events.emitEditorOpened();
            if (file.itemsSelected) {
                window.electronAPI.menu.events.emitItemsSelected();
            } else {
                window.electronAPI.menu.events.emitAllItemsDeselected();
            }
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
            this.$store.dispatch('clearStatusMessage');
            window.electronAPI.writeDiagram(file.path, document)
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
            this.destroyFile(fileIdx);
            if (this.files.length === 0) {
                window.electronAPI.menu.events.emitNoEditorDisplayed();
            }
        },

        destroyFile(fileIdx) {
            const file = this.files[fileIdx];
            if (file) {
                fileHistories.delete(file.historyId);
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

        onFileExportAsPNG() {
            if (this.currentOpenFileIdx >= 0 && this.currentOpenFileIdx < this.files.length) {
                const file = this.files[this.currentOpenFileIdx];
                this.openExportPictureModal(file, file.document.items, 'png');
            }
        },

        onImportDiagramFromText(event, text) {
            if (this.currentOpenFileIdx < 0 || this.currentOpenFileIdx >= this.files.length || this.files.length == 0) {
                return;
            }
            try {
                const diagram = JSON.parse(text);
                //TODO verify if it is correct scheme file
                enrichSchemeWithDefaults(diagram);
                this.importSchemeModal.diagram = diagram;
                this.importSchemeModal.shown = true;
            } catch(err) {
                //TODO handle error
            }
        },

        importDiagramSubmitted() {
            if (this.currentOpenFileIdx >= 0 && this.currentOpenFileIdx < this.files.length) {
                const file = this.files[this.currentOpenFileIdx];
                file.document = this.importSchemeModal.diagram;
                file.schemeReloadKey = shortid.generate();
            }
        },

        onFileExportAsJSON() {
            if (this.currentOpenFileIdx >= 0 && this.currentOpenFileIdx < this.files.length) {
                const file = this.files[this.currentOpenFileIdx];
                this.exportJSONModalShown.diagram = file.document;
                this.exportJSONModalShown.shown = true;
            }
        },

        onFileExportAsSVG() {
            if (this.currentOpenFileIdx >= 0 && this.currentOpenFileIdx < this.files.length) {
                const file = this.files[this.currentOpenFileIdx];
                this.openExportPictureModal(file, file.document.items, 'svg');
            }
        },

        openExportPictureModal(file, items, kind) {
            if (!Array.isArray(items) || items.length === 0) {
                StoreUtils.addErrorSystemMessage(this.$store, 'You have no items in your document');
                return;
            }

            this.exportPictureModal.items = items;
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

        onNavigatorResized() {
            if (this.currentOpenFileIdx < 0 || this.currentOpenFileIdx >= this.files.length) {
                return;
            }

            const file = this.files[this.currentOpenFileIdx];
            EditorEventBus.editorResized.$emit(file.editorId);
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
        },

        onMenuFileOpenProject() {
            if (this.files) {
                for (let i = 0; i < this.files.length; i++) {
                    if (this.files[i].modified) {
                        this.warnUnsavedChanges.shown = true;
                        return;
                    }
                }
            }
            this.openProject();
        },

        onItemsSelected(file) {
            window.electronAPI.menu.events.emitItemsSelected();
            file.itemsSelected = true;
        },

        onItemsDeselected(file) {
            window.electronAPI.menu.events.emitAllItemsDeselected();
            file.itemsSelected = false;
        },

        forgetRecentProject(idx) {
            window.electronAPI.storage.forgetLastOpenProject(this.lastOpenProjects[idx].path).then(() => {
                this.lastOpenProjects.splice(idx, 1);
            });
        },

        showNewFolderModal() {
            this.newFolderModal.name = '';
            this.newFolderModal.shown = true;
        },

        newFolderSubmitted() {
            this.newFolderModal.shown = false;
            window.electronAPI.createNewFolder(null, this.newFolderModal.name)
            .then(entry => {
                this.onFileTreeEntryAdded(null, entry);
            });
        },
    },

    watch: {
        currentOpenFileIdx(idx) {
            if (idx >= 0 && this.files.length > 0 && idx < this.files.length) {
                window.electronAPI.menu.events.emitEditorOpened();
                if (this.files[idx].itemsSelected) {
                    window.electronAPI.menu.events.emitItemsSelected();
                } else {
                    window.electronAPI.menu.events.emitAllItemsDeselected();
                }
            } else {
                window.electronAPI.menu.events.emitNoEditorDisplayed();
            }
        }
    }
}
</script>