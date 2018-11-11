<template lang="html">
    <div class="scheme-editor-view">
        <div>
            <h1>scheme editor</h1>
        </div>
        <div v-if="schemeContainer">
            <svg-editor v-bind:schemeContainer="schemeContainer" width="800" height="500" offsetX="20" offsetY="20" zoom="1.0"></svg-editor>
        </div>
    </div>

</template>

<script>
import SvgEditor from '../components/SvgEditor.vue';
import apiClient from '../apiClient.js';
import SchemeContainer from '../scheme/SchemeContainer.js';

export default {
    components: {SvgEditor},

    mounted() {
        apiClient.loadScheme().then(scheme => {
            this.schemeContainer = new SchemeContainer(scheme);
        })
    },
    data() {
        return {
            schemeContainer: null
        }
    }
}
</script>

<style lang="css">
</style>
