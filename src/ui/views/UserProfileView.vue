<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div class="user-profile-view">
        <header-component>
            <div slot="middle-section">
                <router-link v-if="currentUser" :to="{path: '/create-project'}"><i class="far fa-folder"></i> Create Project</router-link>
            </div>
        </header-component>
        <div class="middle-content">
            <div v-if="isLoading" class="mock-container">
                <span class="mock-element mock-long-field mock-animated"></span>
                <span class="mock-element mock-long-field mock-animated"></span>
                <span class="mock-element mock-long-field mock-animated"></span>
            </div>

            <div class="title-with-edit" v-if="user">
                <h2>{{user.name}}</h2>
                <a v-if="currentUser && currentUser.id === user.id && currentUser.editAllowed" :href="`/user/edit`" class="edit-button" title="Edit profile...">
                    <i class="fas fa-pencil-alt"/> Edit
                </a>
            </div>

            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

            <projects-list :key="`project-list-${revision}`" :user-id="userId" :route-prefix="`/users/${userId}`"/>
        </div>
    </div>
</template>


<script>
import HeaderComponent from '../components/Header.vue';
import ProjectsList from '../components/ProjectsList.vue';
import apiClient from '../apiClient';

export default {
    components: { HeaderComponent, ProjectsList },

    beforeMount() {
        this.isLoading = true;
        apiClient.getUserById(this.userId).then(user => {
            this.isLoading = false;
            this.user = user;
        })
        .catch(err => {
            this.isLoading = false;
            this.errorMessage = 'Ops, there was an error loading user. Please try again';
        });
    },

    data() {
        return {
            userId      : this.$route.params.userId,
            user        : null,
            isLoading   : false,
            errorMessage: null,
            revision    : 0,
        };
    },

    watch:{
        $route(to, from) {
            // forcing it to refresh projects list
            this.revision += 1;
        }
    },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },
    }
}
</script>