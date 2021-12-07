<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div style="height: 100%; display: flex; flex-direction: column">
        <schemio-header>
            <div slot="middle-section">
                <ul class="header-breadcrumbs">
                    <li v-for="(crumb,  crumbIdx) in breadcrumbs">
                        <router-link v-if="crumb.kind === 'dir'" :to="`/f/${crumb.path}`">
                            <i class="fas fa-folder"/>
                            {{crumb.name}}
                        </router-link>
                        <span v-if="crumb.kind === 'ellipsis'">...</span>
                        <i v-if="crumbIdx < breadcrumbs.length - 1" class="fas fa-caret-right breadcrumb-separator"></i>
                    </li>
                </ul>
                <div class="scheme-title" v-if="scheme">
                    <img class="icon" src="/assets/images/schemio-logo-white.small.png" height="20"/> 
                    <span>{{scheme.name}}</span>
                </div>
            </div>
        </schemio-header>

        <div v-if="is404" class="middle-content">
            <h4>Sorry, requested document was not found</h4>
        </div>
        <div v-else-if="errorMessage" class="middle-content">
            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
        </div>
        <SchemioEditorApp v-else-if="apiClientType === 'offline'"
            :scheme="null"
            :editAllowed="true"
            :userStylesEnabled="false"
        />
        <SchemioEditorApp v-else-if="scheme"
            :scheme="scheme"
            :editAllowed="editAllowed"
            :userStylesEnabled="true"
            @new-scheme-submitted="onNewSchemeSubmitted"
        />
    </div>
</template>
<script>
import { createApiClientForType } from '../apiClient';
import SchemioEditorApp from '../../SchemioEditorApp.vue';
import forEach from 'lodash/forEach';
import StoreUtils from '../../store/StoreUtils';


export default {
    components: {SchemioEditorApp},

    props: {
        apiClientType  : {type: String, default: 'fs'},
    },

    beforeMount() {
        if (this.apiClientType !== 'offline') {
            createApiClientForType(this.apiClientType)
            .then(apiClient => {
                this.$store.dispatch('setApiClient', apiClient);
                this.apiClient = apiClient;
                return apiClient.getScheme(this.schemeId);
            })
            .then(schemeDetails => {
                this.path = schemeDetails.folderPath;
                this.buildBreadcrumbs(schemeDetails.folderPath);
                this.scheme = schemeDetails.scheme;
                this.editAllowed = !schemeDetails.viewOnly && this.apiClientType !== 'static';
            })
            .catch(err => {
                if (err.response && err.response.status === 404) {
                    this.is404 = true;
                } else {
                    console.error(err);
                    this.errorMessage = 'Oops, something went wrong';
                }
            });
        }
    },
    data() {
        const schemeId = this.$route.params.schemeId;

        return {
            schemeId: schemeId,
            path: '',
            breadcrumbs: [],
            editAllowed: false,
            scheme: null,
            apiClient: null,
            is404: false,
            errorMessage: null
        };
    },

    methods: {
        buildBreadcrumbs(path) {
            const folders = path.split('/');
            
            const breadcrumbs = [];

            let folderPath = '';
            forEach(folders, folder => {
                if (folder === '') {
                    return;
                }

                if (folderPath === '') {
                    folderPath = folder;
                } else {
                    folderPath = `${folderPath}/${folder}`;
                }
                breadcrumbs.push({
                    kind: 'dir',
                    name: folder,
                    path: folderPath
                });
            });

            if (breadcrumbs.length > 2) {
                breadcrumbs.splice(1, breadcrumbs.length - 2);
                breadcrumbs.splice(1, 0, {
                    kind: 'ellipsis'
                });
            }
            this.breadcrumbs = breadcrumbs;
        },

    
        onNewSchemeSubmitted(scheme, callback) {
            this.apiClient.createNewScheme(this.path, scheme).then(createdScheme => {
                if (callback) {
                    callback(createdScheme, `/docs/${createdScheme.id}`);
                }
            })
            .catch(err => {
                console.error('Failed to create new diagram', err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to create new diagram');
            });
        }
    }
}
</script>