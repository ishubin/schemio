<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="app-container">
        <router-view :key="$route.fullPath"></router-view>

        <schemio-footer v-if="footerShown"/>
    </div>
</template>

<script>


function shouldShowFooter(route) {
    return route.name !== 'SchemeEditorWebView' && route.name !== 'OfflineSchemeEditorWebView';
}
export default {
    data() {
        return {
            footerShown: shouldShowFooter(this.$route)
        };
    },

    watch: {
        $route (to, from) {
            this.footerShown = shouldShowFooter(this.$route);
        }
    }
}
</script>