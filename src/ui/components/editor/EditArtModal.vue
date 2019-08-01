<template>
    <modal title="Edit Art" :width="800" @close="close()">
        <div>
            <table>
                <tbody>
                    <tr>
                        <td width="300px">
                            <input v-if="selectedIndex < 0" class="textfield" type="text" :disabled="true"/>
                            <input v-else class="textfield" type="text" v-model="artList[selectedIndex].name" @change="changedArtIndex = selectedIndex"/>
                        </td>
                        <td>
                            <span v-if="selectedIndex >= 0" class="btn btn-dangerous" @click="deleteArtAtIndex(selectedIndex)">Delete</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="item-menu" style="max-height: 300px; overlow: scroll;">
            <div class="item-container"
                v-for="(art, artIndex) in artList"
                :class="{'selected': artIndex === selectedIndex}"
                :key="art.id"
                @click="selectedIndex = artIndex">
                <img width="60px" height="60px" :src="art.url"/>
                <span>{{art.name}}</span>
            </div>
        </div>
    </modal> 
</template>
<script>
import Modal from '../Modal.vue';
import apiClient from '../../apiClient.js';

export default {
    props: ['projectId', 'artList'],
    components: {Modal},
    

    data() {
        return {
            selectedIndex: -1,
            changedArtIndex: -1
        };
    },

    methods: {
        saveArt(art) {
            apiClient.saveArt(this.projectId, art.id, art);
            this.changedArtIndex = -1;
        },

        deleteArtAtIndex(index) {
            if (index >= 0 && index < this.artList.length) {
                apiClient.deleteArt(this.projectId, this.artList[index].id).then(() => {
                    this.selectedIndex = -1;
                    this.artList.splice(index, 1);
                });
            }
        },

        close() {
            if (this.changedArtIndex >= 0 && this.changedArtIndex < this.artList.length) {
                this.saveArt(this.artList[this.changedArtIndex]);
            }
            this.$emit('close');
        }
    },

    watch: {
        selectedIndex(index) {
            if (this.changedArtIndex >= 0 && this.changedArtIndex < this.artList.length) {
                this.saveArt(this.artList[this.changedArtIndex]);
            }
        }
    }
}
</script>

