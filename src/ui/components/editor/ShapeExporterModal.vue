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
                    <img :src="shapeGroup.preview" alt=""/>
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
import { convertItemToTemplatedShape, getTagValueByPrefixKey } from './items/shapes/ShapeExporter';
import {convertTemplateShape} from './items/shapes/TemplatedShape';
import utils from '../../utils';
import myMath from '../../myMath';
import { encode } from 'js-base64';

function createWidthAndHeight(w, h, widthToHeightRatio) {
    if (widthToHeightRatio > 1) {
        h = w / widthToHeightRatio;
    } else if (widthToHeightRatio < 1) {
        w = h * widthToHeightRatio;
    } else {
        w = Math.min(w, h);
        h = w;
    }
    return {w, h};
}

/**
 *
 * @param {TemplatedShape} shapeDef
 * @param {Number} x
 * @param {Number} y
 * @param {Number} w
 * @param {Number} h
 */
function generateItemSVGLayer(shapeDef, x, y, w, h) {
    let svg = `<g transform="translate(${x}, ${y})">`;

    const fakeItem = {
        area: {x: 0, y: 0, w, h},
        shapeProps: {
            fill: {type: 'solid', color: '#ffffff'},
            strokeColor: '#111111',
            strokeSize: 2,
            strokePattern: 'solid'
        }
    };

    const shape = convertTemplateShape(shapeDef.shapeConfig);
    const primitives = shape.shapeConfig.computePrimitives(fakeItem);

    primitives.forEach(primitive => {
        if (primitive.svgPath) {
            const fill = primitive.fill && primitive.fill.type === 'solid' ? primitive.fill.color : 'none';
            svg += `<path d="${primitive.svgPath}" fill="${fill}" stroke="#111111" stroke-width="${primitive.strokeSize}px" stroke-linejoin="round"/>`;
        }
    });

    return svg + '</g>';
}

function buildSvgPreview(shapeDef, widthToHeightRatio) {
    const { w, h } = createWidthAndHeight(42, 32, widthToHeightRatio);
    const padding = 3;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 ${w} ${h}" xml:space="preserve" width="${w}px" height="${h}px">`;
    svg += generateItemSVGLayer(shapeDef, padding, padding, w - 2*padding, h - 2*padding);
    svg += '</svg>';
    return svg;
}


function generateShapeConfigForItem(item, shapeGroupName) {
    if (item.shape !== 'ext:container:shape_designer') {
        return null;
    }
    let shapeId = (item.shapeProps.shapeId || '').trim();

    if (!shapeId || /^shape(\s*|-)[0-9]*$/.test(shapeId.toLowerCase())) {
        shapeId = item.name.toLowerCase().replaceAll(/[\W_]+/g, '-');
    }

    let widthToHeightRatio = 1;
    if (item.area.w > 0 && item.area.h > 0) {
        widthToHeightRatio = item.area.w / item.area.h;
    }
    const convertedShape = convertItemToTemplatedShape(item);
    const svgPreview = buildSvgPreview(convertedShape, widthToHeightRatio);
    const svgPreviewBase64 = encode(svgPreview);
    const creationSize = createWidthAndHeight(80, 80, widthToHeightRatio);
    const previewSize = createWidthAndHeight(150, 150, widthToHeightRatio);

    return {
        name: item.name,
        widthToHeightRatio,
        shapeConfig: {
            ...convertedShape.shapeConfig,
            id: shapeId,
            menuItems: [{
                group: shapeGroupName,
                name: item.name,
                iconUrl: `data:image/svg+xml;base64,${svgPreviewBase64}`,
                size: {
                    w: myMath.roundPrecise1(creationSize.w),
                    h: myMath.roundPrecise1(creationSize.h)
                },
                previewArea: {x: 0, y: 0, w: myMath.roundPrecise1(previewSize.w), h: myMath.roundPrecise1(previewSize.h), r: 0},
            }]
        }
    };
}

function generateShapeGroupPreview(shapeGroup) {
    const maxRows = 4;
    const maxColumns = 5;
    let row = 0;
    let col = 0;

    let svg = '';
    const width = 80;
    const height = 80;
    const margin = 20;

    for (let i = 0; i < shapeGroup.shapes.length && row < maxRows; i++) {
        const {w,h} = createWidthAndHeight(width, height, shapeGroup.shapes[i].widthToHeightRatio);

        const x = width/2 + (width + margin) * col - w/2;
        const y = height/2 + (height + margin) * row - h/2;

        svg += generateItemSVGLayer(shapeGroup.shapes[i], x, y, w, h);
        col += 1;
        if (col >= maxColumns) {
            col = 0;
            row += 1;
        }
    }

    const totalCols = Math.min(shapeGroup.shapes.length, maxColumns);
    const totalRows = Math.min(row + 1, maxRows);
    const svgWidth = totalCols * (width + margin) + 10;
    const svgHeight = totalRows * (height + margin) + 10;
    return 'data:image/svg+xml;base64,' + encode(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="-10 -10 ${svgWidth+10} ${svgHeight+10}" xml:space="preserve" width="${svgWidth+20}px" height="${svgHeight+20}px">${svg}</svg>`);
}


function generateShapeGroupFromItem(shapeGroupItem) {
    const shapeGroupName = shapeGroupItem.name;
    const shapeGroup = {
        group: shapeGroupName,
        shapes: [],
        preview: null
    };

    if (Array.isArray(shapeGroupItem.childItems)) {
        shapeGroupItem.childItems.forEach(item => {
            const shapeConfig = generateShapeConfigForItem(item, shapeGroupName);
            if (shapeConfig) {
                shapeGroup.shapes.push(shapeConfig);
            }
        });
    }
    shapeGroup.preview = generateShapeGroupPreview(shapeGroup);

    shapeGroup.shapes.forEach(shape => delete shape.widthToHeightRatio);
    return shapeGroup;
}

export default {
    props: ['shapeGroupItem'],

    components: {Modal},

    data() {
        let shapeGroup = null;
        let errorMessage = null;
        try {
            shapeGroup = generateShapeGroupFromItem(this.shapeGroupItem);
        } catch(err) {
            console.error(err);
            errorMessage = 'Failed to generate shape group';
        };

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