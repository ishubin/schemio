<template>
    <div>
        <header-component>
            <div slot="middle-section">
                <router-link v-if="currentUser" :to="{path: '/create-project'}"><i class="far fa-folder"></i> Create Project</router-link>
            </div>
        </header-component>

        <div class="middle-content">
            <h1>Welcome to Schemio!</h1>

            Schemio is an in-browser diagrams drawing app that lets you not only design your diagrams but also connect them, animate and make them interactive.

            <div class="section">
                <a v-if="!currentUser" href="/login" class="btn btn-primary">Login</a>
                <a v-else href="/create-project" class="btn btn-primary">Create a New Project</a>
                
                or
                <a href="/offline-scheme-editor#m:edit" class="btn btn-secondary">Edit Schemes Offline</a>
            </div>

            <div v-if="currentUser" class="section">
                <h3>My Projects</h3>

                <projects-list route-prefix="/" :key="`projects-list-${revision}`"/>
            </div>
        </div>
        
    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';
import ProjectsList from '../components/ProjectsList.vue';

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