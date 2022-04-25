<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="scheme-editor-app">
        <SchemeEditor v-if="patch.patchedScheme && patch.isToggled"
            key="patched-scheme"
            :scheme="patch.patchedScheme"
            :patchIndex="patch.index"
            :editAllowed="editAllowed"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :menuOptions="menuOptions"
            :comments="comments"
            @new-scheme-submitted="onNewSchemeSubmitted"
            @preview-patch-requested="onPreviewPatchRequested"/>

        <SchemeEditor v-else
            :key="`origin-scheme-${originKeyReloadHash}`"
            :scheme="scheme"
            :editAllowed="editAllowed"
            :patchIndex="patch.index"
            :userStylesEnabled="userStylesEnabled"
            :projectArtEnabled="projectArtEnabled"
            :menuOptions="menuOptions"
            :comments="comments"
            @new-scheme-submitted="onNewSchemeSubmitted"
            @preview-patch-requested="onPreviewPatchRequested"/>

        <Debugger v-if="debuggerShown" @close="debuggerShown = false"/>

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

    </div>
</template>

<script>
import {registerDebuggerInitiation} from './logger';
import Debugger from './components/Debugger.vue';
import SystemMessagePanel from './components/SystemMessagePanel.vue';
import SchemeEditor from './components/SchemeEditor.vue';
import { applyPatch, generatePatchIndex, generatePatchStatistic } from './scheme/SchemePatch';
import ColorPicker from './components/editor/ColorPicker.vue';
import Modal from './components/Modal.vue';
import PatchDetails from './components/patch/PatchDetails.vue';
import SchemeContainer from './scheme/SchemeContainer';
import shortid from 'shortid';

export default{
    components: {Debugger, SystemMessagePanel, SchemeEditor, ColorPicker, Modal, PatchDetails},

    props: {
        scheme           : {type: Object, default: () => null},
        editAllowed      : {type: Boolean, default: false},
        userStylesEnabled: {type: Boolean, default: false},
        projectArtEnabled: {type: Boolean, default: true},
        menuOptions      : {type: Array, default: () => []},
        comments         : {type: Object, default: () => null},
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
            originKeyReloadHash: shortid.generate()
        };
    },

    methods: {
        onNewSchemeSubmitted(scheme, callback, errorCallback) {
            this.$emit('new-scheme-submitted', scheme, callback, errorCallback);
        },

        onPreviewPatchRequested(patch) {
            if (this.scheme && patch) {
                this.patch.patch = patch;
                this.patch.stats = generatePatchStatistic(patch);
                this.patch.index = generatePatchIndex(this.patch.stats);

                this.patch.patchedScheme = applyPatch(this.scheme, patch);
                this.patch.isToggled = true;
                this.patch.originSchemeContainer = new SchemeContainer(this.scheme);
                this.patch.modifiedSchemeContainer = new SchemeContainer(this.patch.patchedScheme);
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
            this.scheme = this.patch.patchedScheme;
            this.originKeyReloadHash = shortid.generate();
            this.cancelPatch();
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
