/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This is an entry point for schemio bundle that is used for FS based Schemio app

import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './app/App.vue';
import FolderView from './app/view/FolderView.vue';
import SearchView from './app/view/SearchView.vue';
import store from './store/Store.js';
import SchemeEditorView from './app/view/SchemeEditorView.vue';
import NotFoundView from './app/view/NotFoundView.vue';
import { applyVueFilters } from './vue.filters';
import Header from './app/components/Header.vue';
import Footer from './app/components/Footer.vue';

Vue.use(VueRouter);
applyVueFilters(Vue);

Vue.component('schemio-header', Header);
Vue.component('schemio-footer', Footer);

function route(name, path, component, props) {
    return { name, path, component, props };
}


const routes = [
    route('SchemeEditorView',   '/docs/:schemeId',   SchemeEditorView, {apiClientType: 'fs'}),
    route('NotFoundView',       '/not-found',        NotFoundView),
    route('HomeView',           '/',                 FolderView, {apiClientType: 'fs'}),
    route('SearchView',         '/search',           SearchView, {apiClientType: 'fs'}),
    route('FolderView',         '/f/*',              FolderView, {apiClientType: 'fs'}),
    { path: '*', redirect: '/not-found'}
];


const router = new VueRouter({
    mode: 'history',
    routes: routes,
});


new Vue(Vue.util.extend({
    router,
    store,
}, App)).$mount('#app');
