<template lang="html">
    <modal title="Create Image" @close="$emit('close')" primary-button="Create" @primary-submit="submitCreateImage()">
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

        <div class="image-preview">
            <img :src="url"  v-if="url.length > 0"/>
        </div>
    </modal>

</template>

<script>
import Modal from '../Modal.vue';
import axios from 'axios';

export default {
    props: [],
    components: {Modal},

    data() {
        return {
            url: '',
            selectedFile: null
        }
    },
    methods: {
        submitCreateImage() {
            this.$emit('submit-image', this.url);
        },
        onFileSelect(event) {
            this.selectedFile = event.target.files[0];
        }
    },
    watch: {
        selectedFile(file) {
            if (file) {
                var form = new FormData();
                form.append('image', file, file.name);
                axios.post('/api/images', form).then(response => {
                    this.url = response.data.path;
                });
            }
        }
    }
}
</script>

<style lang="css">
</style>
