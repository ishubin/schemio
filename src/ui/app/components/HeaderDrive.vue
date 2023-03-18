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
                <slot name="middle-section"></slot>
            </div>
            <div class="right-section">
                <div v-if="isSignedIn">
                    <span class="link" @click="logout">Logout</span>
                </div>
            </div>
        </div>
        <div class="header-loader-container">
            <slot name="loader"></slot>
        </div>
    </div>
</template>

<script>
import {googleIsSignedIn, googleSignOut} from '../../googleApi';

export default {

    beforeMount() {
        googleIsSignedIn().then(isSignedIn => {
            this.isSignedIn = isSignedIn;
        })
    },

    data() {
        return {
            isSignedIn: false,
            loginModalShown: false
        };
    },

    methods: {
        logout() {
            googleSignOut().then(() => {
                this.isSignedIn = false;
                this.$emit('user-logged-out');
                this.$router.push({path: '/'});
            });
        }
    }
}
</script>