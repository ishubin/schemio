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
import { electronAPICLient } from './electronAPIClient';

applyVueFilters(Vue);

store.dispatch('setApiClient', electronAPICLient());
store.dispatch('setAssetsPath', '../assets');

new Vue(Vue.util.extend({
    store,
}, ElectronApp)).$mount('#app');
