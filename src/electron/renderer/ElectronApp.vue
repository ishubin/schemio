<template>
    <div class="app-container">
        <Navigator v-if="projectPath && projectName && fileTree"
            :projectPath="projectPath"
            :projectName="projectName"
            :fileTree="fileTree"
            :fileTreeReloadKey="fileTreeReloadKey"
            :focusedFile="currentFocusedFilePath"
            @schemio-doc-selected="onSchemioDocSelected"
            @entry-added="onFileTreeEntryAdded"
            @renamed-folder="onFolderRenamed"
            @renamed-diagram="onDiagramRenamed"
            @moved-entries="onFileTreeEntriesMoved"
            />
        <div class="elec-main-body">
            <FileTabPanel :files="files" :currentOpenFileIndex="currentOpenFileIdx" @selected-file="focusFile" @closed-file="closeFile"/>
            <div class="elec-file-container">
                <div v-if="!projectPath" class="elec-no-project">
                    <span class="btn btn-primary" @click="openProject">Open Project...</span>
                </div>
                <div v-else style="height: 100%">
                    <div :key="file.path" v-for="(file, fileIdx) in files" style="height: 100%" :style="{display: fileIdx === currentOpenFileIdx ? 'block': 'none'}">
                        <SchemioEditorApp
                            :key="`editor-${file.path}`"
                            :editorId="`editor-${file.path}`"
                            :scheme="file.document"
                            :schemeReloadKey="file.schemeReloadKey"
                            :mode="file.schemeMode"
                            :active="fileIdx === currentOpenFileIdx"
                            :editAllowed="true"
                            :modified="file.modified"
                            :historyUndoable="file.historyUndoable"
                            :historyRedoable="file.historyRedoable"
                            @scheme-save-requested="saveFile(file, arguments[0], arguments[1])"
                            @mode-change-requested="onModeChangeRequested(file, arguments[0])"
                            @history-committed="onHistoryCommitted(file, arguments[0], arguments[1])"
                            @undo-history-requested="undoHistory(file)"
                            @redo-history-requested="redoHistory(file)"
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
    </div>
</template>

<script>
import shortid from 'shortid';
import { enrichSchemeWithDefaults } from '../../ui/scheme/Scheme';
import SchemioEditorApp from '../../ui/SchemioEditorApp.vue';
import Navigator from './Navigator.vue';
import History from '../../ui/history/History';
import FileTabPanel from './FileTabPanel.vue';
import Modal from '../../ui/components/Modal.vue';
import {addEntryToFileTree, deleteEntryFromFileTree, findEntryInFileTree, findParentEntryInFileTree, traverseFileTree, renameEntryInFileTree } from '../../common/fs/fileTree';

const fileHistories = new Map();

function initSchemioDiagramFile(originalFile) {
    const file = {
        ...originalFile,
        document: {},
        error: null,
        modified: false,
        schemeMode: 'view',
        schemeReloadKey: shortid.generate(),
        // Take it out of here so that it does not become reactive
        historyId: originalFile.path + shortid.generate(),
        historyUndoable: false,
        historyRedoable: false,
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
    components: {Navigator, SchemioEditorApp, FileTabPanel, Modal},

    beforeMount() {
        window.electronAPI.$on('navigator:entry-deleted', this.ipcOnFileTreeEntryDeleted);
        window.electronAPI.$on('navigator:open', this.ipcOnNavigatorOpen);
    },

    beforeDestroy() {
        window.electronAPI.$off('navigator:entry-deleted', this.ipcOnFileTreeEntryDeleted);
        window.electronAPI.$off('navigator:open', this.ipcOnNavigatorOpen);
    },

    data () {
        return {
            projectPath: null,
            projectName: null,
            fileTree: null,
            fileTreeReloadKey: 1,
            files: [],
            currentOpenFileIdx: -1,
            currentFocusedFilePath: null,
            navigatorWidth: 250,
            warnModifiedFileCloseModal: {
                name: null,
                fileIdx: null,
                shown: false
            }
        };
    },

    methods: {
        openProject() {
            window.electronAPI.openProject()
            .then(project => {
                if (project) {
                    this.projectPath = project.path;
                    this.projectName = project.name;
                    this.fileTree = project.fileTree
                }
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

            window.electronAPI.readFile(docPath).then(file => {
                const newIdx = this.appendFile(file);
                this.focusFile(newIdx);
            });
        },

        appendFile(file) {
            const newIdx = Math.min(this.files.length, this.currentOpenFileIdx + 1);
            if (file.kind === 'schemio-doc')  {
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
            this.currentFocusedFilePath = this.files[idx].path;
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
        },

        saveFile(file, document, preview) {
            let content = document;
            if (file.kind === 'schemio-doc') {
                content = JSON.stringify(document);
            }
            this.$store.dispatch('clearStatusMessage');
            window.electronAPI.writeFile(file.path, content)
            .then(() => {
                file.modified = false;
                const entry = findEntryInFileTree(this.fileTree, file.path);
                if (!entry) {
                    return;
                }
                if (file.kind === 'schemio-doc' && entry.name !== document.name) {
                    file.name = document.name;
                    entry.name = document.name;
                    this.fileTreeReloadKey++;
                }
            })
            .catch(err => {
                console.error(err);
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
            if (entry.kind === 'schemio-doc') {
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
                if (file.path.startsWidth(folderPath)) {
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
        }
    }
}
</script>