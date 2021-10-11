<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="scheme-editor-app">
        <SchemeEditor
            :scheme="scheme"
            :schemeDiff="schemeDiff"
            :editAllowed="editAllowed"
            :menuOptions="menuOptions"
            :comments="comments" />

        <Debugger v-if="debuggerShown" @close="debuggerShown = false"/>

        <SystemMessagePanel/>

    </div>
</template>

<script>
import {registerDebuggerInitiation} from './logger';
import Debugger from './components/Debugger.vue';
import SystemMessagePanel from './components/SystemMessagePanel.vue';
import SchemeEditor from './components/SchemeEditor.vue';

export default{
    components: {Debugger, SystemMessagePanel, SchemeEditor},

    props: {
        scheme       : {type: Object, default: () => null},
        schemeDiff   : {type: Object, default: () => null},
        editAllowed  : {type: Boolean, default: false},
        menuOptions  : {type: Array, default: () => []},
        comments     : {type: Object, default: () => null},
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
