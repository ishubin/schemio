<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`headerfill-pattern-${item.id}`" :fill="item.shapeProps.headerFill" :area="headerArea"/>

        <path :d="shapePath" stroke-width="0" stroke="none" :fill="svgFill"></path>

        <path :d="headerPath" stroke-width="0" stroke="none" :fill="headerFill"></path>

        <foreignObject v-if="item.meta.activeTextSlot !== 'header'"
            x="0" y="0"
            :width="item.area.w"
            :height="Math.min(item.shapeProps.headerHeight, item.area.h)">
            <div xmlns="http://www.w3.org/1999/xhtml" class="item-text-container" v-html="headerHtml" :style="headerStyle"></div>
        </foreignObject>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            fill="none"></path>

        <clipPath :id="`entity-clip-path-${item.id}`">
            <path :d="clipPath"
                stroke-width="0px"
                stroke="rgba(255, 255, 255, 0)"
                fill="rgba(255, 255, 255, 0)" />
        </clipPath>

        <g :style="{'clip-path': `url(#entity-clip-path-${this.item.id})`}">
            <template v-for="(field, idx) in fields">
                <circle r="5"
                    :cx="15"
                    :cy="Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10 + fieldHeight / 2"
                    fill="none"
                    :stroke="item.shapeProps.strokeColor"
                    :style="{opacity: 0.3}"
                    />

                <foreignObject
                    v-if="field.primaryIcon"
                    :x="25"
                    :y="Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10"
                    :width="20"
                    :height="fieldHeight"
                    >
                    <div xmlns="http://www.w3.org/1999/xhtml"
                        :style="{...fieldStyle, width: '20px', height: `${fieldHeight}px`}">
                        <span v-if="item.shapeProps.flagStyle === 'text'" style="font-size: 12px;">
                            {{ field.primaryIcon.shortName }}
                        </span>
                        <i v-else :class="field.primaryIcon.iconClass"></i>
                    </div>
                </foreignObject>
                <foreignObject
                    v-if="item.meta.activeTextSlot !== `field_${field.id}_name`"
                    :x="25 + primaryIconOffset"
                    :y="Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10"
                    :width="maxFieldWidth"
                    :height="fieldHeight"
                    >
                    <div xmlns="http://www.w3.org/1999/xhtml"
                        :style="{...fieldStyle, width: `${maxFieldWidth}px`, height: `${fieldHeight}px`}">
                        <div>{{ field.name }}</div>
                    </div>
                </foreignObject>
                <foreignObject
                    v-if="item.meta.activeTextSlot !== `field_${field.id}_type`"
                    :x="35 + maxFieldWidth + primaryIconOffset"
                    :y="Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10"
                    :width="Math.max(1, item.area.w - 40 - maxFieldWidth)"
                    :height="fieldHeight"
                    >
                    <div xmlns="http://www.w3.org/1999/xhtml"
                        :style="{...fieldStyle, width: `${Math.max(0, item.area.w - 18)/2}px`, height: `${fieldHeight}px`}">
                        <div>{{ field.type }}</div>
                    </div>
                </foreignObject>

                <foreignObject
                    :x="40 + maxFieldWidth"
                    :y="Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10"
                    :width="Math.max(1, item.area.w - 40 - maxFieldWidth)"
                    :height="fieldHeight"
                    >
                    <div xmlns="http://www.w3.org/1999/xhtml"
                        :style="{...fieldStyle, 'white-space': 'nowrap', 'text-align': 'right', width: `${Math.max(0, item.area.w - 18)/2}px`, height: `${fieldHeight}px`}">
                        <div>
                            <template v-if="item.shapeProps.flagStyle === 'text'">
                                <span style="margin: 2px;font-size: 12px;" v-for="flagIcon in field.flagIcons">{{ flagIcon.shortName }}</span>
                            </template>
                            <template v-else>
                                <i v-for="flagIcon in field.flagIcons" :class="flagIcon.iconClass" style="margin: 2px;"></i>
                            </template>
                        </div>
                    </div>
                </foreignObject>
            </template>
        </g>
    </g>
