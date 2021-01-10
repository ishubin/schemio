<template>
    <div>
        <header-component/>
        <div class="middle-content">
            <h1>Authentication Error</h1>

            <div v-if="reason === 'github_auth_error'">
                Sorry, something went wrong when trying to authenticate you with your GitHub account
            </div>
            <div v-if="reason === 'google_auth_error'">
                Sorry, something went wrong when trying to authenticate you with your Google account
            </div>
            <div v-if="reason === 'wrong_auth_provider'">
                Sorry, it looks like this email is already associated with a different auth provider.
            </div>
        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';

export default {
    components: {HeaderComponent},

    data() {
        return {
            reason: this.$route.query.reason
        };
    }
}
</script>
