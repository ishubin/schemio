<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <modal title="Upload SVG Icon" @close="$emit('close')" primary-button="Upload" @primary-submit="submitIcon()">

        <h5>Icon name</h5>
        <input class="textfield" type="text" v-model="iconName" placeholder="Name..."/>

        <p>
            Use small images or even better - SVG icons.
        </p>

        <h5>Image URL</h5>
        <table width="100%">
            <tbody>
                <tr>
                    <td>
                        <input type="text" class="textfield" v-model="url"/>
                    </td>
                    <td width="34px">
                        <div class="file-upload-button">
                            <i class="fas fa-file-upload icon"></i>
                            <input type="file" @change="onFileSelect"/>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <modal title="Error" v-if="errorMessage" @close='errorMessage = null'>
            {{errorMessage}}
        </modal>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import apiClient from '../../apiClient.js';
import axios from 'axios';

export default {
    components: {Modal},

    data() {
        return {
            url: '',
            iconName: '',
            selectedFile: null,
            errorUploading: false,
            errorMessage: null
        };
    },
    methods: {
        submitIcon() {
            apiClient.createArt({
                name: this.iconName,
                url: this.url
            }).then(art => {
                this.$emit('art-created', art);
            }).catch(err => {
                this.errorMessage = 'Error creating art';
            });
        },
        onFileSelect(event) {
            this.selectedFile = event.target.files[0];
        }
    },
    watch: {
        selectedFile(file) {
            if (file) {
                console.log('Selected file', file);
                if (!this.iconName) {
                    this.iconName = file.name;
                }

                var form = new FormData();
                form.append('image', file, file.name);
                this.errorUploading = false;
                axios.post('/images', form).then(response => {
                    this.url = response.data.path;
                }).catch(err => {
                    this.errorUploading = true;
                });
            }
        }
    }
}
</script>

<style lang="css">
</style>
