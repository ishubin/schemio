<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="app-container">
        <router-view></router-view>

        <debugger v-if="debuggerShown" @close="debuggerShown = false"/>

        <system-message-panel/>

        <consent-banner v-if="showConsent" @close="showConsent = false"/>
    </div>
</template>

<script>
import {registerDebuggerInitiation} from './logger';
import Debugger from './components/Debugger.vue';
import SystemMessagePanel from './components/SystemMessagePanel.vue';
import ConsentBanner from './components/ConsentBanner.vue';
import config from './config';
import { hasGivenConsent } from './privacy';

export default{
    components: {Debugger, SystemMessagePanel, ConsentBanner},

    mounted() {
        registerDebuggerInitiation(() => {
            this.debuggerShown = true;
        });
    },

    data() {
        return {
            debuggerShown: false,
            showConsent: config.consent.enabled && !hasGivenConsent()
        };
    }
}
</script>
