/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import VueRouter from 'vue-router';
import VueAxios from 'vue-axios';
import axios from 'axios';
import App from './App.vue';
import LoginView from './views/LoginView.vue';
import SchemeEditorView from './views/SchemeEditorView.vue';
import HomeView from './views/HomeView.vue';
import ProjectView from './views/ProjectView.vue';
import ProjectCreateView from './views/ProjectCreateView.vue';


Vue.use(VueRouter);
Vue.use(VueAxios, axios);

function route(name, path, component) {
    return {
        name: name,
        path: path,
        component: component
    };
}




const routes = [
    route('Login', '/login', LoginView),
    route('CreateProject', '/create-project', ProjectCreateView),
    route('SchemeEditorView', '/projects/:projectId/schemes/:schemeId', SchemeEditorView),
    route('HomeView', '/', HomeView),
    route('ProjectView', '/projects/:projectId', ProjectView)
];


const router = new VueRouter({ mode: 'history', routes: routes });

new Vue(Vue.util.extend({ router }, App)).$mount('#app');
