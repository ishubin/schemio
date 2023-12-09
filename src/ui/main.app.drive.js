/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This is an entry point for schemio bundle that is used for Google Drive based Schemio app

import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './app/App.vue';
import FolderView from './app/view/FolderView.vue';
import SearchView from './app/view/SearchView.vue';
import AboutView from './app/view/AboutView.vue';
import store from './store/Store.js';
import SchemeEditorWebView from './app/view/SchemeEditorWebView.vue';
import NotFoundView from './app/view/NotFoundView.vue';
import { applyVueFilters } from './vue.filters';
import Header from './app/components/HeaderDrive.vue';
import Footer from './app/components/FooterDrive.vue';
import HomeDriveView from './app/view/HomeDriveView.vue';
import { googleDriveClientProvider } from './app/client/googleDriveClient';
import { offlineClientProvider } from './app/client/offlineClient';
import { initGoogleAPI } from './googleApi';


initGoogleAPI();

Vue.use(VueRouter);
applyVueFilters(Vue);

Vue.component('schemio-header', Header);
Vue.component('schemio-footer', Footer);

function route(name, path, component, props) {
    return { name, path, component, props };
}

store.dispatch('setDocsPath', '#/docs');

const routes = [
    route('SchemeEditorWebView',       '/docs/:schemeId',   SchemeEditorWebView, {clientProvider: googleDriveClientProvider, userStylesEnabled: false, projectArtEnabled: false}),
    route('OfflineSchemeEditorWebView','/offline-editor',   SchemeEditorWebView, {clientProvider: offlineClientProvider, isOfflineEditor: true , userStylesEnabled: false, projectArtEnabled: false}),
    route('AboutView',              '/about',            AboutView),
    route('NotFoundView',           '/not-found',        NotFoundView),
    route('HomeView',               '/',                 HomeDriveView),
    route('SearchView',             '/search',           SearchView, {clientProvider: googleDriveClientProvider}),
    route('FolderView',             '/f/*',              FolderView, {clientProvider: googleDriveClientProvider}),
    { path: '*', redirect: '/not-found'}
];


const router = new VueRouter({
    routes: routes,
});


new Vue(Vue.util.extend({
    router,
    store,
}, App)).$mount('#app');
