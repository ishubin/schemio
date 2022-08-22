<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Shape Exporter" :primary-button="primaryButton" @primary-submit="exportShape" @close="$emit('close')">
        <div class="shape-exporter-modal-body">
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

                <div v-if="svgPreview">
                    <h4>Shape Icon Preview</h4>
                    <div class="shape-exporter-preview-container">
                        <div class="shape-exporter-preview-icon">
                            <h5>1x</h5>
                            <img width="42px" height="32px" :src="`data:image/svg+xml;base64,${svgPreviewBase64}`"/>
                        </div>
                        <div class="shape-exporter-preview-icon">
                            <h5>2x</h5>
                            <img width="84px" height="64px" :src="`data:image/svg+xml;base64,${svgPreviewBase64}`"/>
                        </div>
                        <div class="shape-exporter-preview-icon">
                            <h5>3x</h5>
                            <img width="126px" height="96px" :src="`data:image/svg+xml;base64,${svgPreviewBase64}`"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </modal>
</template>

<script>
import Modal from '../Modal.vue';
import forEach from 'lodash/forEach';
import { convertShapeToStandardCurves, getTagValueByPrefixKey } from './items/shapes/ShapeExporter';
import utils from '../../utils';
import { convertRawShapeForRender } from './items/shapes/StandardCurves';

function createWidthAndHeight(w, h, widthToHeightRatio) {
    if (widthToHeightRatio > 0) {
        h = w / widthToHeightRatio;
    } else if (widthToHeightRatio < 0) {
        w = h * widthToHeightRatio;
    }
    return {w, h};
}

function buildSvgPreview(shapeDef, widthToHeightRatio) {
    const { w, h } = createWidthAndHeight(42, 32, widthToHeightRatio);

    const padding = 3;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 ${w} ${h}" xml:space="preserve" width="${w}px" height="${h}px">`;
    svg += `<g transform="translate(${padding}, ${padding})">`;

    const fakeItem = {
        area: {x: 0, y: 0, w: w-2*padding, h: h-2*padding},
        shapeProps: {}
    };

    forEach(shapeDef.shapeConfig.items, itemDef => {
        if (itemDef.type === 'path') {
            const path = convertRawShapeForRender(fakeItem, shapeDef.shapeConfig, itemDef);
            if (path) {
                svg += `<path d="${path.path}" fill="white" stroke="#111111" stroke-width="2px" stroke-linejoin="round"/>`;
            }
        }
    });

    svg += '</g></svg>';
    return svg;
}

export default {
    props: ['item'],

    components: {Modal},

    data() {
        let errorMessage = null;
        let primaryButton = null;
        let convertedShape = null;
        let svgPreview = null;
        let svgPreviewBase64 = '';
        let widthToHeightRatio = 1;
        if (this.item.area.w > 0 && this.item.area.h > 0) {
            widthToHeightRatio = this.item.area.w / this.item.area.h;
        }
        try {
            convertedShape = convertShapeToStandardCurves(this.item);
            svgPreview = buildSvgPreview(convertedShape, widthToHeightRatio);
            svgPreviewBase64 = btoa(svgPreview);
            primaryButton = 'Export';
        } catch(e) {
            console.error(e);
            errorMessage = 'Failed to generate shape: ' + e.message;
        }

        return {
            shapeId: getTagValueByPrefixKey(this.item.tags, 'shape-id=', `custom-${this.item.name.toLowerCase()}`),
            shapeGroup: getTagValueByPrefixKey(this.item.tags, 'shape-group=', 'Ungrouped'),
            shapeName: this.item.name,
            errorMessage,
            primaryButton,
            convertedShape,
            svgPreview,
            svgPreviewBase64,
            widthToHeightRatio
        };
    },

    methods: {
        exportShape() {
            if (!this.convertedShape) {
                return;
            }
            const shapeDef = utils.clone(this.convertedShape);


            const creationSize = createWidthAndHeight(80, 80, this.widthToHeightRatio);
            const previewSize = createWidthAndHeight(150, 150, this.widthToHeightRatio);

            shapeDef.shapeConfig.menuItems = [{
                group: this.shapeGroup,
                name: this.shapeName,
                iconUrl: `data:image/svg+xml;base64,${this.svgPreviewBase64}`,
                size: creationSize,
                previewArea: {x: 0, y: 0, w: previewSize.w, h: previewSize.h, r: 0},
            }];

            shapeDef.shapeConfig.id = this.shapeId;
            utils.forceDownload(`${this.shapeId}.shape.json`, 'application/json', JSON.stringify(shapeDef));
        },

    }
}
</script>