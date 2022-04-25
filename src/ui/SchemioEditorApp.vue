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
            key="origin-scheme"
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
            </div>
        </div>

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

export default{
    components: {Debugger, SystemMessagePanel, SchemeEditor, ColorPicker},

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
                index: null,
                patchedScheme: null,
                isToggled: false,
            }
        };
    },

    methods: {
        onNewSchemeSubmitted(scheme, callback, errorCallback) {
            this.$emit('new-scheme-submitted', scheme, callback, errorCallback);
        },

        onPreviewPatchRequested(patch) {
            if (this.scheme && patch) {
                const patchedScheme = applyPatch(this.scheme, patch);
                const patchStats = generatePatchStatistic(patch);
                this.patch.index = generatePatchIndex(patchStats);

                this.patch.patchedScheme = patchedScheme;
                this.patch.isToggled = true;
                this.$forceUpdate();
            }
        },

        updatePatchDiffColoring(enabled) {
            this.$store.dispatch('setPatchDiffColoringEnabled', enabled);
        },

        updatePatchDiffColor(changeType, color) {
            this.$store.dispatch('updatePatchDiffColor', {changeType, color});
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
