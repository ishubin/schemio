<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="scheme-editor-app">
        <SchemeEditor v-if="patch.patchedScheme && patch.isToggled"
            :key="`patched-scheme-${patch.reloadKey}`"
            :editorId="editorId"
            :scheme="patch.patchedScheme"
            :mode="mode"
            :active="active"
            :schemeReloadKey="schemeReloadKey"
            :patchIndex="patch.index"
            :editAllowed="editAllowed"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :schemeTagsEnabled="schemeTagsEnabled"
            :menuOptions="menuOptions"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            :modeControlEnabled="modeControlEnabled"
            :saveControlEnabled="saveControlEnabled"
            :extraTabs="extraTabs"
            @custom-tab-event="$emit('custom-tab-event', $event)"
            @items-selected="$emit('items-selected')"
            @items-deselected="$emit('items-deselected')"
            @new-scheme-submitted="onNewSchemeSubmitted"
            @mode-change-requested="onModeChangeRequested"
            @history-committed="$emit('patched-history-committed', arguments[0], arguments[1])"
            @undo-history-requested="$emit('undo-history-requested')"
            @redo-history-requested="$emit('redo-history-requested')"
            @editor-state-changed="$emit('editor-state-changed', arguments[0])"
            @delete-diagram-requested="$emit('delete-diagram-requested')"
            @export-picture-requested="$emit('export-picture-requested', arguments[0], arguments[1])"
            @context-menu-requested="$emit('context-menu-requested', arguments[0], arguments[1], arguments[2])"
            @new-diagram-requested-for-item="$emit('new-diagram-requested-for-item', arguments[0], arguments[1])"
            />

        <SchemeEditor v-else
            :key="`origin-scheme`"
            :editorId="editorId"
            :scheme="scheme"
            :mode="mode"
            :modified="modified"
            :active="active"
            :schemeReloadKey="schemeReloadKey"
            :editAllowed="editAllowed"
            :patchIndex="patch.index"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :schemeTagsEnabled="schemeTagsEnabled"
            :menuOptions="menuOptions"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            :modeControlEnabled="modeControlEnabled"
            :saveControlEnabled="saveControlEnabled"
            :extraTabs="extraTabs"
            @custom-tab-event="$emit('custom-tab-event', $event)"
            @items-selected="$emit('items-selected')"
            @items-deselected="$emit('items-deselected')"
            @new-scheme-submitted="onNewSchemeSubmitted"
            @mode-change-requested="onModeChangeRequested"
            @scheme-save-requested="$emit('scheme-save-requested', arguments[0], arguments[1])"
            @history-committed="$emit('history-committed', arguments[0], arguments[1])"
            @undo-history-requested="$emit('undo-history-requested')"
            @redo-history-requested="$emit('redo-history-requested')"
            @editor-state-changed="$emit('editor-state-changed', arguments[0])"
            @delete-diagram-requested="$emit('delete-diagram-requested')"
            @export-picture-requested="$emit('export-picture-requested', arguments[0], arguments[1])"
            @context-menu-requested="$emit('context-menu-requested', arguments[0], arguments[1], arguments[2])"
            @new-diagram-requested-for-item="$emit('new-diagram-requested-for-item', arguments[0], arguments[1])"
            />


        <div v-if="scheme && patch.patchedScheme" class="patch-menu-wrapper">
            <div class="patch-menu-popup">
                <div v-if="patch.menuCollapsed">
                    <span @click="patch.menuCollapsed = false" style="cursor: pointer"><i class="fa-solid fa-angle-down"></i></span>
                </div>
                <div v-else>
                    <span @click="patch.menuCollapsed = true" style="cursor: pointer"><i class="fa-solid fa-angle-up"></i></span>
                    <div class="toggle-group">
                        <span class="toggle-button" :class="[!patch.isToggled ? 'toggled':'']" @click="showPatchOrigin" >Origin</span>
                        <span class="toggle-button" :class="[patch.isToggled ? 'toggled':'']" @click="showPatchModified" >Modified</span>
                    </div>

                    <input type="checkbox" id="chk-patch-menu-toggle-diff-coloring" :checked="patchIsDiffColoringEnabled" @input="updatePatchDiffColoring(arguments[0].target.checked)"/>
                    <label for="chk-patch-menu-toggle-diff-coloring">Highlight diff</label>

                    <color-picker :color="patchAdditionsColor" @input="updatePatchDiffColor('additions', arguments[0])" width="26px" hint="Additions"></color-picker>
                    <color-picker :color="patchDeletionsColor" @input="updatePatchDiffColor('deletions', arguments[0])" width="26px" hint="Deletions"></color-picker>
                    <color-picker :color="patchModificationsColor" @input="updatePatchDiffColor('modifications', arguments[0])" width="26px" hint="Modifications"></color-picker>

                    <span class="btn btn-secondary" @click="patch.detailsModalShown = true">Show Changes</span>

                    <span v-if="overridePatchControls" v-for="patchControl in patchControls"
                        class="btn" :class="patchControl.css" @click="patchControl.click()">{{ patchControl.name }}</span>

                    <span v-if="!overridePatchControls" class="btn btn-primary" @click="applyPatch">Apply</span>
                    <span v-if="!overridePatchControls" class="btn btn-danger" @click="cancelPatch">Cancel</span>
                </div>
            </div>
        </div>

        <Modal v-if="patch.detailsModalShown" title="Patch details" @close="patch.detailsModalShown = false" :width="900">
            <PatchDetails
                :originSchemeContainer="patch.originSchemeContainer"
                :modifiedSchemeContainer="patch.modifiedSchemeContainer"
                :patch="patch.patch"
            />
        </Modal>

        <SystemMessagePanel/>

        <Debugger v-if="debuggerShown" @close="debuggerShown = false"/>
    </div>
