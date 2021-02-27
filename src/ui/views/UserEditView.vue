<template>
    <div class="user-edit-view">
        <header-component/>

        <div class="middle-content">
            <h2>Edit User Profile</h2>
            
            <div v-if="currentUser">
                <div v-if="currentUser.editAllowed">
                    <div class="ctrl-label">Name</div>
                    <input type="text" class="textfield" v-model="name"/>

                    <div class="section">
                        <div class="ctrl-label">Avatar</div>
                        <input type="checkbox" id="chk-use-gravatar" v-model="useGravatar"/>
                        <label for="chk-use-gravar">Use <a class="link" href="https://gravatar.com/">Gravatar</a></label>
                    </div>

                    <div class="section" v-if="errorMessage">
                        <div class="msg msg-error">{{errorMessage}}</div>
                    </div>

                    <div class="section">
                        <span class="btn btn-primary" @click="saveUserProfile">Save</span>
                        <a :href="`/users/${currentUser.id}`" class="btn btn-secondary">Cancel</a>
                    </div>
                </div>
                <div v-else>
                    Sorry, but editing user profile is not supported
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import apiClient from '../apiClient';
import HeaderComponent from '../components/Header.vue';

export default {
    components: { HeaderComponent },

    data() {
        let name = '';

        if (this.$store.state.currentUser) {
            name = this.$store.state.currentUser.name;
        }
        return {
            name,
            useGravatar: false,
            
            errorMessage: null,

            isSaving: false
        };
    },

    methods: {
        saveUserProfile() {
            const name = this.name.trim();
            if (!name) {
                this.errorMessage = 'Name cannot be empty';
                return;
            }
            
            this.errorMessage = null;

            let avatarType = null;
            if (this.useGravatar) {
                avatarType = 'gravatar';
            }

            this.isSaving = true;

            apiClient.saveUserProfile({
                name,
                settings: {
                    avatarType
                }
            }).then(() => {
                this.isSaving = false;
                window.location = `/users/${this.currentUser.id}`;
            }).catch(err => {
                this.isSaving = false;
                this.errorMessage = 'Failed to update user profile, try again later';
            });
        }
    },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        }
    }
}
</script>