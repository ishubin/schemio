<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <schemio-header></schemio-header>
        <div class="middle-content">
            
            <div class="login-box" v-if="isSignedIn">
                <div class="login-box-body">
                    <h2>Welcome to Schemio</h2>

                    <p class="login-alternative-caption">
                        You are signed into Google Drive
                    </p>

                    <router-link class="btn btn-login btn-login-alt btn-login-google-drive" to="/f/">Edit diagrams in Google Drive</router-link>

                    <div class="login-alternative-caption">Or check out offline editor</div>

                    <router-link class="btn btn-login btn-login-alt" to="/offline-editor/">Edit diagrams offline</router-link>

                </div>
            </div>

            <div v-else class="login-box">
                <div class="login-box-body">
                    <span @click="loginGoogleDrive" class="btn btn-login btn-login-alt btn-login-google-drive">Sign to Google Drive</span>

                    <div class="login-alternative-caption">Or check out offline editor</div>

                    <router-link class="btn btn-login btn-login-alt" to="/offline-editor/">Edit diagrams offline</router-link>

                </div>
            </div>
        </div>
    </div>
</template>

<script>

export default {

    beforeMount() {
        window.getGoogleAuth().then(googleAuth => {
            this.isSignedIn = googleAuth.isSignedIn.get();
        })
    },

    data() {
        return {
            isSignedIn: false,
        };
    },

    methods: {
        loginGoogleDrive() {
            window.getGoogleAuth().then(googleAuth => {
                googleAuth.signIn().then(user => {
                    this.$router.push({path: '/f/'});
                });
            });
        }
    }
}
</script>
