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
                <div v-else-if="currentOpenFileIdx >= 0 && files[currentOpenFileIdx].kind === 'schemio-doc'">
                    <SchemioEditorApp
                        :key="`schemio-editor-${files[currentOpenFileIdx].path}`"
                        :scheme="files[currentOpenFileIdx].document"
                        :editAllowed="true"
                        :isStaticEditor="false"
                        :isOfflineEditor="true"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { enrichSchemeWithDefaults } from '../../ui/scheme/Scheme';
import SchemioEditorApp from '../../ui/SchemioEditorApp.vue';
import Navigator from './Navigator.vue';

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
                try {
                    file.document = JSON.parse(file.content);
                    enrichSchemeWithDefaults(file.document);
                }
                catch (err) {
                    file.error = 'Failed to read schemio diagram';
                }
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
        }
    }
}
</script>