<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="header">
        <a href="/" class="header-caption">
            <img src="/assets/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
        </a>
        <div class="header-middle-section">
            <ul class="header-menu">
                <li v-if="isSignedIn">
                    <router-link to="/f/"><span>My Diagrams</span></router-link>
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
            <div v-else-if="!isSignedIn">
                <span class="link" @click="loginModalShown = true">Sign in</span>
            </div>
        </div>

        <login-modal v-if="loginModalShown" @close="loginModalShown = false"/>
    </div>
</template>

<script>
import LoginModal from './LoginModal.vue';
import { getGoogleCurrentUserSession, getGoogleAuth, googleSignOut } from '../../googleApi';

export default {

    components: {LoginModal},

    beforeMount() {
        getGoogleAuth().then(googleAuth => {
            const currentUserSession = getGoogleCurrentUserSession();
            if (currentUserSession) {
                this.isSignedIn = currentUserSession.isSignedIn;
                this.currentUser = currentUserSession.user
            } else {
                this.isSignedIn = false;
                this.currentUser = null;
            }
        });
    },
    
    data() {
        const currentUserSession = getGoogleCurrentUserSession();
        return {
            isSignedIn: currentUserSession.isSignedIn,
            currentUser: currentUserSession.user,
            loginModalShown: false
        };
    },

    methods: {
        logout() {
            googleSignOut().then(() => {
                this.isSignedIn = false;
                this.currentUser = null;
                this.$emit('user-logged-out');
                this.$router.push({path: '/'});
            });
        }
    }
}
</script>