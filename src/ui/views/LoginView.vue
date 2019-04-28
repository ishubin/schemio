<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="login-view">
        <header-component/>

        <div class="content-wrapper">

            <div class="login-box">
                <h2>Login</h2>

                <div class="login-box-body">
                    <input class="textfield" type="text" name="" v-model="login" placeholder="Login..."/>
                    <input class="textfield" type="password" name="" v-model="password" placeholder="Password..."/>
                    <span class="btn btn-primary" @click="submitLogin">Submit</span>
                    <span class="error-message" v-if="errorMessage">{{errorMessage}}</span>
                </div>
            </div>

        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';
import apiClient from '../apiClient.js';

export default {
    components: {HeaderComponent},
    data() {
        return {
            login: '',
            password: '',
            errorMessage: null
        }
    },
    methods: {
        submitLogin() {
            apiClient.login(this.login, this.password).then(() => {
                var redirectTo = this.$route.query.redirect;
                if (!redirectTo || !redirectTo.indexOf('/') === 0) {
                    redirectTo = '/';
                }
                this.errorMessage = null;
                window.location = redirectTo;
            }).catch(err => {
                this.errorMessage = 'Invalid user/password';
            });
        }
    }
}
</script>

<style lang="css">
</style>
