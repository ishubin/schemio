<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="header">
        <div class="header-body">
            <a :href="rootPath" class="header-caption">
                <img :src="`${assetsPath}/images/schemio-logo-white.small.png`" height="25"/> <span>Schemio</span>
            </a>
            <div class="header-middle-section">
                <slot name="middle-section" class="header-middle-section-container"></slot>
            </div>
            <div class="right-section">
                <span v-if="currentColorScheme === 'dark'" class="theme-switcher" @click="changeTheme('light')" title="Switch to light theme">
                    <i class="fa-solid fa-sun"></i>
                </span>
                <span v-else class="theme-switcher" @click="changeTheme('dark')" title="Switch to light theme">
                    <i class="fa-solid fa-moon"></i>
                </span>

                <div v-if="staticExportAllowed" class="current-user">
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

    mounted() {
        this.currentColorScheme = document.body.getAttribute('data-theme');
    },

    data() {
        return {
            staticExportModalShown: false,
            currentColorScheme: 'light',
        };
    },

    methods: {
        changeTheme(theme) {
            this.currentColorScheme = theme;
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }
    },

    computed: {
        staticExportAllowed() {
            return this.$store.getters.staticExportAllowed;
        },

        rootPath() {
            return this.$store.getters.rootPath;
        },

        assetsPath() {
            return this.$store.getters.assetsPath;
        },
    }
}
</script>