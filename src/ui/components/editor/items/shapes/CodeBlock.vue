<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgFill"></path>

        <circle cx="15" cy="15" r="5" fill="#EC6762"/>
        <circle cx="30" cy="15" r="5" fill="#F4BE5E"/>
        <circle cx="45" cy="15" r="5" fill="#61C761"/>
    </g>
</template>
<script>
import AdvancedFill from '../AdvancedFill.vue';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'code_block',

        menuItems: [{
            group: 'General',
            name: 'Code Block',
            iconUrl: '/assets/images/items/code-block.svg',
            item: {
                textSlots: {
                    title: {
                        text: '<b>Code</b>',
                        halign: 'center',
                        valign: 'middle',
                        padding: {
                            top: 4,
                            left: 10,
                            right: 10,
                            bottom: 4
                        }
                    },
                    body: {
                        font: 'Courier New',
                        text: '',
                        halign: 'left',
                        valign: 'top',
                        whiteSpace: 'pre-wrap',
                        padding: {
                            top: 10,
                            left: 10,
                            right: 10,
                            bottom: 10
                        }
                    }
                }
            },
        }],

        computePath,

        getTextSlots(item) {
            return [{
                name: "title", area: {x: 0, y: 0, w: item.area.w, h: Math.max(0, item.shapeProps.headerHeight)}
            }, {
                name: "body", area: {x: 0, y: item.shapeProps.headerHeight, w: item.area.w, h: Math.max(1, item.area.h - item.shapeProps.headerHeight)}
            }];
        },

        editorProps: {},
        args: {
            fill        : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Fill'},
            strokeColor : {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Stroke color'},
            strokeSize  : {type: 'number', value: 1, name: 'Stroke size'},
            cornerRadius: {type: 'number', value: 4, name: 'Corner radius'},
            headerHeight: {type: 'number', value: 30, name: 'Header hight', min: 0}
        },
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return AdvancedFill.computeStandardFill(this.item);
        },
    },
}
</script>