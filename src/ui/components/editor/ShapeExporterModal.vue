<template>
    <modal title="Shape Exporter" :primary-button="primaryButton" @primary-submit="exportShape" @close="$emit('close')">
        <div v-if="errorMessage" class="msg msg-error">
            {{errorMessage}}
        </div>
        <div v-else>
            <h4>Shape ID</h4>
            <input class="textfield" type="text" v-model="shapeId"/>
            <h4>Shape Name</h4>
            <input class="textfield" type="text" v-model="shapeName"/>
            <h4>Shape Group</h4>
            <input class="textfield" type="text" v-model="shapeGroup"/>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import find from 'lodash/find';
import {convertShapeToStandardCurves} from './items/shapes/ShapeExporter';
import utils from '../../utils';

function getTagValueByPrefixKey(tags, keyPrefix, defaultValue) {
    const tag = find(tags, tag => tag.indexOf(keyPrefix) === 0);
    if (tag) {
        return tag.substr(keyPrefix.length);
    }
    return defaultValue;
}

export default {
    props: ['item'],

    components: {Modal},

    data() {
        let errorMessage = null;
        let primaryButton = null;
        let convertedShape = null;
        try {
            convertedShape = convertShapeToStandardCurves(this.item);
            primaryButton = 'Export';
        } catch(e) {
            errorMessage = 'Failed to generate shape: ' + e.message;
        }

        return {
            shapeId: getTagValueByPrefixKey(this.item.tags, 'shape-id-', `custom-${this.item.name.toLowerCase()}`),
            shapeGroup: getTagValueByPrefixKey(this.item.tags, 'shape-group-', 'Ungrouped'),
            shapeName: this.item.name,
            errorMessage,
            primaryButton,
            convertedShape
        };
    },

    methods: {
        exportShape() {
            if (!this.convertedShape) {
                return;
            }
            const shapeDef = utils.clone(this.convertedShape);

            shapeDef.shapeConfig.menuItems = [{
                group: this.shapeGroup,
                name: this.shapeName,
                iconUrl: '/assets/images/items/uml-object.svg'
            }];

            shapeDef.shapeConfig.id = this.shapeId;
            utils.forceDownload(`${this.shapeId}.shape.json`, 'application/json', JSON.stringify(shapeDef));
        },

    }
}
</script>