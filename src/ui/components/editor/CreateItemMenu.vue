<template lang="html">
    <div class="create-item-menu">
        <div class="item-menu">
            <div class="item-container" @click="clickComponent">
                <i class="fab fa-elementor"></i>
                <span>Component</span>
            </div>

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

        <modal title="Error" v-if="errorMessage" @close='errorMessage = null'>
            {{errorMessage}}
        </modal>

    </div>
</template>

<script>
import EventBus from './EventBus.js';
import CreateImageModal from './CreateImageModal.vue';
import Modal from '../Modal.vue';
import shortid from 'shortid';

export default {
    components: {CreateImageModal, Modal},
    data() {
        return {
            showCreateImageModal: false,

            errorMessage: null
        }
    },
    methods: {
        clickComponent() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'component',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    background: { color: '#e7f5fa' },
                    text: { color: '#373737' }
                },
                properties: '',
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
            var img = new Image();
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    EventBus.$emit(EventBus.PLACE_ITEM, {
                        id: shortid.generate(),
                        type: 'image',
                        url: imageUrl,
                        area: { x: 0, y: 0, w: this.width, h: this.height },
                        name: 'image',
                        description: ''
                    });
                }
                this.showCreateImageModal = false;
            };
            img.onerror = () => {
                this.errorMessage = 'Could not load image. Check if the path is correct';
            };
            img.src = imageUrl;
        }
    }
}
</script>

<style lang="css">
</style>
