<template>
    <div>
        <header-component>
            <div slot="middle-section">
                <router-link v-if="currentUser" :to="{path: '/create-project'}"><i class="far fa-folder"></i> Create Project</router-link>
            </div>
        </header-component>

    </div>
</template>

<script>
import HeaderComponent from '../components/Header.vue';

export default {
    components: { HeaderComponent },

    computed: {
        currentUser() {
            return this.$store.getters.currentUser;
        },
    },
}
</script>