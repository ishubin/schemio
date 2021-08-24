<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="app-container">
        <SchemeEditorView :projectId="projectId" :scheme="scheme"/>

        <Debugger v-if="debuggerShown" @close="debuggerShown = false"/>

        <SystemMessagePanel/>

    </div>
</template>

<script>
import {registerDebuggerInitiation} from './logger';
import Debugger from './components/Debugger.vue';
import SystemMessagePanel from './components/SystemMessagePanel.vue';
import SchemeEditorView from './components/SchemeEditor.vue';

export default{
    components: {Debugger, SystemMessagePanel, SchemeEditorView},

    props: {
        projectId: {type: String, default: null},
        scheme: {type: Object, default: null},
    },

    mounted() {
        registerDebuggerInitiation(() => {
            this.debuggerShown = true;
        });
    },

    data() {
        return {
            debuggerShown: false,
        };
    },
}
</script>
