<template>
    <div style="height: 100%; display: flex; flex-direction: column">
        <Header>
            <div slot="middle-section" class="header-middle-section">
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
        </Header>
        <div v-if="is404" class="middle-content">
            <h4>Sorry, requested document was not found</h4>
        </div>
        <div v-else-if="errorMessage" class="middle-content">
            <div class="msg msg-error" v-if="errorMessage">{{errorMessage}}</div>
        </div>
        <SchemioEditorApp v-else-if="scheme"
            :scheme="scheme"
            :editAllowed="editAllowed"
            :categoriesEnabled="false"
            :userStylesEnabled="true"
        />
    </div>
</template>
<script>
import { createApiClient, createStaticClient } from '../apiClient';
import SchemioEditorApp from '../../SchemioEditorApp.vue';
import Header from '../components/Header.vue';
import forEach from 'lodash/forEach';


export default {
    components: {SchemioEditorApp, Header},

    props: {
        useStaticClient: {type: Boolean, default: false}
    },

    beforeMount() {
        this.$store.dispatch('setApiClient', this.apiClient);

        this.apiClient.getScheme(this.schemeId).then(schemeDetails => {
            this.buildBreadcrumbs(schemeDetails.folderPath);

            this.scheme = schemeDetails.scheme;
            this.editAllowed = !this.useStaticClient && !schemeDetails.viewOnly;
        })
        .catch(err => {
            if (err.response && err.response.status === 404) {
                this.is404 = true;
            } else {
                console.error(err);
                this.errorMessage = 'Oops, something went wrong';
            }
        });
    },
    data() {
        const schemeId = this.$route.params.schemeId;

        return {
            schemeId: schemeId,
            breadcrumbs: [],
            editAllowed: false,
            scheme: null,
            apiClient: this.useStaticClient ? createStaticClient('') : createApiClient(''),
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
        }
    }
}
</script>