<template>
    <div class="starter-proposal-modal-wrapper" @click="onModalWrapperClick" data-type="wrapper">
        <div class="starter-proposal-modal">
            <div class="starter-proposal-header">
                <span class="title">Select a template...</span>
                <span class="link" @click="$emit('close')"><i class="fas fa-times"></i></span>
            </div>
            <div class="starter-proposal-body">
                <ul class="starter-proposals">
                    <li v-for="proposal in proposals" @click="selectStarter(proposal)">
                        <div class="starter-proposal-container">
                            <div class="title">{{ proposal.name }}</div>
                            <img class="icon" v-if="proposal.iconUrl" :src="proposal.iconUrl"/>
                            <div v-else class="empty-icon"></div>
                            <div v-if="proposal.isLoading" class="start-proposal-loading-overlay">
                                <i class="fas fa-spinner fa-spin fa-2x"></i>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>


<script>
import StoreUtils from '../../store/StoreUtils';

export default {
    props: {
        templates: { type: Array, default: () => []}
    },

    data() {
        return {
            proposals: this.templates.map(template => {
                let docUrl = template.docUrl;
                if (docUrl && docUrl.startsWith('/assets') && this.$store.state.routePrefix) {
                    docUrl = this.$store.state.routePrefix + docUrl;
                }
                let iconUrl = template.iconUrl;
                if (iconUrl && iconUrl.startsWith('/assets') && this.$store.state.routePrefix) {
                    iconUrl = this.$store.state.routePrefix + iconUrl;
                }
                return {...template, iconUrl, docUrl, isLoading: false}
            })
        };
    },

    methods: {
        onModalWrapperClick(event) {
            if (event.target.getAttribute('data-type') === 'wrapper') {
                this.$emit('close');
            }
        },

        selectStarter(proposal) {
            if (!proposal.docUrl) {
                this.emitItems([]);
            } else {
                proposal.isLoading = true;
                this.$store.state.apiClient.get(proposal.docUrl)
                .then((doc) => {
                    proposal.isLoading = false;
                    if (!doc || !doc.items) {
                        this.emitItems([]);
                    }

                    this.emitItems(doc.items);
                })
                .catch(err => {
                    console.error(err);
                    proposal.isLoading = false;
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load template')
                });
            }
        },

        emitItems(items) {
            this.$emit('selected', items);
        }
    }
}
</script>