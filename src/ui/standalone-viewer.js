/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import StandaloneSchemeView from './views/StandaloneSchemeView.vue';

window.schemioViewScheme = (id, scheme, opts) => {
    const options = opts || {};

    new Vue({
        components: {StandaloneSchemeView},
        data() {
            return {
                scheme,
                width: parseInt(options.width) || 800,
                height: parseInt(options.height) || 400,
            };
        },
        template: '<standalone-scheme-view :scheme="scheme" :width="width" :height="height"/>'
    }).$mount(`#${id}`);
}

