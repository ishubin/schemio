<template>
    <div style="height: 100%; display: flex; flex-direction: column">
        <Header>
            <div slot="middle-section" class="header-middle-section">
                <ul class="header-breadcrumbs">
                    <li v-for="(crumb,  crumbIdx) in breadcrumbs">
                        <a v-if="crumb.kind === 'dir'" :href="`/?path=${crumb.encodedPath}`">
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
        <SchemioEditorApp v-if="scheme"
            :scheme="scheme"
            :editAllowed="true"
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

        this.apiClient.getScheme(this.schemeId).then(scheme => {
            this.scheme = scheme;
        });
    },
    data() {
        const path = this.$route.query.path || '';
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
                encodedPath: encodeURIComponent(folderPath)
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
            schemeId: this.$route.query.id,
            breadcrumbs: breadcrumbs,
            scheme: null,
            apiClient: createApiClient(path)
        };
    }
}
</script>