<template lang="html">
    <div class="create-item-menu">
        <div class="item-menu">
            <div class="item-container" @click="clickOverlay">
                <i class="fas fa-layer-group"></i>
                <span>Overlay</span>
            </div>

            <div class="item-container" @click="clickImage">
                <i class="fas fa-image"></i>
                <span>Image</span>
            </div>

            <div class="item-container" @click="clickComment">
                <i class="fas fa-comment-alt"></i>
                <span>Comment</span>
            </div>
        </div>

        <create-image-modal v-if="showCreateImageModal" @close="showCreateImageModal = false" @submit-image="startCreatingImage(arguments[0])"></create-image-modal>
    </div>
</template>

<script>
import EventBus from './EventBus.js';
import CreateImageModal from './CreateImageModal.vue';
import shortid from 'shortid';

export default {
    components: {CreateImageModal},
    data() {
        return {
            showCreateImageModal: false
        }
    },
    methods: {
        clickComponent() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'component',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#b8e0ee' },
                    text: { color: '#0d3847' }
                },
                name: 'Unnamed',
                description: '',
                links: []
            });
        },

        clickOverlay() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'overlay',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#b8e0ee' },
                },
                name: 'Unnamed',
                description: '',
                links: []
            });
        },

        clickComment() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'comment',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#ccc' },
                    text: {color: '#666'},
                    stroke: {color: '#fff'}
                },
                name: '',
                description: 'Leave a comment ...',
                links: []
            });
        },

        clickImage() {
            this.showCreateImageModal = true;
        },

        startCreatingImage(imageUrl) {
            this.showCreateImageModal = false;
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'image',
                url: imageUrl,
                area: { x: 0, y: 0, w: 0, h: 0 },
                name: 'image',
                description: ''
            });
        }
    }
}
</script>

<style lang="css">
</style>