</template>

<script>
import {registerDebuggerInitiation} from '../logger';
import Debugger from './Debugger.vue';
import SystemMessagePanel from './SystemMessagePanel.vue';
import SchemeEditor from './SchemeEditor.vue';
import { applySchemePatch, generatePatchIndex, generatePatchStatistic } from '../scheme/SchemePatch';
import ColorPicker from './editor/ColorPicker.vue';
import Modal from './Modal.vue';
import PatchDetails from './patch/PatchDetails.vue';
import SchemeContainer from '../scheme/SchemeContainer';
import EditorEventBus from './editor/EditorEventBus';

export default{
    components: {Debugger, SystemMessagePanel, SchemeEditor, ColorPicker, Modal, PatchDetails},

    props: {
        editorId         : {type: String, required: true},
        mode             : {type: String, default: 'view'},
        scheme           : {type: Object, default: () => null},
        editAllowed      : {type: Boolean, default: false},
        modified         : {type: Boolean, default: false},
        active           : {type: Boolean, default: true},
        userStylesEnabled: {type: Boolean, default: false},
        projectArtEnabled: {type: Boolean, default: true},
        schemeTagsEnabled: {type: Boolean, default: true},
        menuOptions      : {type: Array, default: () => []},
        schemeReloadKey  : {type: String, default: null},
        schemePatch      : {type: Object, default: null},
        historyUndoable  : { type: Boolean, required: true},
        historyRedoable  : { type: Boolean, required: true},
        isSaving         : { type: Boolean, required: true},
        // allows to switch between edit and view modes from quick helper panel
        modeControlEnabled   : { type: Boolean, default: true},
        saveControlEnabled   : { type: Boolean, default: true},
        overridePatchControls: { type: Boolean, default: false},
        patchControls        : { type: Array, default: () => []},
        extraTabs            : { type: Array, default: () => []},
    },

    beforeMount() {
        if (this.schemePatch) {
            this.generatePatchData(this.schemePatch);
        }
    },

    mounted() {
        registerDebuggerInitiation(() => {
            this.debuggerShown = true;
        });

        EditorEventBus.patchedSchemeUpdated.$on(this.editorId, this.onPatchedSchemeUpdated);
    },

    beforeDestroy() {
        EditorEventBus.patchedSchemeUpdated.$off(this.editorId, this.onPatchedSchemeUpdated);
    },

    data() {
        return {
            debuggerShown: false,
            patch: {
                index                  : null,
                patch                  : null,
                patchedScheme          : null,
                isToggled              : false,
                stats                  : null,
                originSchemeContainer  : null,
                modifiedSchemeContainer: null,
                detailsModalShown      : false,
                menuCollapsed          : false,
                reloadKey              : 0
            },
        };
    },

    methods: {
        onNewSchemeSubmitted(scheme, callback, errorCallback) {
            this.$emit('new-scheme-submitted', scheme, callback, errorCallback);
        },

        onPatchedSchemeUpdated(scheme) {
            this.patch.patchedScheme = scheme;
            this.patch.reloadKey++;
        },

        onModeChangeRequested(mode) {
            this.$emit('mode-change-requested', mode);
        },

        generatePatchData(patch) {
            if (this.scheme && patch) {
                this.patch.patch = patch;
                this.patch.stats = generatePatchStatistic(patch);
                this.patch.index = generatePatchIndex(this.patch.stats);

                this.patch.patchedScheme = applySchemePatch(this.scheme, patch);
                this.$emit('patch-modified-generated', this.patch.patchedScheme);
                this.showPatchOrigin();
                this.patch.originSchemeContainer = new SchemeContainer(this.scheme, this.editorId);
                this.patch.modifiedSchemeContainer = new SchemeContainer(this.patch.patchedScheme, this.editorId);
                this.$forceUpdate();
            }
        },

        updatePatchDiffColoring(enabled) {
            this.$store.dispatch('setPatchDiffColoringEnabled', enabled);
        },

        updatePatchDiffColor(changeType, color) {
            this.$store.dispatch('updatePatchDiffColor', {changeType, color});
        },

        cancelPatch() {
            this.resetPatch();
        },

        resetPatch() {
            this.patch.isToggled = false;
            this.patch.patch = null;
            this.patch.patchedScheme = null;
            this.patch.stats = null;
            this.patch.index = null;
            this.patch.originSchemeContainer = null;
            this.patch.modifiedSchemeContainer = null;
        },

        applyPatch() {
            this.$emit('patch-applied', this.patch.patchedScheme);
            this.resetPatch();
        },

        showPatchOrigin() {
            this.patch.isToggled = false;
            this.$emit('patch-origin-toggled');
        },

        showPatchModified() {
            this.patch.isToggled = true;
            this.$emit('patch-modified-toggled');
        }
    },

    computed: {
        patchIsDiffColoringEnabled() {
            return this.$store.getters.patchIsDiffColoringEnabled;
        },

        patchAdditionsColor() {
            return this.$store.getters.patchAdditionsColor;
        },
        patchDeletionsColor() {
            return this.$store.getters.patchDeletionsColor;
        },
        patchModificationsColor() {
            return this.$store.getters.patchModificationsColor;
        },
    }
}
</script>
