<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="header text-nonselectable">
        <router-link :to="{path: '/'}" class="header-caption">
            <img src="/images/schemio-logo-white.small.png" height="25"/> <span>Schemio</span>
        </router-link>

        <div class="hamburger-menu">
            <span title="Menu"><i class="fas fa-bars"></i></span>
            <ul>
                <li v-if="user">
                    <router-link :to="{path: '/create-project'}"><i class="far fa-folder"></i> Create Project</router-link>
                </li>
                <li v-if="user && projectId">
                    <span @click="openNewSchemePopup"><i class="far fa-file-alt"></i> New Scheme</span>
                </li>
            </ul>
        </div>

        <router-link v-if="project" :to="{path: `/projects/${project.id}`}"><i class="fas fa-home"></i> {{project.name}}</router-link>

        <div class="header-middle-section">
            <slot name="middle-section"></slot>
        </div>

        <div class="top-right-panel">
            <div v-if="user">
                <a href="/user/logout">Logout</a>
            </div>
            <div v-else>
                <a :href="'/login?redirect=' + originalUrlEncoded">Login</a>
            </div>
        </div>

        <create-new-scheme-modal v-if="newSchemePopup.show" :categories="newSchemePopup.categories"
            :project-id="projectId"
            @close="newSchemePopup.show = false"
            @scheme-created="openNewSchemePopupSchemeCreated"
            ></create-new-scheme-modal>
    </div>
</template>

<script>
import apiClient from '../apiClient.js';
import CreateNewSchemeModal from '../components/CreateNewSchemeModal.vue';

export default {
    props: {
        projectId:  {type: String, default: null},
        project:    {type: Object, default: null},
        category:   {type: Object, default: null}
    },

    components: {CreateNewSchemeModal},

    mounted() {
        this.loadCurrentUser();
    },
    data() {
        return {
            originalUrlEncoded: encodeURIComponent(window.location),
            user: null,
            newSchemePopup: {
                categories: [],
                show: false
            }
        };
    },
    methods: {
        loadCurrentUser() {
            apiClient.getCurrentUser().then(user => {
                this.user = user;
            });
        },

        openNewSchemePopup() {
            if (this.category && this.category.id) {
                var categories = _.map(this.category.ancestors, ancestor => {
                    return {name: ancestor.name, id: ancestor.id};
                });

                categories.push({
                    name: this.category.name,
                    id: this.category.id
                });
                this.newSchemePopup.categories = categories;
            } else {
                this.newSchemePopup.categories = [];
            }
            this.newSchemePopup.show = true;
        },

        openNewSchemePopupSchemeCreated(scheme) {
            this.newSchemePopup.show = false;
            window.location.href = `/projects/${this.projectId}/schemes/${scheme.id}#m:edit`;
        }
    }
}
</script>

<style lang="css">
</style>
