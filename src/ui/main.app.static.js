/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This is an entry point for schemio bundle that is used for FS based Schemio app

import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './app/App.vue';
import FolderView from './app/view/FolderView.vue';
import AboutView from './app/view/AboutView.vue';
import store from './store/Store.js';
import SchemeEditorWebView from './app/view/SchemeEditorWebView.vue';
import NotFoundView from './app/view/NotFoundView.vue';
import { applyVueFilters } from './vue.filters';
import Header from './app/components/Header.vue';
import Footer from './app/components/Footer.vue';
import { staticClientProvider } from './app/client/staticClient';
import { offlineClientProvider } from './app/client/offlineClient';

window.createSchemioStaticApp = function (options) {
    let editAllowed = false;
    if (options) {
        if (options.hasOwnProperty('editAllowed')) {
            editAllowed = options.editAllowed;
        }
    }

    store.dispatch('setRootPath', './');
    store.dispatch('setAssetsPath', './assets');
    store.dispatch('setDocsPath', '#/docs');

    Vue.use(VueRouter);
    applyVueFilters(Vue);

    Vue.component('schemio-header', Header);
    Vue.component('schemio-footer', Footer);

    function route(name, path, component, props) {
        return { name, path, component, props };
    }


    const routes = [
        route('SchemeEditorWebView',       '/docs/:schemeId',   SchemeEditorWebView, {clientProvider: staticClientProvider, editAllowed}),
        route('OfflineSchemeEditorWebView','/offline-editor',   SchemeEditorWebView, {clientProvider: offlineClientProvider, isOfflineEditor: true, userStylesEnabled: false, projectArtEnabled: false}),
        route('AboutView',              '/about',            AboutView),
        route('NotFoundView',           '/not-found',        NotFoundView),
        route('HomeView',               '/',                 FolderView, {clientProvider: staticClientProvider}),
        route('FolderView',             '/f/*',              FolderView, {clientProvider: staticClientProvider, toolbarShown: false}),
        { path: '*', redirect: '/not-found'}
    ];


    const router = new VueRouter({
        routes: routes,
    });


    new Vue(Vue.util.extend({
        router,
        store,
    }, App)).$mount('#app');
}
