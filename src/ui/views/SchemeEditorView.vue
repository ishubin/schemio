<template lang="html">
    <div class="scheme-editor-view">
        <div>
            <h1>scheme editor</h1>
        </div>
        <div>
            <svg-editor v-bind:scheme="scheme" width="800" height="500" offsetX="20" offsetY="20" zoom="1.0"></svg-editor>
        </div>
    </div>

</template>

<script>
import SvgEditor from '../components/SvgEditor.vue';
import apiClient from '../apiClient.js';

export default {
    components: {SvgEditor},

    mounted() {
        apiClient.loadScheme().then(scheme => {
            this.scheme = scheme;
        })
    },
    data() {
        return {
            scheme: {}
        }
    }
}
</script>

<style lang="css">
</style>
