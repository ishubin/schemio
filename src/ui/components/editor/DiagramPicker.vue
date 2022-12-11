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
            <span class="diagram-picker-button" @click="toggleSearchModal"><i class="fas fa-search"></i></span>
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
            isLoading: false
        };
    },

    methods: {
        onDiagramPicked(diagram) {
            this.searchModalShown = false;
            this.$emit('diagram-selected', diagram);
        },

        toggleSearchModal() {
            if (this.disabled) {
                return;
            }
            this.searchModalShown = true;
        }
    }
}
</script>