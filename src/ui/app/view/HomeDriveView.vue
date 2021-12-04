<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <schemio-header></schemio-header>
        <div class="middle-content">
            <h2>Welcome to Schemio</h2>

            <span class="link" @click="loginGoogleDrive">Google Drive</span>
        </div>
    </div>
</template>

<script>

export default {
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
