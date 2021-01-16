<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="header">
        <router-link :to="{path: '/'}" class="header-caption">
            <img src="/assets/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
        </router-link>

        <router-link v-if="project" :to="{path: `/projects/${project.id}`}"><i class="fas fa-home"></i> {{project.name}}</router-link>
        <span v-if="currentUser && projectId && allowNewScheme" class="link" @click="$emit('new-scheme-requested')"><i class="far fa-file-alt"></i> New Scheme</span>

        <div class="header-middle-section">
            <slot name="middle-section"></slot>
        </div>

        <div class="top-right-panel">
            <div v-if="currentUser">
                <menu-dropdown 
                    :name="currentUserName"
                    :options="userDropDownOptions"
                    />
            </div>
            <div v-else>
                <a :href="'/login?redirect=' + originalUrlEncoded">Login</a>
            </div>
        </div>
    </div>
</template>

<script>
import MenuDropdown from './MenuDropdown.vue'
import map from 'lodash/map';

export default {
    props: {
        projectId     : { type: String, default: null},
        project       : { type: Object, default: null},
        allowNewScheme: { type: Boolean, default: true }
    },

    components: { MenuDropdown },

    data() {
        return {
            originalUrlEncoded: encodeURIComponent(window.location),
            userDropDownOptions: [{
                name: 'My Projects',
                link: '/projects'
            }, {
                name: 'Logout',
                link: '/auth/logout'
            }]
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },
        currentUserName() {
            const user = this.$store.getters.currentUser;
            if (user) {
                return user.name;
            }
            return '';
        }
    }
}
</script>

<style lang="css">
</style>