<template>
    <Modal title="Additional shapes"
        :width="900"
        :repositionId="repositionId"
        :fixedHeight="true"
        :primaryButton="primaryButton"
        :primaryButtonDisabled="primaryButtonDisabled"
        @close="$emit('close')"
        @primary-submit="registerSelectedShapeGroup()"
        >
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
                        <div class="preview" v-else-if="entry.previewImages">
                            <div class="preview-icon" v-for="imageUrl in entry.previewImages.slice(0, 4)">
                                <img :src="imageUrl" />
                            </div>
                        </div>
                    </li>
                </ul>
                <div v-else class="missing-extra-shapes">
                    No shapes available
                </div>
            </div>
            <div class="external-shape-preview" v-if="selectedEntry">
                <div class="row">
                    <div class="col-11">
                        <div class="title">{{selectedEntry.name}}</div>
                    </div>
                    <div class="col-1">
                        <span v-if="!selectedEntry.used" class="btn btn-add btn-primary" @click="registerSelectedShapeGroup()">Add</span>
                    </div>
                </div>
                <div class="row author" v-if="selectedEntry.link">
                    <div>
                        Author: <a :href="selectedEntry.link">
                            <span v-if="selectedEntry.author">{{selectedEntry.author}}</span>
                            <span v-else>{{selectedEntry.link}}</span>
                        </a>
                    </div>
                </div>
                <div class="row" v-if="selectedArtPack && selectedArtPack.icons && selectedArtPack.icons.length > 0">
                    <input v-model="searchKeyword" type="text" class="textfield" placeholder="Search..."/>
                </div>
                <div class="external-shape-content">
                    <div class="description" v-if="selectedEntry.description">{{ selectedEntry.description }}</div>
                    <div class="preview" v-if="selectedArtPack && selectedArtPack.icons && selectedArtPack.icons.length > 0">
                        <div class="preview-icon" v-for="icon in filtereSelectedArtPackIcons">
                            <img :src="icon.url" :title="icon.name" />
                        </div>
                    </div>
                    <div class="preview" v-else-if="selectedEntry.preview">
                        <img class="large" :src="selectedEntry.preview" />
                    </div>
                </div>
            </div>
            <div v-else class="external-shape-preview">
            </div>
        </div>
    </Modal>
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

    if ($store.state.routePrefix) {
        path = $store.state.routePrefix + path;
    }
    return path;
}

export default {
    components: {Modal},

    beforeCreate() {
        this.isLoading = true;
        const routePrefix = this.$store.state.routePrefix;
        const assetsPath = this.$store.state.assetsPath || ASSETS_PREFIX;
        const separator = assetsPath.endsWith('/') ? '' : '/';

        // to avoid caching on the browser
        const timeMarker = Math.floor(new Date().getTime()/60000);

        Promise.all([
            axios.get(`${routePrefix}${assetsPath}${separator}shapes/shapes.json?_v=${timeMarker}`).then(response => response.data),
            axios.get(`${routePrefix}${assetsPath}${separator}art/art.json?_v=${timeMarker}`).then(response => response.data),
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
            selectedArtPack: null,
            selectedEntryIdx: -1,
            errorMessage: null,
            repositionId: 0,
            searchKeyword: '',
        };
    },

    methods: {
        selectEntry(entry, entryIdx) {
            if (this.selectedEntryIdx !== entryIdx) {
                this.selectedArtPack = null;
                this.searchKeyword = '';
            }
            this.selectedEntryIdx = entryIdx;
            this.selectedEntry = entry;
            this.loadArtPack(entry).then(artPack => {
                this.selectedArtPack = artPack;
            });
        },

        registerSelectedShapeGroup() {
            if (this.selectedEntry.type === 'shape') {
                this.registerShapeGroup(this.selectedEntry);
            } else if (this.selectedEntry.type === 'art') {
                this.registerArtPack(this.selectedEntry);
            }
        },

        loadArtPack(artPackEntry) {
            this.isLoading = true;
            let url = artPackEntry.ref;
            if (url.startsWith('/assets') && this.$store.state.routePrefix) {
                url = this.$store.state.routePrefix + url;
            }
            return axios.get(url).then(response => {
                this.isLoading = false;
                const artPack = response.data;
                if (Array.isArray(artPack.icons)) {
                    artPack.icons.forEach(icon => {
                        icon.url = fixAssetsPath(this.$store, icon.url);
                    });
                }
                return artPack;
            })
            .catch(err => {
                this.isLoading = false;
                StoreUtils.addErrorSystemMessage(this.$store, 'Could not load art pack');
                console.error(err);
            });
        },

        registerArtPack(artPackEntry) {
            this.loadArtPack(artPackEntry)
            .then(artPack => {
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
            let url = shapeGroup.ref;
            if (url.startsWith('/assets') && this.$store.state.routePrefix) {
                url = this.$store.state.routePrefix + url;
            }
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
    },

    computed: {
        primaryButton() {
            if (!this.selectedEntry) {
                return null;
            }
            return `Add "${this.selectedEntry.name}"`;
        },

        primaryButtonDisabled() {
            if (!this.selectedEntry) {
                return false;
            }
            return this.selectedEntry.used;
        },

        filtereSelectedArtPackIcons() {
            if (!this.selectedArtPack || !Array.isArray(this.selectedArtPack.icons)) {
                return [];
            }
            return this.selectedArtPack.icons.filter(icon => {
                const name = icon.name || '';
                const query = this.searchKeyword.trim();
                return name.indexOf(query) >= 0;
            });
        }
    }
}
</script>