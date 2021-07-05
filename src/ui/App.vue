<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="app-container">
        <router-view></router-view>

        <debugger v-if="debuggerShown" @close="debuggerShown = false"/>

        <system-message-panel/>

        <consent-banner v-if="consentShown"/>

        <div class="footer" v-if="routerName !== 'SchemeEditorView'">
            <div class="middle-content">
                <ul>
                    <li>
                        <a href="/">Home</a>
                    </li>
                    <li>
                        <a href="/about">About</a>
                    </li>
                    <li>
                        <a href="/terms-of-service">Terms of Service</a>
                    </li>
                    <li>
                        <span class="link" @click="showConsentModal()">Manage Cookie Options</span>
                    </li>
                </ul>
            </div>

        </div>
        <consent-modal v-if="consentModalShown" @close="consentModalShown = false"/>
    </div>
</template>

<script>
import {registerDebuggerInitiation} from './logger';
import Debugger from './components/Debugger.vue';
import SystemMessagePanel from './components/SystemMessagePanel.vue';
import ConsentBanner from './components/ConsentBanner.vue';
import ConsentModal from './components/ConsentModal.vue';

export default{
    components: {Debugger, SystemMessagePanel, ConsentBanner, ConsentModal},

    mounted() {
        registerDebuggerInitiation(() => {
            this.debuggerShown = true;
        });
    },

    data() {
        return {
            debuggerShown: false,
            consentModalShown: false
        };
    },

    methods: {
        showConsentModal() {
            this.consentModalShown = true;
        }
    },

    computed: {
        routerName() {
            return this.$route.name
        },
        consentShown() {
            return !this.$store.getters.hasConsent;
        },
    }
}
</script>
