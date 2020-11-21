<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="container">
        <router-view></router-view>

        <debugger v-if="debuggerShown" @close="debuggerShown = false"/>
    </div>
</template>

<style>
</style>

<script>
import {registerDebuggerInitiation} from './logger';
import Debugger from './components/Debugger.vue';

export default{
    components: {Debugger},

    mounted() {
        registerDebuggerInitiation(() => {
            this.debuggerShown = true;
        });
    },

    data() {
        return {
            debuggerShown: false
        };
    }
}
</script>
