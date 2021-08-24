/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import store from './store/Store.js';
import SchemioEditorApp from './SchemioEditorApp.vue';
import Modal from './components/Modal.vue';
import CreateNewSchemeModal from './components/CreateNewSchemeModal.vue';
import CategoryTree from './components/search/CategoryTree.vue';


const appComponent = Vue.component('SchemioEditorApp', Vue.util.extend({store}, SchemioEditorApp));



window.Schemio = {
    components: { Vue, Modal, CreateNewSchemeModal, CategoryTree},
    mountSchemioEditorApp(querySelector, projectId, scheme) {
        new Vue({
            el: querySelector,
            components: { appComponent },
            render: h => h('appComponent', {props: {
                projectId,
                scheme
            }})
        }); 

        // new Vue(Vue.util.extend({
        //     store,
        // }, SchemioEditorApp)).$mount(querySelector);
    }
}