</template>

<script>
import AdvancedFill, { computeSvgFill } from '../../AdvancedFill.vue';
import myMath from '../../../../../myMath';
import { computeStandardFill } from '../../AdvancedFill.vue';
import shortid from 'shortid';
import EditorEventBus from '../../../EditorEventBus';
import { generateTextStyle } from '../../../text/ItemText';
import htmlSanitize from '../../../../../../htmlSanitize';
import { calculateTextSize } from '../../ItemTemplateFunctions';
import { defaultTextSlotProps } from '../../../../../scheme/Item';


const typeSuggestions = [
    'binary',
    'boolean',
    'date',
    'datetime',
    'decimal',
    'email',
    'enum',
    'float',
    'foreign key',
    'integer',
    'json',
    'string',
    'text',
    'time',
    'timestamp',
    'url',
    'uuid'
]

function computePath(item) {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4, item.shapeProps.headerHeight);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
}

function computeHeaderPath(item) {
    const W = item.area.w;
    const H = Math.min(item.shapeProps.headerHeight, item.area.h);
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4, item.shapeProps.headerHeight);

    return `M ${W} ${H}  L 0 ${H} L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H} Z`;
}

function removeField(editorId, item, fieldIdx) {
    item.shapeProps.fields.splice(fieldIdx, 1);
    EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.fields`);
    EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.fields`);
}

function addField(editorId, item, fieldIdx) {
    item.shapeProps.fields.push({
        id: shortid.generate(),
        name: 'field' + (fieldIdx+1),
        type: 'varchar(32)',
        flags: []
    });

    const maxFieldSize = calculateMaxFieldSize(item);
    const fieldHeight = Math.max(5, maxFieldSize.h + 10);

    const y = Math.min(item.shapeProps.headerHeight, item.area.h) + fieldHeight / 2 + fieldIdx * fieldHeight + 8 + fieldHeight;
    if (y > item.area.h) {
        item.area.h = y;
    }
    EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.fields`);
    EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.fields`);
}


function toggleFieldFlag(editorId, item, fieldIdx, flag) {
    const field = item.shapeProps.fields[fieldIdx];
    if (!Array.isArray(field.flags)) {
        field.flags = [];
    }

    let existed = false;
    for (let i = field.flags.length - 1; i >= 0; i--) {
        if (field.flags[i] === flag) {
            existed = true;
            field.flags.splice(i, 1);
        }
    }
    if (!existed) {
        field.flags.push(flag);
    }

    EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.fields`);
    EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.fields`);
}


const allEntityIcons = {
    PK: { name: 'Primary Key', shortName: 'PK', iconClass: 'fa-solid fa-key' },
    U : { name: 'Unique Key', shortName: 'U', iconClass: 'fa-solid fa-star' },
    FK: { name: 'Foreign Key', shortName: 'FK', iconClass: 'fa-solid fa-link' },
    AI: { name: 'Auto-increment', shortName: 'AI', iconClass: 'fa-solid fa-circle-up' },
    IX: { name: 'Indexed', shortName: 'IX', iconClass: 'fa-solid fa-book-open' },
    N : { name: 'Null', shortName: 'N', iconClass: 'fa-solid fa-check-double' },
    NN: { name: 'Non-null', shortName: 'NN', iconClass: 'fa-solid fa-circle-exclamation' }
};

const allIconOptions = [];
for (let key in allEntityIcons) {
    if (allEntityIcons.hasOwnProperty(key)) {
        allIconOptions.push({
            ...allEntityIcons[key],
            value: key
        });
    }
}

function calculateMaxFieldSize(item) {
    let maxWidth = item.area.w / 3;
    let maxHeight = 5;
    item.shapeProps.fields.forEach(field => {
        const s = calculateTextSize(field.name, item.shapeProps.font, item.shapeProps.fontSize);
        if (maxWidth < s.w) {
            maxWidth = s.w;
        }
        if (maxHeight < s.h) {
            maxHeight = s.h;
        }
    });
    return {
        w: maxWidth,
        h: maxHeight
    };
}

