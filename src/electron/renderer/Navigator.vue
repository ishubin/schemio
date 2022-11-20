<template>
    <div class="elec-navigator" ref="navigatorBody" :style="{width: `${navigatorWidth}px`, 'min-width': `${navigatorWidth}px`}" :class="{collapsed: collapsed}">
        <div class="navigator-header">
            <span v-if="collapsed" class="toggle-button" @click="showNavigator"><i class="fa-solid fa-bars"></i></span>
            <div v-else class="project-name">{{projectName}}</div>
        </div>
        <div v-if="!collapsed" class="navigator-body navigator-droppable" data-entry-kind="void" @contextmenu.prevent="onVoidRightClick">
            <div class="navigator-entry navigator-droppable" v-for="entry in flatTree" v-if="entry.collapseBitMask === 0"
                @mousedown="onEntryMouseDown($event, entry)"
                @contextmenu.prevent="openContextMenuForFile(entry)"
                @mouseover="showPreviewForEntry($event, entry)"
                @mouseleave="stopPreviewForEntry(entry)"
                :class="{focused: entry.path === focusedFile}"
                :data-entry-path="entry.path"
                :data-entry-kind="entry.kind"
            >
                <div class="navigator-spacing" :style="{'padding-left': `${10 * entry.level}px`}"></div>
                <i v-if="entry.kind === 'dir'" class="icon folder-collapser fa-solid" :class="[entry.collapsed ? 'fa-angle-right' : 'fa-angle-down']"></i>
                <i v-else class="icon fa-regular fa-file"></i>
                <input v-if="renamingFilePath === entry.path" ref="renamingInput" type="text" class="renaming-textfield"
                    :value="renamingName"
                    @keydown.enter="submitRenaming"
                    @keydown.esc="submitRenaming"
                    @blur="submitRenaming"
                    />
                <span class="entry-name" v-else>{{entry.name}}</span>
            </div>
        </div>
        <div ref="navigatorExpander" class="elec-navigator-expander" :style="{left: `${navigatorWidth-1}px`}" @mousedown="navigatorExpanderMouseDown"></div>

        <div class="navigator-entry-preview" v-if="preview.shown" :style="{left: `${navigatorWidth}px`, top: `${preview.top}px`}">
            <h3>{{preview.name}}</h3>
            <img :src="preview.url"/>
        </div>

        <Modal v-if="newFolderModal.shown" @close="newFolderModal.shown = false" :title="newFolderModalTitle" primaryButton="Create" @primary-submit="newFolderSubmitted">
            <input ref="newFolderName" type="text" class="textfield" v-model="newFolderModal.name" placeholder="Folder name..."/>
        </Modal>

        <CreateNewSchemeModal v-if="newDiagramModal.shown" :uploadEnabled="false" @scheme-submitted="newDiagramSubmitted" @close="newDiagramModal.shown = false"/>

        <div ref="entryDragger" class="navigator-entry-drag-preview" style="position: fixed; white-space:nowrap;" :style="{display: dragging.startedDragging ? 'inline-block' : 'none' }">
            {{dragging.name}}
        </div>
    </div>
</template>

<script>
import { dragAndDropBuilder } from '../../ui/dragndrop';
import Modal from '../../ui/components/Modal.vue';
import CreateNewSchemeModal from '../../ui/components/CreateNewSchemeModal.vue';
import { findEntryInFileTree, findParentEntryInFileTree } from '../../common/fs/fileTree';

/**
 *
 * @param {Array} entries
 */
