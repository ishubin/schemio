<template lang="html">
    <div>
        <general-panel :item="item" :tagsUsed="false"/>

        <connections-panel :item="item"/>

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

        <panel name="Style">
            <div class="property-row">
                <span class="property-label">Opacity: </span>
                <input type="text" v-model="item.style.opacity"/>
            </div>
        </panel>
        <span class="btn btn-primary" @click="convertToComponent">Convert to Component</span>
    </div>
</template>

<script>
import Panel from '../Panel.vue';
import GeneralPanel from './GeneralPanel.vue';
import ConnectionsPanel from './ConnectionsPanel.vue';
import utils from '../../../utils.js';
import knownItems from '../../../scheme/knownItems.js';

export default {
    props: ['item'],

    components: {Panel, GeneralPanel, ConnectionsPanel},

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

        convertToComponent() {
            this.item.image = {
                url: this.item.url
            };
            this.item.properties = '';
            utils.extendObject(this.item, knownItems.component.properties);
            this.item.type = 'component';
            delete this.item['url'];
        }
    }
}
</script>

<style lang="css">
</style>