function convertField(field) {
    let primaryIcon = null;
    const flagIcons = [];
    if (Array.isArray(field.flags)) {
        field.flags.forEach(flag => {
            if (flag === 'PK') {
                primaryIcon = allEntityIcons.PK;
            } else if (flag === 'U') {
                primaryIcon = allEntityIcons.U;
            } else if (flag === 'FK') {
                primaryIcon = allEntityIcons.FK;
            } else {
                if (allEntityIcons.hasOwnProperty(flag)) {
                    flagIcons.push(allEntityIcons[flag]);
                }
            }
        });
    }

    const result = {
        ...field,
        primaryIcon,
        flagIcons,
    };

    return result;
}

export default {
    props: ['item', 'editorId'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'uml_entity',

        menuItems: [{
            group: 'UML',
            name: 'Entity',
            iconUrl: '/assets/images/items/uml-process.svg',
            item: {
                shapeProps: {
                    fields: [{
                        id: shortid.generate(),
                        name: 'user_id',
                        type: 'BIGINT(11)',
                        flags: ['PK', 'AI']
                    }, {
                        id: shortid.generate(),
                        name: 'name',
                        type: 'varchar(32)',
                        flags: []
                    }, {
                        id: shortid.generate(),
                        name: 'email',
                        type: 'varchar(256)',
                        flags: ['U']
                    }, {
                        id: shortid.generate(),
                        name: 'attributes',
                        type: 'JSON'
                    }]
                },
                textSlots: {
                    header: {
                        text: 'User',
                        bold: false,
                        color: '#ffffffff',
                        fontSize: 16
                    }
                }
            }
        }],

        getTextSlots(item) {
            const fields = item.shapeProps.fields.map(convertField);
            const primaryIconOffset = fields.findIndex(field => field.primaryIcon) >= 0 ? 20 : 0;
            const slots = [{
                name: 'header',
                area: {x: 0, y: 0, w: item.area.w, h: Math.min(item.shapeProps.headerHeight, item.area.h)}
            }];

            const maxFieldSize = calculateMaxFieldSize(item);
            const maxFieldWidth = Math.max(10, maxFieldSize.w);
            const fieldHeight = Math.max(5, maxFieldSize.h + 10);

            item.shapeProps.fields.forEach((field, idx) => {
                slots.push({
                    name: `field_${field.id}_name`,
                    kind: 'ghost',
                    display: 'textfield',
                    props: {
                        font: item.shapeProps.font,
                        text: field.name,
                        valign: 'middle',
                        halign: 'left',
                    },
                    area: {
                        x: 25 + primaryIconOffset,
                        y: Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10,
                        w: maxFieldWidth,
                        h: fieldHeight
                    },
                    onUpdate(editorId, text) {
                        field.name = text;
                        EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.fields.${idx}.name`);
                        EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.fields.${idx}.name`);
                    },
                });
                slots.push({
                    name: `field_${field.id}_type`,
                    kind: 'ghost',
                    display: 'dropdown',
                    props: {
                        font: item.shapeProps.font,
                        text: field.type,
                        valign: 'middle',
                        halign: 'left',
                    },
                    suggestions: typeSuggestions,
                    area: {
                        x: 35 + maxFieldWidth + primaryIconOffset,
                        y: Math.min(item.shapeProps.headerHeight, item.area.h) + idx * fieldHeight + 10,
                        w: Math.max(1, item.area.w - 40 - maxFieldWidth - primaryIconOffset),
                        h: fieldHeight
                    },
                    onUpdate(editorId, text) {
                        field.type = text;
                        EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.fields.${idx}.type`);
                        EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.fields.${idx}.type`);
                    }
                });
            });
            return slots;
        },

        computePath,

        getPins(item) {
            const w = item.area.w;
            const h = item.area.h;
            const pins = {
                t: {
                    x: w / 2, y: 0,
                    nx: 0, ny: -1
                },
                b: {
                    x: w / 2, y: h,
                    nx: 0, ny: 1
                },
                l: {
                    x: 0, y: h/2,
                    nx: -1, ny: 0
                },
                r: {
                    x: w, y: h/2,
                    nx: 1, ny: 0
                }
            };
            const maxFieldSize = calculateMaxFieldSize(item);
            const fieldHeight = Math.max(5, maxFieldSize.h + 10);

            item.shapeProps.fields.forEach((field, idx) => {
                pins[`f_${field.id}`] = {
                    x: 15,
                    y: Math.min(item.shapeProps.headerHeight, item.area.h) + fieldHeight / 2 + idx * fieldHeight + 10,
                    nx: -1, ny: 0
                };
            });
            return pins;
        },

        controlPoints: {
            make(item) {
                return {
                    cornerRadius: {
                        x: item.area.w - item.shapeProps.cornerRadius,
                        y: 0
                    },
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = myMath.clamp(myMath.roundPrecise1(item.area.w - originalX - dx), 0, Math.min(item.area.w/4, item.area.h/4));
                }
            }
        },

        editorProps: {
            customTextRendering: true,

            editBoxControls: (editorId, item) => {
                const controls = [];

                const maxFieldSize = calculateMaxFieldSize(item);
                const fieldHeight = Math.max(5, maxFieldSize.h + 10);
                const fields = item.shapeProps.fields.map(convertField);
                const primaryIconOffset = fields.findIndex(field => field.primaryIcon) >= 0 ? 20 : 0;

                item.shapeProps.fields.forEach((field, idx) => {
                    controls.push({
                        name: 'Delete',
                        type: 'icon',
                        hPlace: 'middle',
                        vPlace: 'center',
                        iconClass: 'fa-solid fa-times',
                        radius: 5,
                        style: {
                            color: '#d34242'
                        },
                        position: {
                            x: 25 + maxFieldSize.w + primaryIconOffset,
                            y: Math.min(item.shapeProps.headerHeight, item.area.h) + fieldHeight / 2 + idx * fieldHeight + 10,
                        },
                        click: () => {
                            removeField(editorId, item, idx);
                        }
                    });
                    controls.push({
                        name: 'Menu',
                        type: 'menu',
                        hPlace: 'middle',
                        vPlace: 'center',
                        iconClass: 'fa-solid fa-ellipsis-vertical',
                        radius: 5,
                        options: allIconOptions,
                        style: {
                            color: '#777',
                            background: 'rgba(255,255,255,0.4)',
                            'border-radius': '10px',
                        },
                        position: {
                            x: item.area.w - 11,
                            y: Math.min(item.shapeProps.headerHeight, item.area.h) + fieldHeight / 2 + idx * fieldHeight + 10,
                        },
                        click: (option) => {
                            toggleFieldFlag(editorId, item, idx, option.value);
                        }
                    });
                    controls.push({
                        name: 'Connect',
                        type: 'icon',
                        hPlace: 'middle',
                        vPlace: 'center',
                        iconClass: 'fa-regular fa-circle',
                        style: {
                            color: '#639368'
                        },
                        radius: 5,
                        position: {
                            x: 15,
                            y: Math.min(item.shapeProps.headerHeight, item.area.h) + fieldHeight / 2 + idx * fieldHeight + 10,
                        },
                        click: () => {
                            EditorEventBus.connectorRequested.$emit(editorId, item, `f_${field.id}`);
                        }
                    });
                });
                controls.push({
                    name: 'Add',
                    type: 'button',
                    hPlace: 'middle',
                    vPlace: 'center',
                    iconClass: 'fa-solid fa-plus',
                    radius: 7,
                    position: {
                        x: 20,
                        y: Math.min(item.shapeProps.headerHeight, item.area.h) + fieldHeight / 2 + item.shapeProps.fields.length * fieldHeight + 8,
                    },
                    click: () => {
                        addField(editorId, item, item.shapeProps.fields.length);
                    }
                });
                return controls;
            }
        },

        args: {
            fill         : {name: 'Fill', type: 'advanced-color', value: {type: 'solid', color: 'rgba(240, 240, 240, 1.0)'}},
            headerFill   : {name: 'Header fill', type: 'advanced-color', value: {type: 'solid', color: '#4A5965'}},
            strokeColor  : {name: 'Stroke', type: 'color', value: '#284D69'},
            strokePattern: {type: 'stroke-pattern', value: 'dashed', name: 'Stroke pattern'},
            strokeSize   : {name: 'Stroke Size', type: 'number', value: 1, min: 0, softMax: 100},
            cornerRadius : {name: 'Stroke Size', type: 'number', value: 10, min: 0, softMax: 100},
            headerHeight : {type: 'number', value: 35, name: 'Header Height', min: 0},
            fields       : {type: 'array', value: [], name: 'Fields', hidden: true},
            font         : {type: 'font', name: 'Font', value: 'Arial'},
            fontSize     : {type: 'number', value: 14, name: 'Header Height', min: 1, softMax: 100},
            textColor    : {name: 'Text color', type: 'color', value: 'rgba(0, 0, 0, 1)'},
            flagStyle    : {type: 'choice', value: 'icons', options: ['icons', 'text'], name: 'Flag style'},
        },
    },

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },
    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },

    data() {
        const maxFieldSize = calculateMaxFieldSize(this.item);
        const fields = this.item.shapeProps.fields.map(convertField);
        const primaryIconOffset = fields.findIndex(field => field.primaryIcon) >= 0 ? 20 : 0;

        return {
            headerStyle: this.createHeaderStyle(),
            maxFieldWidth: Math.max(10, maxFieldSize.w),
            fieldHeight: Math.max(5, maxFieldSize.h + 10),
            fields: fields,
            primaryIconOffset,
        };
    },

    methods: {
        updateFieldSize() {
            const maxFieldSize = calculateMaxFieldSize(this.item);
            this.maxFieldWidth = Math.max(10, maxFieldSize.w);
            this.fieldHeight = Math.max(5, maxFieldSize.h + 10);
        },

        createHeaderStyle() {
            const style = generateTextStyle(this.item.textSlots.header);
            style.width = `${this.item.area.w}px`;
            style.height = `${Math.min(this.item.shapeProps.headerHeight, this.item.area.h)}px`;
            return style;
        },
        onItemChanged() {
            if (this.item.shape !== 'uml_entity') {
                return;
            }
            this.geaderStyle = this.createHeaderStyle();
        },
    },

    computed: {
        fieldStyle() {
            return generateTextStyle({
                ...defaultTextSlotProps,
                halign: 'left',
                valign: 'middle',
                fontSize: this.item.shapeProps.fontSize,
                font: this.item.shapeProps.font,
                color: this.item.shapeProps.textColor
            });
        },
        headerHtml() {
            return htmlSanitize(this.item.textSlots.header.text);
        },
        shapePath() {
            return computePath(this.item);
        },

        headerPath() {
            return computeHeaderPath(this.item);
        },

        clipPath() {
            const w = this.item.area.w;
            const h = this.item.area.h;
            const y0 = Math.min(this.item.shapeProps.headerHeight, this.item.area.h);
            return `M 0 ${y0} L ${w} ${y0} L ${w} ${h}, L 0 ${h} Z`;
        },

        svgFill() {
            return computeStandardFill(this.item);
        },

        headerFill() {
            return computeSvgFill(this.item.shapeProps.headerFill, `headerfill-pattern-${this.item.id}`);
        },

        headerArea() {
            return {
                x: 0,
                y: 0,
                w: this.item.area.w,
                h: Math.min(this.item.shapeProps.headerHeight, this.item.area.h)
            };
        }
    },
}

</script>
