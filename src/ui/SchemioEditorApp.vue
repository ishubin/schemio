<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="scheme-editor-app">
        <SchemeEditor v-if="patch.patchedScheme && patch.isToggled"
            key="patched-scheme"
            :scheme="patch.patchedScheme"
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
                    <span class="toggle-button" :class="[!patch.isToggled ? 'toggled':'']"
                        @click="patch.isToggled = false"
                        >Origin</span>
                    <span class="toggle-button" :class="[patch.isToggled ? 'toggled':'']"
                        @click="patch.isToggled = true"
                        >Modified</span>
                </div>
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
import { applyPatch } from './scheme/SchemePatch';

export default{
    components: {Debugger, SystemMessagePanel, SchemeEditor},

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
                patchedScheme: null,
                isToggled: false
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
                this.patch.patchedScheme = patchedScheme;
                this.patch.isToggled = true;
                this.$forceUpdate();
            }
        }
    }
}
</script>
