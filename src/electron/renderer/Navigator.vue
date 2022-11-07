<template>
    <div class="elec-navigator" ref="navigatorBody" :style="{width: `${navigatorWidth}px`, 'min-width': `${navigatorWidth}px`}" :class="{collapsed: collapsed}">
        <div class="navigator-header">
            <span v-if="collapsed" class="toggle-button" @click="showNavigator"><i class="fa-solid fa-bars"></i></span>
            <div v-else class="project-name">{{projectName}}</div>
        </div>
        <div v-if="!collapsed" class="navigator-body">
            <div class="navigator-entry" v-for="entry in flatTree" v-if="entry.collapseBitMask === 0" @click="onEntryClick(entry)"
                :class="{focused: entry.path === focusedFile}"
            >
                <div class="navigator-spacing" :style="{'padding-left': `${10 * entry.level}px`}"></div>
                <i v-if="entry.kind === 'dir'" class="folder-collapser fa-solid" :class="[entry.collapsed ? 'fa-angle-right' : 'fa-angle-down']"></i>
                <i v-else class="fa-regular fa-file"></i>
                <span>{{entry.name}}</span>
            </div>
        </div>
        <div ref="navigatorExpander" class="elec-navigator-expander" :style="{left: `${navigatorWidth-1}px`}" @mousedown="navigatorExpanderMouseDown"></div>
    </div>
</template>

<script>
import { dragAndDropBuilder } from '../../ui/dragndrop';

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

function updateTreeCollapseBitMaskAndLevel(entries) {
    _updateTreeCollapseBitMaskAndLevel(entries, 0, 0, false);
}

function _updateTreeCollapseBitMaskAndLevel(entries, level, parentCollapseBitMask, isParentCollapsed) {
    entries.forEach(entry => {
        entry.collapseBitMask = (parentCollapseBitMask << level) | (isParentCollapsed ? 1: 0);
        entry.level = level;
        if (entry.children) {
            _updateTreeCollapseBitMaskAndLevel(entry.children, level + 1, entry.collapseBitMask, entry.collapsed);
        }
    });
}

export default {
    props: {
        projectName: {type: String, required: false, default: null},
        fileTree   : {type: Array, required: true},
        focusedFile: {type: String, required: false},
    },

    data() {
        const tree = generateFileTree(this.fileTree);
        updateTreeCollapseBitMaskAndLevel(tree);
        const {flatTree, lookup} = flattenTreeAndCreateLookup(tree);
        console.log({tree, flatTree});
        return {
            navigatorWidth: 250,
            tree,
            flatTree,
            treeLookup: lookup,
            collapsed: false
        };
    },
    methods: {
        onEntryClick(entry) {
            if (entry.kind === 'dir') {
                this.toggleCollapseDirState(entry);
            } else if (entry.kind === 'schemio-doc') {
                this.$emit('schemio-doc-selected', entry.path);
            }
        },
        toggleCollapseDirState(entry) {
            entry.collapsed = !entry.collapsed;

            if (entry.children) {
                _updateTreeCollapseBitMaskAndLevel(entry.children, entry.level + 1, entry.collapseBitMask, entry.collapsed);
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
        }
    }
}

</script>