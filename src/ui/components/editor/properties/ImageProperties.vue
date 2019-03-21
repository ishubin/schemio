<template lang="html">
    <panel name="Image">
        <h5>Image URL</h5>

        <table width="100%">
            <tbody>
                <tr>
                    <td>
                        <input class="textfield" type="text" v-model="item.url"/>
                    </td>
                    <td width="34px">
                        <div class="file-upload-button">
                            <i class="fas fa-file-upload icon"></i>
                            <input type="file" @change="uploadImage"/>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </panel>
</template>

<script>
import Panel from '../Panel.vue';

export default {
    props: ['item'],

    components: {Panel},

    methods: {
        uploadImage(event) {
            var file = event.target.files[0];
            if (file) {
                var form = new FormData();
                form.append('image', file, file.name);
                axios.post('/images', form).then(response => {
                    if (this.item) {
                        this.item.url = response.data.path;
                    }
                });
            }
        },
    }
}
</script>

<style lang="css">
</style>
