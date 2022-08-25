<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Shape Exporter" :primary-button="primaryButton" @primary-submit="exportShapeGroup" @close="$emit('close')">
        <div class="shape-exporter-modal-body">
            <div class="shape-exporter-settings">
                <div v-if="errorMessage" class="msg msg-error">
                    {{errorMessage}}
                </div>
                <div v-if="shapeGroup">
                    <h4>{{shapeGroup.group}}</h4>
                </div>
            </div>
            <div class="shape-exporter-shapes">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Preview</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="shape in shapeGroup.shapes">
                            <td>{{shape.shapeConfig.id}}</td>
                            <td>{{shape.name}}</td>
                            <td>
                                <img width="52px" height="42px" :src="shape.shapeConfig.menuItems[0].iconUrl"/>
                            </td>
                        </tr>
                    </tbody>
                </table>                
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


function generateShapeConfigForItem(item, shapeGroupName) {
    const shapeId = getTagValueByPrefixKey(item.tags, 'shape-id=');
    if (item.shape !== 'dummy' && !shapeId) {
        return null;
    }

    let widthToHeightRatio = 1;
    if (item.area.w > 0 && item.area.h > 0) {
        widthToHeightRatio = item.area.w / item.area.h;
    }
    const convertedShape = convertShapeToStandardCurves(item);
    const svgPreview = buildSvgPreview(convertedShape, widthToHeightRatio);
    const svgPreviewBase64 = btoa(svgPreview);
    const creationSize = createWidthAndHeight(80, 80, widthToHeightRatio);
    const previewSize = createWidthAndHeight(150, 150, widthToHeightRatio);

    return {
        name: item.name,
        shapeConfig: {
            ...convertedShape.shapeConfig,
            id: shapeId,
            menuItems: [{
                group: shapeGroupName,
                name: item.name,
                iconUrl: `data:image/svg+xml;base64,${svgPreviewBase64}`,
                size: creationSize,
                previewArea: {x: 0, y: 0, w: previewSize.w, h: previewSize.h, r: 0},
            }]
        }
    };
}

function generateShapeGroupFromScheme(scheme) {
    const shapeGroupName = getTagValueByPrefixKey(scheme.tags, 'shape-group=', scheme.name);
    const shapeGroup = {
        group: shapeGroupName,
        shapes: []
    };

    if (Array.isArray(scheme.items)) {
        scheme.items.forEach(item => {
            const shapeConfig = generateShapeConfigForItem(item, shapeGroupName);
            if (shapeConfig) {
                shapeGroup.shapes.push(shapeConfig);
            }
        });
    }

    return shapeGroup;
}

export default {
    props: ['scheme'],

    components: {Modal},

    data() {
        let shapeGroup = null;
        let errorMessage = null;
        try {
            shapeGroup = generateShapeGroupFromScheme(this.scheme);
        } catch(err) {
            console.error(err);
            errorMessage = 'Failed to generate shape group';
            return null;
        }

        return {
            shapeGroup,
            errorMessage,
        };
    },

    methods: {
        exportShapeGroup() {
            if (this.shapeGroup) {
                const fileName = this.shapeGroup.group.toLocaleLowerCase().replaceAll(/[^a-z0-9]/gi, '-');
                utils.forceDownload(`${fileName}.json`, 'application/json', JSON.stringify(this.shapeGroup));
            }
        },
    },

    computed: {
        primaryButton() {
            return this.shapeGroup ? 'Export': null;
        }
    }
}
</script>