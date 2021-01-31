<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template>
    <div>
        <header-component/>
        <div class="middle-content">
            <div v-if="isLoading" class="mock-container">
                <span class="mock-element mock-long-field mock-animated"></span>
                <span class="mock-element mock-long-field mock-animated"></span>
                <span class="mock-element mock-long-field mock-animated"></span>
            </div>

            <div v-if="user">
                <h1>{{user.name}}</h1>
            </div>

            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>

            <proejcts-list :user-id="userId" :route-prefix="`/users/${userId}`"/>
        </div>
    </div>
</template>


<script>
import HeaderComponent from '../components/Header.vue';
import ProejctsList from '../components/ProjectsList.vue';
import apiClient from '../apiClient';

export default {
    components: { HeaderComponent, ProejctsList },

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
        };
    }
}
</script>