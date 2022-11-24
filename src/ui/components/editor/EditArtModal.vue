<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Edit Art" :width="800" @close="$emit('close')" class="project-art-editor">
        <div class="item-menu" style="max-height: 600px; overlow: scroll;">
            <div class="item-container"
                v-for="(art, artIndex) in artList"
                :key="art.id" >

                <img :src="art.url"/>
                <span>{{art.name}}</span>

                <i class="remove-icon fas fa-times" @click="deleteArtAtIndex(artIndex)"></i>
            </div>
        </div>
    </modal>
</template>
<script>
import Modal from '../Modal.vue';

export default {
    props: ['artList'],
    components: {Modal},

    methods: {
        saveArt(art) {
            this.$store.state.apiClient.saveArt(art.id, art);
        },

        deleteArtAtIndex(index) {
            if (index >= 0 && index < this.artList.length) {
                this.$store.state.apiClient.deleteArt(this.artList[index].id).then(() => {
                    this.selectedIndex = -1;
                    this.artList.splice(index, 1);
                });
            }
        },
    },
}
</script>

