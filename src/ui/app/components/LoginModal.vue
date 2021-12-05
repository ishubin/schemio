<template>
    <div class="modal-mask">
        <div class="login-modal-wrapper">
            <div class="login-modal">
                <span class="modal-close" @click="$emit('close')"><i class="fas fa-times"/></span>
                <div class="login-modal-body">
                    <h2>Welcome to Schemio</h2>

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