<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="header">
        <div class="header-body">
            <router-link to="/" class="header-caption">
                <img src="/assets/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
            </router-link>
            <div class="header-middle-section">
                <ul class="header-menu">
                    <li v-if="isSignedIn">
                        <router-link to="/f/"><span>My Diagrams</span></router-link>
                    </li>
                    <li v-else>
                        <span @click="loginModalShown = true">Sign in</span>
                    </li>
                </ul>
                <slot name="middle-section"></slot>
            </div>
            <div class="right-section">
                <div v-if="currentUser" class="current-user">
                    <div class="user-profile">
                        <img :src="currentUser.image" v-if="currentUser.image" class="user-avatar">
                        <span class="user-name">{{currentUser.name}}</span>
                    </div>
                    <ul class="user-profile-menu">
                        <li>
                            <span class="link" @click="logout">Logout</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="header-loader-container">
            <slot name="loader"></slot>
        </div>
        <login-modal v-if="loginModalShown" @close="loginModalShown = false"/>
    </div>
</template>

<script>
import LoginModal from './LoginModal.vue';

export default {

    components: {LoginModal},

    beforeMount() {
    },

    data() {
        return {
            isSignedIn: false,
            currentUser: null,
            loginModalShown: false
        };
    },

    methods: {
        logout() {
        }
    }
}
</script>