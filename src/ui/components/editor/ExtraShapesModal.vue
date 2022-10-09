<template>
    <modal title="Additional shapes" @close="$emit('close')" width="900">
        <div v-if="isLoading" class="loader">
            <div class="loader-element"></div>
        </div>

        <div v-if="errorMessage" class="msg msg-danger">{{errorMessage}}</div>

        <div v-if="entries" class="external-shapes">
            <div class="external-shapes-list">
                <ul>
                    <li v-for="(entry, entryIdx) in entries"
                        :class="{selected: selectedEntryIdx === entryIdx}"
                        @click="selectEntry(entry, entryIdx)">
                        {{entry.name}} 
                        <span v-if="entry.used" class="added">added</span>
                    </li>
                </ul>
            </div>
            <div class="external-shape-preview" v-if="selectedEntry">
                <div class="title">{{selectedEntry.name}}</div>
                <div class="preview" v-if="selectedEntry.preview">
                    <img class="large" :src="selectedEntry.preview" />
                </div>
                <div class="preview" v-if="selectedEntry.previewImages">
                    <div class="preview-icon" v-for="imageUrl in selectedEntry.previewImages">
                        <img :src="imageUrl" />
                    </div>
                </div>
                <div class="buttons">
                    <span v-if="!selectedEntry.used" class="btn btn-primary" @click="registerSelectedShapeGroup()">Add</span>
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
import StoreUtils from '../../store/StoreUtils';

export default {
    components: {Modal},

    beforeCreate() {
        this.isLoading = true;
        const assetsPath = this.$store.state.assetsPath || '/assets';
        const separator = assetsPath.endsWith('/') ? '' : '/';

        Promise.all([
            axios.get(`${assetsPath}${separator}shapes/shapes.json`).then(response => response.data),
            axios.get(`${assetsPath}${separator}art/art.json`).then(response => response.data),
        ])
        .then(([shapes, artEntries]) => {
            this.isLoading = false;
            if (!Array.isArray(shapes)) {
                shapes = [];
            }
            if (!Array.isArray(artEntries)) {
                artEntries = [];
            }
            const convertedShapes = shapes.map(shapeGroup => {
                return {
                    type: 'shape',
                    used: this.$store.state.itemMenu.shapeGroupIds.has(shapeGroup.id),
                    ...shapeGroup
                };
            });
            const convertedArt = artEntries.map(artEntry => {
                return {
                    type: 'art',
                    used: this.$store.state.itemMenu.artPackIds.has(artEntry.ref),
                    ...artEntry
                };
            });
            const entries = convertedShapes.concat(convertedArt);
            entries.sort((a,b) => {
                if ( a.name < b.name ){ return -1; }
                if ( a.name > b.name ){ return 1; }
                return 0;
            });
            this.entries = entries;
        })
        .catch(err => {
            this.isLoading = false;
            this.errorMessage = 'Failed to load all shapes';
            console.error(err);
        });
    },

    data() {
        return {
            isLoading: false,
            entries: null,
            selectedEntry: null,
            selectedEntryIdx: -1,
            errorMessage: null
        };
    },

    methods: {
        selectEntry(entry, entryIdx) {
            this.selectedEntryIdx = entryIdx;
            this.selectedEntry = entry;
        },

        registerSelectedShapeGroup() {
            if (this.selectedEntry.type === 'shape') {
                this.registerShapeGroup(this.selectedEntry);
            } else if (this.selectedEntry.type === 'art') {
                this.registerArtPack(this.selectedEntry);
            }
        },

        registerArtPack(artPackEntry) {
            this.isLoading = true;
            axios.get(artPackEntry.ref)
            .then(response => {
                const artPack = response.data;
                this.isLoading = false;
                StoreUtils.addArtPack(this.$store, artPackEntry.ref, artPack);
                EventBus.$emit(EventBus.ART_PACK_ADDED, artPack);
                artPackEntry.used = true;
            })
            .catch(err => {
                this.isLoading = false;
                console.error(err);
            });
        },

        registerShapeGroup(shapeGroup) {
            const url = shapeGroup.ref;
            this.isLoading = true;
            axios.get(url)
            .then(response => {
                this.isLoading = false;
                registerExternalShapeGroup(this.$store, shapeGroup.id, response.data);
                EventBus.$emit(EventBus.EXTRA_SHAPE_GROUP_REGISTERED);
                shapeGroup.used = true;
            })
            .catch(err => {
                this.isLoading = false;
                console.error(err);
            });
        }
    }
}
</script>