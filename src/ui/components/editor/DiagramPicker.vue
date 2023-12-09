<template>
    <div class="diagram-picker-wrapper">
        <div class="diagram-picker" :class="{specified: diagramId, empty: !diagramId, disabled: disabled}">
            <i class="icon fa-solid fa-diagram-project" v-if="diagramId"  @click="searchModalShown = true"></i>
            <div v-if="diagramId" class="diagram-title" @click="toggleSearchModal" :title="diagramTitle">
                <i v-if="isLoading" class="fas fa-spinner fa-spin fa-1x"></i>
                <span>{{diagramTitle}}</span>
            </div>
            <div v-else class="diagram-title" @click="toggleSearchModal">
                <span class="diagram-placeholder">Search diagram...</span>
            </div>
            <a v-if="diagramLink" title="Open diagram in another tab" target="_blank" class="diagram-picker-external-link" :href="diagramLink" ><i class="fa-solid fa-square-up-right"></i></a>
            <SchemeSearchModal v-if="searchModalShown" @close="searchModalShown = false" @selected-scheme="onDiagramPicked"/>
        </div>
    </div>
</template>

<script>
import SchemeSearchModal from './SchemeSearchModal.vue';

export default {
    components: {SchemeSearchModal},

    props: {
        diagramId: {type: String},
        disabled:  {type: Boolean, default: false},
    },

    beforeMount() {
        if (this.diagramId && this.$store.state.apiClient && this.$store.state.apiClient.getSchemeInfo) {
            this.isLoading = true;

            this.$store.state.apiClient.getSchemeInfo(this.diagramId)
            .then(info => {
                this.isLoading = false;
                this.diagramTitle = info.name;
                this.diagramLink = info.link;
            })
            .catch(err => {
                console.error(err);
                this.isLoading = false;
                this.diagramTitle = this.diagramId;
            });
        }
    },

    data() {
        return {
            searchModalShown: false,
            diagramTitle: null,
            diagramLink: null,
            isLoading: false
        };
    },

    methods: {
        onDiagramPicked(diagram) {
            this.searchModalShown = false;
            this.$emit('diagram-selected', diagram);
        },

        toggleSearchModal() {
            const apiClient = this.$store.state.apiClient;
            if (apiClient && apiClient.diagramSearchProvider) {
                apiClient.diagramSearchProvider(this.diagramId).then(pickedDiagram => {
                    this.onDiagramPicked(pickedDiagram);
                });
                return;
            }
            if (this.disabled) {
                return;
            }
            this.searchModalShown = true;
        }
    }
}
</script>