<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <schemio-header @user-logged-out="onUserLoggedOut"/>
        <div class="middle-content">
            <p>
                <a href="/">Schemio</a> is a web based diagramming app that allows you to build interactive diagrams.
                Although originally Schemio was not designed for this, but it is also possible to use it as a prototyping app.
            </p>

            <p v-if="isSignedIn">
                <router-link to="/f/" class="btn btn-primary">Open Diagram Explorer</router-link>
            </p>

            <p v-else>
                <span class="btn btn-primary" @click="loginModalShown = true">Sign in</span> or
                <router-link class="btn btn-secondary" to="/offline-editor/">Edit diagram offline</router-link>
            </p>
        </div>

        <login-modal v-if="loginModalShown" @close="loginModalShown = false"/>
    </div>
</template>

<script>
import LoginModal from '../components/LoginModal.vue';
import { getGoogleAuth, getGoogleCurrentUserSession } from '../../googleApi';

export default {
    components: {LoginModal},

    beforeMount() {
        getGoogleAuth().then(googleAuth => {
            this.isSignedIn = googleAuth.isSignedIn.get();
        });
    },

    data() {
        return {
            isSignedIn: getGoogleCurrentUserSession().isSignedIn,
            loginModalShown: false
        };
    },

    methods: {
        onUserLoggedOut() {
            this.isSignedIn = false;
        }
    }
}
</script>
