<template>
    <div style="height: 100%;">
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


export default {
    components: {SchemioEditorApp},

    beforeMount() {
        this.$store.dispatch('setApiClient', this.apiClient);

        this.apiClient.getScheme(this.schemeId).then(scheme => {
            this.scheme = scheme;
        });
    },
    data() {
        const path = this.$route.query.path || '';
        return {
            path: path,
            schemeId: this.$route.query.id,
            scheme: null,
            apiClient: createApiClient(path)
        };
    }
}
</script>