function generateFileTree(entries) {
    const convertedEntries = [];

    entries.forEach(originalEntry => {
        const entry = {
            kind: originalEntry.kind,
            name: originalEntry.name,
            path: originalEntry.path,
            collapseBitMask: 0,
        };

        if (originalEntry.previewURL) {
            entry.previewURL = originalEntry.previewURL;
        }

        if (entry.kind === 'dir') {
            entry.collapsed = true;
            if (originalEntry.children) {
                entry.children = generateFileTree(originalEntry.children);
            }
        }
        convertedEntries.push(entry);
    });
    convertedEntries.sort((a, b) => {
        if (a.kind !== b.kind) {
            if (a.kind === 'dir') {
                return -1;
            } else {
                return 1;
            }
        }
        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    return convertedEntries;
}

function flattenTreeAndCreateLookup(entries) {
    const lookup = new Map();
    const flatTree = _flattenTreeAndFillLookup(entries, lookup);
    return {flatTree, lookup};
}

/**
 *
 * @param {Array} entries
 * @param {Map} lookup
 */
function _flattenTreeAndFillLookup(entries, lookup) {
    let flatTree = [];
    entries.forEach(entry => {
        lookup.set(entry.path, entry);
        flatTree.push(entry);
        if (entry.children) {
            flatTree = flatTree.concat(_flattenTreeAndFillLookup(entry.children, lookup));
        }
    });
    return flatTree;
}

function updateTreeCollapseBitMaskAndLevel(entries, oldTreeLookup) {
    _updateTreeCollapseBitMaskAndLevel(entries, 0, 0, false, oldTreeLookup);
}

function _updateTreeCollapseBitMaskAndLevel(entries, level, parentCollapseBitMask, isParentCollapsed, oldTreeLookup) {
    entries.forEach(entry => {
        entry.collapseBitMask = (parentCollapseBitMask << level) | (isParentCollapsed ? 1: 0);
        entry.level = level;

        if (entry.kind === 'dir' && oldTreeLookup) {
            const oldEntry = oldTreeLookup.get(entry.path);
            if (oldEntry && oldEntry.kind === 'dir') {
                entry.collapsed = oldEntry.collapsed;
            }
        }

        if (entry.children) {
            _updateTreeCollapseBitMaskAndLevel(entry.children, level + 1, entry.collapseBitMask, entry.collapsed, oldTreeLookup);
        }
    });
}

export default {
    components: {Modal, CreateNewSchemeModal},

    props: {
        projectName      : {type: String, required: true},
        projectPath      : {type: String, required: true},
        fileTree         : {type: Array, required: true},
        fileTreeReloadKey: {type: Number, required: true},
        focusedFile      : {type: String, required: false},
    },

    beforeMount() {
        window.electronAPI.$on('navigator:new-diagram-requested', this.ipcOnNewDiagramRequested);
        window.electronAPI.$on('navigator:new-folder-requested', this.ipcOnNewFolderRequested);
        window.electronAPI.$on('navigator:rename', this.ipcOnNavigatorRename);
    },

    beforeDestroy() {
        window.electronAPI.$off('navigator:new-diagram-requested', this.ipcOnNewDiagramRequested);
        window.electronAPI.$off('navigator:new-folder-requested', this.ipcOnNewFolderRequested);
        window.electronAPI.$off('navigator:rename', this.ipcOnNavigatorRename);
    },

    data() {
        const tree = generateFileTree(this.fileTree);
        updateTreeCollapseBitMaskAndLevel(tree);
        const {flatTree, lookup} = flattenTreeAndCreateLookup(tree);
        return {
            navigatorWidth: 250,
            tree,
            flatTree,
            // Map of entry path to entry
            treeLookup: lookup,
            collapsed: false,

            newDiagramModal: {
                shown: false,
                folderPath: null
            },

            newFolderModal: {
                shown: false,
                parentPath: null,
                name: ''
            },

            renamingFilePath: null,
            renamingName: null,

            dragging: {
                startedDragging: false,
                name: '',
                dropKind: 'void',
                dropPath: null
            },

            preview: {
                shown: false,
                name: '',
                url: null,
                top: 0
            }
        };
    },
    methods: {
        reloadTree() {
            const tree = generateFileTree(this.fileTree);
            updateTreeCollapseBitMaskAndLevel(tree, this.treeLookup);
            const {flatTree, lookup} = flattenTreeAndCreateLookup(tree);
            this.flatTree = flatTree;
            this.treeLookup = lookup;
        },

        onEntryMouseDown(event, entry) {
            dragAndDropBuilder(event)
            .withDraggedElement(this.$refs.entryDragger)
            .withDroppableClass('navigator-droppable')
            .onDragStart(() => {
                this.dragging.startedDragging = true;
                this.dragging.name = entry.name;
            })
            .onDone(() => {
                if (!this.dragging.startedDragging) {
                    return;
                }
                this.dragging.startedDragging = false;
                if (this.dragging.dropKind === 'void') {
                    this.submitMoveEntryToRoot(entry);
                } else {
                    const dstEntry = findEntryInFileTree(this.fileTree, this.dragging.dropPath);
                    this.submitMoveEntryToEntry(entry, dstEntry);
                }
            })
            .onDragOver((event, element) => {
                this.dragging.dropKind = element.getAttribute('data-entry-kind');
                this.dragging.dropPath = element.getAttribute('data-entry-path');
            })
            .onSimpleClick(() => {
                if (event.target.tagName.toLowerCase() === 'input') {
                    return;
                }
                if (entry.kind === 'dir') {
                    this.toggleCollapseDirState(entry);
                } else if (entry.kind === 'schemio:doc') {
                    this.$emit('schemio-doc-selected', entry.path);
                }
            })
            .build();
        },

        submitMoveEntryToRoot(entry) {
            const parentEntry = findParentEntryInFileTree(this.fileTree, entry.path);
            if (!parentEntry) {
                //already at root level
                return;
            }

            window.electronAPI.moveFile(entry.path, null)
            .then(response => {
                this.$emit('moved-entries', response.movedEntries);
            });
        },

        submitMoveEntryToEntry(entry, dstEntry) {
            //checking if it tried to move directory to itself
            if (dstEntry.path.startsWith(entry.path)) {
                return;
            }

            let parentEntry = dstEntry;
            if (dstEntry.kind !== 'dir') {
                parentEntry = findParentEntryInFileTree(this.fileTree, dstEntry.path);
                if (!parentEntry) {
                    this.submitMoveEntryToRoot(entry)
                    return;
                }
            }

            window.electronAPI.moveFile(entry.path, parentEntry.path)
            .then(response => {
                this.$emit('moved-entries', response.movedEntries);
            });
        },

        toggleCollapseDirState(entry) {
            entry.collapsed = !entry.collapsed;

            if (entry.children) {
                _updateTreeCollapseBitMaskAndLevel(entry.children, entry.level + 1, entry.collapseBitMask, entry.collapsed);
            }
        },

        expandDirByPath(dirPath) {
            const entry = this.treeLookup.get(dirPath);
            if (entry) {
                entry.collapsed = false;
                if (entry.children) {
                    _updateTreeCollapseBitMaskAndLevel(entry.children, entry.level + 1, entry.collapseBitMask, entry.collapsed);
                }
            }
        },

        navigatorExpanderMouseDown(event) {
            dragAndDropBuilder(event)
            .onDrag(event => {
                const rect = this.$refs.navigatorBody.getBoundingClientRect();
                const overflow = event.pageX - rect.right;
                const newWidth = Math.min(this.navigatorWidth + overflow, window.innerWidth - 200);

                if (newWidth > 80) {
                    this.navigatorWidth = newWidth;
                    this.collapsed = false;
                } else {
                    this.navigatorWidth = 30;
                    this.collapsed = true;
                }
            })
            .build();
        },

        showNavigator() {
            this.navigatorWidth = 250;
            this.collapsed = false;
        },

        onVoidRightClick(event) {
            if (event.target.classList.contains('navigator-body')) {
                window.electronAPI.navigatorOpenContextMenuFile(null);
            }
        },

        openContextMenuForFile(entry) {
            window.electronAPI.navigatorOpenContextMenuFile({
                name: entry.name,
                path: entry.path,
                kind: entry.kind
            });
        },

        ipcOnNavigatorRename(event, filePath) {
            const entry = findEntryInFileTree(this.fileTree, filePath);
            if (!entry) {
                return;
            }

            this.renamingFilePath = filePath;
            this.renamingName = entry.name;
            this.$nextTick(() => {
                if (this.$refs.renamingInput) {
                    this.$refs.renamingInput[0].focus();
                }
            });
        },

        submitRenaming(event) {
            if (this.renamingFilePath) {
                const entry = findEntryInFileTree(this.fileTree, this.renamingFilePath);
                this.renamingFilePath = null;
                const name = event.target.value.trim();
                if (!entry || !name || entry.name === name) {
                    return;
                }

                if (entry.kind === 'dir') {
                    this.submitRenamingFolder(entry, name);
                } else if (entry.kind === 'schemio:doc') {
                    this.submitRenamingDiagram(entry, name);
                }
            }
        },

        submitRenamingDiagram(entry, name) {
            window.electronAPI.renameDiagram(entry.path, name)
            .then(() => {
                this.$emit('renamed-diagram', entry.path, name);
            });
        },

        submitRenamingFolder(entry, name) {
            const oldPath = entry.path;
            const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + name;
            window.electronAPI.renameFolder(entry.path, name)
            .then(() => {
                // updating lookup path so that in next update it can preserve collapse state of directories after reloading the tree
                const keysToUpdate = [];
                this.treeLookup.forEach((e, path) => {
                    if (path.startsWith(oldPath)) {
                        keysToUpdate.push(path);
                    }
                });
                keysToUpdate.forEach(path => {
                    if (path.startsWith(oldPath)) {
                        const e = this.treeLookup.get(path);
                        this.treeLookup.delete(path);
                        this.treeLookup.set(newPath + path.substring(oldPath.length), e);
                    }
                });
                this.$emit('renamed-folder', entry.path, name);
            });
        },

        ipcOnNewFolderRequested(event, parentPath) {
            this.newFolderModal.parentPath = parentPath;
            this.newFolderModal.name = '';
            this.newFolderModal.shown = true;
            this.$nextTick(() => {
                const input = this.$refs.newFolderName;
                if (input) {
                    input.focus();
                }
            });
        },

        newFolderSubmitted() {
            const parentPath = this.newFolderModal.parentPath;
            window.electronAPI.createNewFolder(parentPath, this.newFolderModal.name)
            .then(entry => {
                this.$emit('entry-added', parentPath, entry);
                this.newFolderModal.shown = false;
                this.$nextTick(() => {
                    this.expandDirByPath(parentPath);
                });
            });
        },

        ipcOnNewDiagramRequested(event, folderPath) {
            this.newDiagramModal.folderPath = folderPath;
            this.newDiagramModal.shown = true;
        },

        newDiagramSubmitted(diagram) {
            const folderPath = this.newDiagramModal.folderPath;

            window.electronAPI.createNewDiagram(folderPath, diagram)
            .then(entry => {
                const parent = entry.parent !== '.' ? entry.parent : null;
                this.$emit('entry-added', parent, {
                    name: entry.name,
                    kind: entry.kind,
                    path: entry.path
                });
                this.$nextTick(() => {
                    this.expandDirByPath(folderPath);
                });

                this.newDiagramModal.shown = false;
            });
        },

        showPreviewForEntry(event, entry) {
            if (entry.previewURL) {
                this.preview.name = entry.name;
                this.preview.url = entry.previewURL;
                this.preview.top = event.target.getBoundingClientRect().top;
                this.preview.shown = true;
            }
        },

        stopPreviewForEntry(entry) {
            this.preview.shown = false;
        }
    },
    computed: {
        newFolderModalTitle() {
            if (this.newFolderModal.parentPath) {
                return `New folder in ${this.newFolderModal.parentPath}`;
            }
            return 'New folder';
        }
    },
    watch: {
        fileTreeReloadKey(value) {
            this.reloadTree();
        }
    }
}

</script>