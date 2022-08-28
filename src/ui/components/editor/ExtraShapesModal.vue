<template>
    <modal title="Additional shapes" @close="$emit('close')" width="900">
        <div v-if="isLoading" class="loader">
            <div class="loader-element"></div>
        </div>

        <div v-if="errorMessage" class="msg msg-danger">{{errorMessage}}</div>

        <div v-if="shapes" class="external-shapes">
            <div class="external-shapes-list">
                <ul>
                    <li v-for="(shape, shapeIdx) in shapes"
                        :class="{selected: selectedShapeIdx === shapeIdx}"
                        @click="selectShape(shape, shapeIdx)">
                         {{shape.group}} 
                    </li>
                </ul>
            </div>
            <div class="external-shape-preview" v-if="selectedShapeGroup">
                <div class="title">{{selectedShapeGroup.group}}</div>
                <div class="preview">
                    <img :src="selectedShapeGroup.preview" />
                </div>
                <div class="buttons">
                    <span class="btn btn-primary" @click="registerSelectedShapeGroup()">Use it</span>
                </div>
            </div>
            <div v-else class="external-shape-preview">
            </div>
        </div>
    </modal>
</template>

<script>
import axios from 'axios';
import Modal from '../Modal.vue';
import {registerExternalShapeGroup} from './items/shapes/ExtraShapes';
import EventBus from './EventBus';

export default {
    components: {Modal},

    beforeCreate() {
        if (this.$store.state.apiClient && this.$store.state.apiClient.getExternalShapes) {
            this.isLoading = true;
            this.$store.state.apiClient.getExternalShapes()
            .then(shapes => {
                this.isLoading = false;
                this.shapes = shapes;
            })
            .catch(err => {
                this.isLoading = false;
                this.errorMessage = 'Failed to load external shapes';
                console.error(err);
            });
        }
    },

    data() {
        return {
            isLoading: false,
            shapes: [],
            selectedShapeGroup: null,
            selectedShapeIdx: -1,
            errorMessage: null
        };
    },

    methods: {
        selectShape(shapeGroup, shapeIdx) {
            this.selectedShapeIdx = shapeIdx;
            this.selectedShapeGroup = shapeGroup;
        },

        registerSelectedShapeGroup() {
            const shapeGroup = this.selectedShapeGroup;
            const url = shapeGroup.ref;
            this.isLoading = true;
            axios.get(url)
            .then(response => {
                this.isLoading = false;
                registerExternalShapeGroup(this.$store, shapeGroup.id, response.data);
                EventBus.$emit(EventBus.EXTRA_SHAPE_GROUP_REGISTERED);
            })
            .catch(err => {
                this.isLoading = false;
                console.error(err);
            });
        }
    }
}
</script>