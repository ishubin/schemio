<template>
    <div>
        <header-component>
            <div slot="middle-section">
                <router-link v-if="currentUser" :to="{path: '/create-project'}"><i class="far fa-folder"></i> Create Project</router-link>
            </div>
        </header-component>

        <h3>Projects</h3>
        <div class="middle-content">
            <projects-list :key="`projects-list-${revision}`" route-prefix="/projects"/>
        </div>
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';
import ProjectsList from '../components/ProjectsList.vue';
import utils from '../utils.js';

export default {
    components: { HeaderComponent, ProjectsList },

    data() {
        return {
            revision: 0
        };
    },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },
    },

    watch:{
        $route(to, from) {
            // forcing it to refresh projects list
            this.revision += 1;
        }
    }
}
</script>

