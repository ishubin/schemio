/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// const appElem = document.getElementById( 'app' );
// appElem.innerHTML = '<h1>Hi World!</h1>';


import Vue from 'vue';
import ElectronApp from './ElectronApp.vue';
import store from '../../ui/store/Store.js';
import { applyVueFilters } from '../../ui/vue.filters';
import '../static/electron.css';

applyVueFilters(Vue);


// const routes = [
//     route('OfflineSchemeEditorView', '/',   SchemeEditorView, {apiClientType: 'offline', userStylesEnabled: false, projectArtEnabled: false}),
//     { path: '*', redirect: '/not-found'}
// ];


new Vue(Vue.util.extend({
    store,
}, ElectronApp)).$mount('#app');
