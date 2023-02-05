/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import StandaloneSchemeView from './views/StandaloneSchemeView.vue';
import store from './store/Store';


function objProperty(obj, field, defaultValue) {
    if (obj && obj.hasOwnProperty(field)) {
        return obj[field];
    }
    return defaultValue;
}

window.schemioViewScheme = (elementOrSelector, scheme, opts) => {
    const options = opts || {};

    if (options.apiClient) {
        store.dispatch('setApiClient', options.apiClient);
    }

    new Vue({
        components: {StandaloneSchemeView},
        store,
        data() {
            return {
                scheme,
                zoom          : Math.max(0.00005, parseFloat(options.zoom) || 100),
                autoZoom      : objProperty(options, 'autoZoom', true),
                sidePanelWidth: parseInt(options.sidePanelWidth) || 400,
                useMouseWheel : objProperty(options, 'useMouseWheel', true),
                homeLink      : objProperty(options, 'homeLink', 'https://github.com/ishubin/schemio')
            };
        },
        template: '<standalone-scheme-view :scheme="scheme" :zoom="zoom" :auto-zoom="autoZoom" :home-link="homeLink" :side-panel-width="sidePanelWidth" :use-mouse-wheel="useMouseWheel"/>'
    }).$mount(elementOrSelector);
}

