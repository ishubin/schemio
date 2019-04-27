<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <h2>Login</h2>

        <input type="text" name="" v-model="login" placeholder="Login..."/>
        <br/>
        <input type="password" name="" v-model="password" placeholder="Password..."/>
        <br/>
        <span class="btn btn-primary" @click="submitLogin">Submit</span>

    </div>
</template>

<script>
import apiClient from '../apiClient.js';

export default {
    data() {
        return {
            login: '',
            password: ''
        }
    },
    methods: {
        submitLogin() {
            apiClient.login(this.login, this.password).then(() => {
                var redirectTo = this.$route.query.redirect;
                if (!redirectTo || !redirectTo.indexOf('/') === 0) {
                    redirectTo = '/';
                }
                window.location = redirectTo;
            });
        }
    }
}
</script>

<style lang="css">
</style>
