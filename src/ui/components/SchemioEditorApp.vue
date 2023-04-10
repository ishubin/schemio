<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="scheme-editor-app">
        <SchemeEditor v-if="patch.patchedScheme && patch.isToggled"
            key="patched-scheme"
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
            :comments="comments"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            :modeControlEnabled="modeControlEnabled"
            :saveControlEnabled="saveControlEnabled"
            @items-selected="$emit('items-selected')"
            @items-deselected="$emit('items-deselected')"
            @new-scheme-submitted="onNewSchemeSubmitted"
            @mode-change-requested="onModeChangeRequested"
            @history-committed="$emit('history-committed', arguments[0], arguments[1])"
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
            :comments="comments"
            :historyUndoable="historyUndoable"
            :historyRedoable="historyRedoable"
            :isSaving="isSaving"
            :modeControlEnabled="modeControlEnabled"
            :saveControlEnabled="saveControlEnabled"
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
                <div class="toggle-group">
                    <span class="toggle-button" :class="[!patch.isToggled ? 'toggled':'']" @click="patch.isToggled = false" >Origin</span>
                    <span class="toggle-button" :class="[patch.isToggled ? 'toggled':'']" @click="patch.isToggled = true" >Modified</span>
                </div>

                <input type="checkbox" id="chk-patch-menu-toggle-diff-coloring" :checked="patchIsDiffColoringEnabled" @input="updatePatchDiffColoring(arguments[0].target.checked)"/>
                <label for="chk-patch-menu-toggle-diff-coloring">Highlight diff</label>

                <color-picker :color="patchAdditionsColor" @input="updatePatchDiffColor('additions', arguments[0])" width="26px" hint="Additions"></color-picker>
                <color-picker :color="patchDeletionsColor" @input="updatePatchDiffColor('deletions', arguments[0])" width="26px" hint="Deletions"></color-picker>
                <color-picker :color="patchModificationsColor" @input="updatePatchDiffColor('modifications', arguments[0])" width="26px" hint="Modifications"></color-picker>

                <span class="btn btn-secondary" @click="patch.detailsModalShown = true">Show Changes</span>
                <span class="btn btn-primary" @click="applyPatch">Apply</span>
                <span class="btn btn-danger" @click="cancelPatch">Cancel</span>
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
        comments         : {type: Object, default: () => null},
        schemePatch      : {type: Object, default: null},
        historyUndoable  : { type: Boolean, required: true},
        historyRedoable  : { type: Boolean, required: true},
        isSaving         : { type: Boolean, required: true},
        // allows to switch between edit and view modes from quick helper panel
        modeControlEnabled  : { type: Boolean, default: true},
        saveControlEnabled  : { type: Boolean, default: true},
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
                detailsModalShown      : false
            },
        };
    },

    methods: {
        onNewSchemeSubmitted(scheme, callback, errorCallback) {
            this.$emit('new-scheme-submitted', scheme, callback, errorCallback);
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
                this.patch.isToggled = true;
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
            this.cancelPatch();
        },
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
