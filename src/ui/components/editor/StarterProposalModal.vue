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
    props: {},

    data() {
        return {
            proposals: [{
                id: 'empty',
                name: 'Empty canvas',
                docUrl: null,
                isLoading: false
            }, {
                id: 'mind-map',
                name: 'Mind map',
                iconUrl: '/assets/templates/previews/mind-map.svg',
                docUrl: '/assets/starters/mind-map.json',
                isLoading: false
            }, {
                id: 'mind-map-progress',
                name: 'Mind map (progress tracker)',
                iconUrl: '/assets/starters/mind-map-progress.svg',
                docUrl: '/assets/starters/mind-map-progress.json',
                isLoading: false
            }, {
                id: 'hierarchy-chart',
                name: 'Hierarchy Chart',
                iconUrl: '/assets/starters/hierarchy-chart.svg',
                docUrl: '/assets/starters/hierarchy-chart.json',
                isLoading: false
            }, {
                id: 'layered-diagram',
                name: 'Layered diagram',
                iconUrl: '/assets/starters/layered-diagram.svg',
                docUrl: '/assets/starters/layered-diagram.json',
                isLoading: false
            }, {
                id: 'app-prototype',
                name: 'App prototype',
                iconUrl: '/assets/starters/app-prototype.svg',
                docUrl: '/assets/starters/app-prototype.json',
                isLoading: false
            }]
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
                    if (!doc || !doc.items) {
                        this.emitItems([]);
                    }

                    this.emitItems(doc.items);
                })
                .catch(err => {
                    console.error(err);
                    proposal.isLoading = false;
                    StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load template')
                })
            }
        },

        emitItems(items) {
            this.$emit('selected', items);
        }
    }
}
</script>