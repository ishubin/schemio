/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import SchemeContainer from '../ui/scheme/SchemeContainer';
import StandaloneSchemeView from './views/StandaloneSchemeView.vue';
import EventBus from '../ui/components/editor/EventBus';

window.schemioViewScheme = (id, scheme) => {
    new Vue({
        components: {StandaloneSchemeView},
        data() {
            return {
                schemeContainer: new SchemeContainer(scheme, EventBus)
            };
        },
        template: `
        <div>
            <standalone-scheme-view :scheme-container="schemeContainer"/>
        </div>
        `
    }).$mount(`#${id}`);

}

