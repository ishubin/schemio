<template>
    <modal title="Export all diagrams" @close="$emit('close')">
        You can export all your documents into a single archive. You can use it to host all your diagrams in a read-only mode.

        <div v-if="exportStatus">
            <div v-if="exportStatus.status === 'running'">
                <div class="progress-bar progress-bar-default"></div>
            </div>
            <p v-else style="text-align: center">
                <span  class="btn btn-primary" @click="submitExport">Export all diagrams</span>
            </p>

            <div v-if="exportStatus.status === 'finished'">
                Done, you can download all your exported documents using this <a class="link" :href="`/v1/static-export/download/${exportStatus.archiveVersion}`">link</a>
            </div>
        </div>
    </modal>
</template>

<script>
import Modal from '../../components/Modal.vue';

export default {
    components: {Modal},

    beforeMount() {
        this.updateExportStatus();
    },

    data() {
        return {
            errorMessage: null,
            exportStatus: null,
            intervalId: null,
        };
    },

    methods: {
        submitExport() {
            this.$store.state.apiClient.submitStaticExport()
            .then(result => {
                this.exportStatus.status = 'running';
                if (!this.intervalId) {
                    this.intervalId = setInterval(() => {
                        this.updateExportStatus();
                    }, 1000);
                }
            })
            .catch(err => {
                console.error(err);
                this.errorMessage = 'Something went wrong with exporting your diagrams';
            });
        },

        updateExportStatus() {
            this.$store.state.apiClient.getStaticExportStatus()
            .then(status => {
                if (this.intervalId && status.status !== 'running') {
                    clearInterval(this.intervalId);
                    this.intervalId = null;
                }
                this.exportStatus = status;
            })
            .catch(err => {
                console.error(err);
            });
        }
    }
}
</script>