<template>
    <div class="app-container">
        <Navigator v-if="fileTree" :fileTree="fileTree" @schemio-doc-selected="onSchemioDocSelected"/>
        <div class="elec-main-body">
            <div class="elec-tab-container">
                <div class="file-tab" v-for="(file, fileIdx) in files"
                    :class="{selected: fileIdx === currentOpenFileIdx}"
                    :key="`tab-${file.path}`"
                    @click="focusFile(fileIdx)"
                >
                    <span>{{file.name}}</span>
                    <span class="close"><i class="fas fa-times"></i></span>
                </div>
            </div>
            <div class="elec-file-container">
                <div v-if="files.length === 0">
                    <span class="btn btn-primary" @click="openProject">Open Project...</span>
                </div>
                <div v-else style="height: 100%">
                    <div v-for="(file, fileIdx) in files" style="height: 100%" :style="{display: fileIdx === currentOpenFileIdx ? 'block': 'none'}">
                        <SchemioEditorApp
                            :key="`schemio-editor-${file.path}`"
                            :scheme="file.document"
                            :schemeReloadKey="file.schemeReloadKey"
                            :mode="file.schemeMode"
                            :editAllowed="true"
                            :historyUndoable="file.historyUndoable"
                            :historyRedoable="file.historyRedoable"
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
            fileTree: null,
            files: [],
            currentOpenFileIdx: -1
        };
    },

    methods: {
        openProject() {
            window.electronAPI.openProject().then(filePath => {
                this.projectPath = filePath;

                window.electronAPI.scanProject(this.projectPath)
                .then(fileTree => {
                    this.fileTree = fileTree;
                });
            });
        },

        onSchemioDocSelected(docPath) {
            //TODO check if the tab is already open and just focus it
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
        },

        onModeChangeRequested(file, mode) {
            file.schemeMode = mode;
        },

        onHistoryCommitted(file, scheme, affinityId) {
            fileHistories.get(file.historyId).commit(scheme, affinityId);
            this.updateHistoryState(file);
        },

        undoHistory(file) {
            const history = fileHistories.get(file.historyId);
            if (history.undoable()) {
                const scheme = history.undo();
                if (scheme) {
                    file.document = scheme;
                    file.schemeReloadKey = shortid.generate();
                }
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
                this.updateHistoryState(file);
            }
        },

        updateHistoryState(file) {
            const history = fileHistories.get(file.historyId);
            file.historyUndoable = history.undoable();
            file.historyRedoable = history.redoable();
        },
    }
}
</script>