<template>
    <modal title="Additional shapes" @close="$emit('close')" :width="900" :repositionId="repositionId">
        <div v-if="isLoading" class="loader">
            <div class="loader-element"></div>
        </div>

        <div v-if="errorMessage" class="msg msg-error">{{errorMessage}}</div>

        <div class="external-shapes">
            <div class="external-shapes-list">
                <ul v-if="entries">
                    <li v-for="(entry, entryIdx) in entries"
                        :class="{selected: selectedEntryIdx === entryIdx}"
                        @click="selectEntry(entry, entryIdx)">
                        {{entry.name}}
                        <span v-if="entry.used" class="added">added</span>
                        <span v-else-if="selectedEntryIdx === entryIdx" class="btn btn-add btn-primary" @click="registerSelectedShapeGroup()">Add</span>
                    </li>
                </ul>
                <div v-else class="missing-extra-shapes">
                    No shapes available
                </div>
            </div>
            <div class="external-shape-preview" v-if="selectedEntry">
                <div class="title">{{selectedEntry.name}}</div>
                <div class="description" v-if="selectedEntry.description">{{ selectedEntry.description }}</div>
                <div class="preview" v-if="selectedEntry.preview">
                    <img class="large" :src="selectedEntry.preview" />
                </div>
                <div class="preview" v-if="selectedEntry.previewImages">
                    <div class="preview-icon" v-for="imageUrl in selectedEntry.previewImages">
                        <img :src="imageUrl" />
                    </div>
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
import StoreUtils from '../../store/StoreUtils';

const ASSETS_PREFIX = '/assets';

/**
 * Used for fixing assets path for static app version
 */
function fixAssetsPath($store, path) {
    if (path && path.startsWith(ASSETS_PREFIX)) {
        path = $store.state.assetsPath + path.substring(ASSETS_PREFIX.length);
    }
    return path;
}

export default {
    components: {Modal},

    beforeCreate() {
        this.isLoading = true;
        const assetsPath = this.$store.state.assetsPath || ASSETS_PREFIX;
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
                artEntry.ref = fixAssetsPath(this.$store, artEntry.ref);
                if (Array.isArray(artEntry.previewImages)) {
                    artEntry.previewImages = artEntry.previewImages.map(path => fixAssetsPath(this.$store, path));
                }
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
            this.repositionId++;
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
            errorMessage: null,
            repositionId: 0
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
                if (Array.isArray(artPack.icons)) {
                    artPack.icons.forEach(icon => {
                        icon.url = fixAssetsPath(this.$store, icon.url);
                    });
                }
                this.isLoading = false;
                StoreUtils.addArtPack(this.$store, artPackEntry.ref, artPack);
                this.$emit('art-pack-added', artPack);
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
                const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                registerExternalShapeGroup(this.$store, shapeGroup.id, data);
                this.$emit('extra-shapes-registered');
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