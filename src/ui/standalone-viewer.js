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
    store.dispatch('setAssetsPath', options.assetsPath || '/');

    new Vue({
        components: {StandaloneSchemeView},
        store,
        data() {
            return {
                scheme,
                zoom            : Math.max(0.00005, parseFloat(options.zoom) || 100),
                autoZoom        : objProperty(options, 'autoZoom', true),
                sidePanelWidth  : parseInt(options.sidePanelWidth) || 400,
                useMouseWheel   : objProperty(options, 'useMouseWheel', true),
                homeLink        : objProperty(options, 'homeLink', 'https://schem.io'),
                linkColor       : objProperty(options, 'linkColor', '#b0d8f5'),
                headerBackground: objProperty(options, 'headerBackground', '#555'),
                headerColor     : objProperty(options, 'headerColor', '#f0f0f0'),
                headerEnabled   : objProperty(options, 'headerEnabled', true),
                zoomButton      : objProperty(options, 'zoomButton', true),
                zoomInput       : objProperty(options, 'zoomInput', true),
                title           : objProperty(options, 'title', ''),
            };
        },
        template: '<standalone-scheme-view :scheme="scheme" :zoom="zoom" :auto-zoom="autoZoom"'
            +' :link-color="linkColor" :header-background="headerBackground" :headerColor="headerColor" :header-enabled="headerEnabled"'
            +' :zoom-button="zoomButton" :zoom-input="zoomInput"'
            +' :home-link="homeLink" :side-panel-width="sidePanelWidth" :use-mouse-wheel="useMouseWheel" :title="title"/>'
    }).$mount(elementOrSelector);
}

