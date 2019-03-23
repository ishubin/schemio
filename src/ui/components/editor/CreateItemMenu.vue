<template lang="html">
    <div class="create-item-menu">
        <div class="item-menu" v-if="menu === 'main'">
            <div class="item-container" @click="clickComponent">
                <i class="fab fa-elementor"></i>
                <span>Component</span>
            </div>

            <div class="item-container" @click="clickEllipse">
                <i class="fas fa-circle"></i>
                <span>Ellipse</span>
            </div>

            <div class="item-container" @click="clickOverlay">
                <i class="fas fa-layer-group"></i>
                <span>Overlay</span>
            </div>

            <div class="item-container" @click="menu = 'art'">
                <i class="fas fa-splotch"></i>
                <span>Art</span>
            </div>

            <div class="item-container" @click="clickImage">
                <i class="fas fa-image"></i>
                <span>Image</span>
            </div>

            <div class="item-container" @click="clickComment">
                <i class="fas fa-comment-alt"></i>
                <span>Comment</span>
            </div>

            <div class="item-container" @click="clickText">
                <i class="fas fa-font"></i>
                <span>Text</span>
            </div>
        </div>

        <div class="item-menu" v-if="menu === 'art'">
            <div>
                <span class="link" @click="menu = 'main'"><i class="fas fa-angle-left"></i> Back</span>
            </div>
            <div>
                <span class="btn btn-primary" @click="customArtUploadModalShown = true">
                    <i class="fas fa-upload"></i> Upload Icon
                </span>
            </div>

            <div class="item-container"
                v-for="art in artList"
                @click="clickArt(art)">
                <img width="60px" height="60px" :src="art.url"/>
                <span>{{art.name}}</span>
            </div>
        </div>

        <create-image-modal v-if="createImageModalShown" @close="createImageModalShown = false" @submit-image="startCreatingImage(arguments[0])"></create-image-modal>

        <custom-art-upload-modal v-if="customArtUploadModalShown" @close="customArtUploadModalShown = false" @art-created="onArtCreated"/>

        <modal title="Error" v-if="errorMessage" @close='errorMessage = null'>
            {{errorMessage}}
        </modal>

    </div>
</template>

<script>
import EventBus from './EventBus.js';
import CreateImageModal from './CreateImageModal.vue';
import CustomArtUploadModal from './CustomArtUploadModal.vue';
import Modal from '../Modal.vue';
import shortid from 'shortid';
import apiClient from '../../apiClient.js';
import knownItems from '../../scheme/knownItems.js';

export default {
    components: {CreateImageModal, Modal, CustomArtUploadModal},
    mounted() {
        this.reloadArt();
    },
    data() {
        return {
            createImageModalShown: false,
            customArtUploadModalShown: false,
            menu: 'main',
            artList: [],
            errorMessage: null
        }
    },
    methods: {
        reloadArt() {
            apiClient.getAllArt().then(artList => {
                this.artList = artList;
            });
        },

        onArtCreated(art) {
            this.artList.push(art);
            this.customArtUploadModalShown = false;
        },

        clickComponent() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'component',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    shape: 'component'
                },
                properties: '',
                name: 'Unnamed',
                description: '',
                links: []
            });
        },

        clickEllipse() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'component',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    shape: 'ellipse'
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

        clickText() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'comment',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    shape: 'none',
                    background: { color: '#ccc' },
                    text: {color: '#333'},
                    stroke: {color: '#fff'}
                },
                name: '',
                description: 'Leave a comment ...',
                links: []
            });
        },

        clickComment() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'comment',
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {
                    shape: 'simple-comment',
                    background: { color: '#ccc' },
                    text: {color: '#333'},
                    stroke: {color: '#fff'}
                },
                name: '',
                description: 'Leave a comment ...',
                links: []
            });
        },

        clickArt(art) {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                type: 'image',
                url: art.url,
                artId: art.id,
                area: { x: 0, y: 0, w: 0, h: 0 },
                style: {},
                properties: '',
                name: '',
                description: '',
                links: []
            });
        },

        clickImage() {
            this.createImageModalShown = true;
        },

        startCreatingImage(imageUrl) {
            this.createImageModalShown = false;
            var img = new Image();
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    EventBus.$emit(EventBus.PLACE_ITEM, {
                        id: shortid.generate(),
                        type: 'image',
                        url: imageUrl,
                        area: { x: 0, y: 0, w: this.width, h: this.height },
                        name: '',
                        description: ''
                    });
                }
                this.createImageModalShown = false;
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
