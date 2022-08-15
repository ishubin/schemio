<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="header">
        <div class="header-body">
            <a href="/" class="header-caption">
                <img src="/assets/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
            </a>
            <div class="header-middle-section">
                <slot name="middle-section"></slot>
            </div>
            <div v-if="staticExportAllowed" class="right-section">
                <div class="current-user">
                    <div class="user-profile">
                        <span class="user-name">Admin</span>
                    </div>
                    <ul class="user-profile-menu">
                        <li v-if="staticExportAllowed">
                            <span class="link" @click="staticExportModalShown = true">Export all diagrams</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="header-loader-container">
            <slot name="loader"></slot>
        </div>

        <StaticExportModal v-if="staticExportModalShown" @close="staticExportModalShown = false"/>
    </div>
</template>

<script>
import StaticExportModal from './StaticExportModal.vue';

export default {
    components: {StaticExportModal},

    data() {
        return {
            staticExportModalShown: false
        };
    },

    computed: {
        staticExportAllowed() {
            return this.$store.getters.staticExportAllowed;
        }
    }
}
</script>