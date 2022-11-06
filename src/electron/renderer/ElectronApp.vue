<template>
    <div class="app-container">
        <Navigator v-if="fileTree"
            :projectName="projectName"
            :fileTree="fileTree"
            :focusedFile="currentFocusedFilePath"
            :style="{width: `${navigatorWidth}px`, 'min-width': `${navigatorWidth}px`}"
            @schemio-doc-selected="onSchemioDocSelected"
            />
        <div class="elec-main-body">
            <div class="elec-tab-container">
                <div class="elec-tab-wrapper">
                    <div class="file-tab" v-for="(file, fileIdx) in files"
                        :class="{selected: fileIdx === currentOpenFileIdx}"
                        :key="`tab-${file.path}`"
                    >
                        <span class="title" @click="focusFile(fileIdx)">{{file.name}}</span>
                        <span class="close" @click="closeFile(fileIdx)"><i class="fas fa-times"></i></span>
                    </div>
                </div>
            </div>
            <div class="elec-file-container">
                <div v-if="files.length === 0">
                    <span class="btn btn-primary" @click="openProject">Open Project...</span>
                </div>
                <div v-else style="height: 100%">
                    <div :key="file.path" v-for="(file, fileIdx) in files" style="height: 100%" :style="{display: fileIdx === currentOpenFileIdx ? 'block': 'none'}">
                        <SchemioEditorApp
                            :key="`schemio-editor-${file.path}`"
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
    </div>
</template>

<script>
import shortid from 'shortid';
import { enrichSchemeWithDefaults } from '../../ui/scheme/Scheme';
import SchemioEditorApp from '../../ui/SchemioEditorApp.vue';
import Navigator from './Navigator.vue';
import History from '../../ui/history/History';


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
    }
    catch (err) {
        file.error = 'Failed to read schemio diagram';
    }

    enrichSchemeWithDefaults(file.document);
    history.commit(file.document);
    return file;
}

export default {
    components: {Navigator, SchemioEditorApp},
    data () {
        return {
            projectPath: null,
            projectName: null,
            fileTree: null,
            files: [],
            currentOpenFileIdx: -1,
            currentFocusedFilePath: null,
            navigatorWidth: 250
        };
    },

    methods: {
        openProject() {
            window.electronAPI.openProject().then(project => {
                this.projectPath = project.path;
                this.projectName = project.name;

                window.electronAPI.scanProject(this.projectPath)
                .then(fileTree => {
                    this.fileTree = fileTree;
                });
            });
        },

        onSchemioDocSelected(docPath) {
            window.electronAPI.readFile(this.projectPath, docPath).then(file => {
                const idx = this.findFileIdxByPath(file.path);
                if (idx >= 0) {
                    this.focusFile(idx);
                } else {
                    const newIdx = this.appendFile(file);
                    this.focusFile(newIdx);
                }
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
            window.electronAPI.writeFile(this.projectPath, file.path, content)
            .then(() => {
                file.modified = false;
            })
            .catch(err => {
                this.$store.dispatch('setErrorStatusMessage', 'Failed to save, please try again');
                file.modified = true;
            });
        },

        closeFile(fileIdx) {
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
        }
    }
}
</script>