/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import VueRouter from 'vue-router';
import VueAxios from 'vue-axios';
import store from './store/Store.js';
import axios from 'axios';
import App from './App.vue';
import LoginView from './views/LoginView.vue';
import SchemeEditorView from './views/SchemeEditorView.vue';
import ProjectListView from './views/ProjectListView.vue';
import HomeView from './views/HomeView.vue';
import ProjectView from './views/ProjectView.vue';
import ProjectCreateEditView from './views/ProjectCreateEditView.vue';
import NotFoundView from './views/NotFoundView.vue';
import ErrorView from './views/ErrorView.vue';
import UserProfileView from './views/UserProfileView.vue';
import UserEditView from './views/UserEditView.vue';


Vue.use(VueRouter);
Vue.use(VueAxios, axios);


function route(name, path, component, props) {
    return {
        name,
        path,
        component,
        props
    };
}


const routes = [
    route('Login',              '/login', LoginView),
    route('CreateProject',      '/create-project',           ProjectCreateEditView, {createMode: true}),
    route('EditProject',        '/projects/:projectId/edit', ProjectCreateEditView, {createMode: false}),
    route('SchemeEditorView',   '/projects/:projectId/docs/:schemeId', SchemeEditorView),
    route('SchemeEditorView',   '/offline-scheme-editor', SchemeEditorView),
    route('HomeView',           '/', HomeView),
    route('ProjectListView',    '/projects', ProjectListView),
    route('ProjectView',        '/projects/:projectId', ProjectView),
    route('UserProfileView',    '/users/:userId', UserProfileView),
    route('UserEditView',       '/user/edit', UserEditView),
    route('NotFoundView',       '/not-found', NotFoundView),
    route('ErrorView',          '/error', ErrorView),
    { path: '*', redirect: '/not-found' },
];


const router = new VueRouter({
    mode: 'history',
    routes: routes,
});

router.beforeEach((to, from, next) => {
    if (from.name === 'SchemeEditorView' && store.state.schemeModified) {
        if (window.confirm('Scheme was modified. If you leave you will loose all your changes. Do you still want to leave?')) {
            next();
        } else {
            next(false);
        }
    } else {
        next();
    }
});

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


Vue.filter('formatDateTime', timeText => {
    const date = new Date(timeText);
    if (isNaN(date.getMilliseconds())) {
        return '';
    }
    const now = new Date();
    const seconds = Math.ceil(Math.max(0, now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
        if (seconds === 1) {
            return `1 second ago`;
        } else {
            return `${seconds} seconds ago`;
        }
    }

    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
        if (minutes === 1) {
            return `1 minute ago`;
        } else {
            return `${minutes} minutes ago`;
        }
    }

    const hours = Math.ceil(minutes / 60);
    if (hours < 24) {
        if (hours === 1) {
            return `1 hour ago`;
        } else {
            return `${hours} hours ago`;
        }
    }

    const days = Math.ceil(hours / 24);
    if (days < 31) {
        if (days === 1) {
            return `1 day ago`;
        } else {
            return `${days} days ago`;
        }
    }

    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
});


new Vue(Vue.util.extend({
    router,
    store,
    beforeMount() {
        this.$store.dispatch('loadCurrentUser');
    }
}, App)).$mount('#app');
