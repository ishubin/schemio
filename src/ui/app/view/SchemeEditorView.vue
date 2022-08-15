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
            <div slot="loader">
                <div v-if="isLoading" class="loader">
                    <div class="loader-element"></div>
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
            :key="scheme ? 'offline-scheme' : 'offline-scheme-empty'"
            :scheme="scheme"
            :editAllowed="true"
            :isStaticEditor="false"
            :isOfflineEditor="true"
            :userStylesEnabled="false"
            :projectArtEnabled="false"
        />
        <SchemioEditorApp v-else-if="scheme"
            :key="`scheme-${originKeyReloadHash}`"
            :scheme="scheme"
            :editAllowed="shouldAllowEdit"
            :isStaticEditor="isStaticEditor"
            :userStylesEnabled="userStylesEnabled"
            @new-scheme-submitted="onNewSchemeSubmitted"
            @patch-applied="onPatchApplied"
            :projectArtEnabled="projectArtEnabled"
        />

        <CreatePatchModal v-if="createPatchModalShown" :originScheme="originSchemeForPatch" :scheme="modifiedScheme" @close="createPatchModalShown = false"/>
    </div>
</template>
<script>
import { createApiClientForType } from '../apiClient';
import SchemioEditorApp from '../../SchemioEditorApp.vue';
import forEach from 'lodash/forEach';
import StoreUtils from '../../store/StoreUtils';
import CreatePatchModal from '../../components/patch/CreatePatchModal.vue';
import utils from '../../utils';
import EventBus from '../../components/editor/EventBus';
import shortid from 'shortid';
import { createHasher } from '../../url/hasher';
import JSZip from 'jszip';


export default {
    components: {SchemioEditorApp, CreatePatchModal},

    props: {
        apiClientType    : {type: String, default: 'fs'},
        editAllowed      : {type: Boolean, default: true},
        userStylesEnabled: {type: Boolean, default: true},
        projectArtEnabled: {type: Boolean, default: true},
    },

    beforeMount() {
        EventBus.$on(EventBus.SCHEME_PATCH_REQUESTED, this.onSchemePatchRequested);

        this.isLoading = true;
        if (this.apiClientType === 'static') {
            this.isStaticEditor = true;
        }

        let chain = createApiClientForType(this.apiClientType)
        .then(apiClient => {
            this.$store.dispatch('setApiClient', apiClient);
            this.apiClient = apiClient;
            return apiClient;
        });

        if (this.apiClientType === 'offline') {
            chain = chain.then(apiClient => {
                this.loadSchemeFromLink();
                this.isLoading = false;
            });
        } else {
            chain = chain.then(apiClient => apiClient.getScheme(this.schemeId))
            .then(schemeDetails => {
                this.isLoading = false;
                this.path = schemeDetails.folderPath;
                this.buildBreadcrumbs(schemeDetails.folderPath);
                this.scheme = schemeDetails.scheme;
                this.originScheme = utils.clone(schemeDetails.scheme);
                if (schemeDetails.viewOnly) {
                    this.shouldAllowEdit = false;
                }
            });
        }

        chain.catch(err => {
            this.isLoading = false;
            if (err.response && err.response.status === 404) {
                this.is404 = true;
            } else {
                console.error(err);
                this.errorMessage = 'Oops, something went wrong';
            }
        });
    },
    beforeDestroy() {
        EventBus.$off(EventBus.SCHEME_PATCH_REQUESTED, this.onSchemePatchRequested);
    },
    data() {
        const schemeId = this.$route.params.schemeId;

        return {
            schemeId: schemeId,
            path: '',
            breadcrumbs: [],
            shouldAllowEdit: this.editAllowed,
            isStaticEditor: false,
            scheme: null,
            apiClient: null,
            is404: false,
            errorMessage: null,
            isLoading: false,
            
            originScheme: null,
            modifiedScheme: null,
            createPatchModalShown: false,

            originKeyReloadHash: shortid.generate()
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

    
        onNewSchemeSubmitted(scheme, callback, errorCallback) {
            this.apiClient.createNewScheme(this.path, scheme).then(createdScheme => {
                if (callback) {
                    if (this.$router && this.$router.mode === 'history') {
                        callback(createdScheme, `/docs/${createdScheme.id}#m=edit`);
                    } else {
                        callback(createdScheme, `#/docs/${createdScheme.id}?m=edit`);
                    }
                }
            })
            .catch(err => {
                console.error('Failed to create new diagram', err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to create new diagram');
                if (errorCallback) {
                    errorCallback();
                }
            });
        },

        onSchemePatchRequested(modifiedScheme) {
            this.modifiedScheme = modifiedScheme;
            this.createPatchModalShown = true;
        },

        onPatchApplied(patchedScheme) {
            this.scheme = patchedScheme;
            this.originKeyReloadHash = shortid.generate();
        },

        loadSchemeFromLink() {
            const mode = this.$router ? this.$router.mode : 'history';
            const chars = {'.': '+', '_': '/', '-': '='};

            const pageParams = createHasher(mode).decodeURLHash(window.location.hash);

            if (pageParams.doc) {
                const content = pageParams.doc.replace(/[\._\-]/g, m => chars[m]);
                JSZip.loadAsync(content, {base64: true})
                .then(zip => {
                    if (zip.files['doc.json']) {
                        return zip.files['doc.json'].async('text');
                    } else {
                        throw new Error('Missing doc.json file');
                    }
                })
                .then(text => {
                    this.scheme = JSON.parse(text)
                })
                .catch(err => {
                    console.log(err);
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load document from URL', 'link-loader');
                });
            }
        }
    },
    computed: {
        originSchemeForPatch() {
            if (this.apiClientType === 'static') {
                return this.originScheme;
            }
            return null;
        }
    }
}
</script>