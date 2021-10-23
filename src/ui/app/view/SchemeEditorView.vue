<template>
    <div style="height: 100%; display: flex; flex-direction: column">
        <Header>
            <div slot="middle-section" class="header-middle-section">
                <ul class="header-breadcrumbs">
                    <li v-for="(crumb,  crumbIdx) in breadcrumbs">
                        <a v-if="crumb.kind === 'dir'" :href="`/f/${crumb.path}`">
                            <i class="fas fa-folder"/>
                            {{crumb.name}}
                        </a>
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
import { createApiClient } from '../apiClient';
import SchemioEditorApp from '../../SchemioEditorApp.vue';
import Header from '../components/Header.vue';
import forEach from 'lodash/forEach';


export default {
    components: {SchemioEditorApp, Header},

    beforeMount() {
        this.$store.dispatch('setApiClient', this.apiClient);

        this.apiClient.getScheme(this.schemeId).then(schemeDetails => {
            this.scheme = schemeDetails.scheme;
            this.editAllowed = !schemeDetails.viewOnly;
        })
        .catch(err => {
            if (err.response && err.response.status === 404) {
                this.is404 = true;
            } else {
                this.errorMessage = 'Oops, something went wrong';
            }
        });
    },
    data() {
        const pathPrefix = '/schemes/';
        let path = decodeURI(this.$route.path.substring(pathPrefix.length));
        let schemeId = null;
        const idx = path.lastIndexOf('/');
        if (idx > 0) {
            schemeId = path.substring(idx + 1);
            path = path.substring(0, idx);
        } else {
            schemeId = path;
            path = '';
        }

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


        return {
            path: path,
            schemeId: schemeId,
            breadcrumbs: breadcrumbs,
            editAllowed: false,
            scheme: null,
            apiClient: createApiClient(path),
            is404: false,
            errorMessage: null
        };
    }
}
</script>