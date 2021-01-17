<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="login-view">
        <header-component/>

        <div class="middle-content">

            <div class="login-box">
                <div class="login-box-body">

                    <span class="ctrl-label">Login or Email Address</span>

                    <input ref="loginTextfield" class="textfield" type="text" v-model="login" placeholder="Login..." @keydown.enter="submitLogin"/>

                    <span class="ctrl-label">Password</span>
                    <input class="textfield" type="password" v-model="password" placeholder="Password..." @keydown.enter="submitLogin"/>

                    <span class="btn btn-primary btn-login" @click="submitLogin">Submit</span>
                    <span class="error-message" v-if="errorMessage">{{errorMessage}}</span>

                    <div v-if="alternativeAuthEnabled">
                        <div class="login-alternative-caption">Or login with another provider</div>
                        <a href="/offline-scheme-editor" class="btn btn-login btn-login-alt">Edit Scheme Offline</a>

                        <a href="/auth/google/login" class="btn btn-login btn-login-alt btn-login-google">Google</a>
                        <a href="/auth/github/login" class="btn btn-login btn-login-alt btn-login-github">GitHub</a>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';
import apiClient from '../apiClient.js';
import config from '../config';

export default {
    components: {HeaderComponent},
    mounted() {
        this.$refs.loginTextfield.focus();
    },
    data() {
        return {
            login: '',
            password: '',
            errorMessage: null,
            alternativeAuthEnabled: config.auth.alternative.enabled
        }
    },
    methods: {
        submitLogin() {
            apiClient.login(this.login, this.password).then(user => {
                this.$store.dispatch('setCurrentUser', user);

                const redirectTo = this.$route.query.redirect;
                if (!redirectTo || !redirectTo.indexOf('/') === 0) {
                    redirectTo = '/';
                }
                this.errorMessage = null;
                window.location = redirectTo;
            }).catch(err => {
                this.$store.dispatch('setCurrentUser', null);
                this.errorMessage = 'Invalid user/password';
            });
        }
    }
}
</script>

<style lang="css">
</style>
