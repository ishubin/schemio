<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="header">
        <a href="/" class="header-caption">
            <img src="/assets/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
        </a>
        <div class="header-middle-section">
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

export default {

    components: {LoginModal},

    beforeMount() {
        window.getGoogleAuth().then(googleAuth => {
            this.isSignedIn = googleAuth.isSignedIn.get();
            if (this.isSignedIn) {
                const user = googleAuth.currentUser.get();
                if (user) {
                    const profile = user.getBasicProfile();
                    this.currentUser = {
                        name: profile.getName(),
                        image: profile.getImageUrl()
                    };
                }
            }
        });
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
            window.getGoogleAuth().then(googleAuth => {
                return googleAuth.signOut();
            }).then(() => {
                this.isSignedIn = false;
                this.currentUser = null;
                this.$router.push({path: '/'});
            });
        }
    }
}
</script>