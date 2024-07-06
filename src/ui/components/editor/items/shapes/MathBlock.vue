<template>
    <g>
        <foreignObject x="0" y="0" :width="item.area.w" :height="item.area.h">
            <div ref="expressionContainer" class="item-text-container" xmlns="http://www.w3.org/1999/xhtml"
                :style="htmlStyle"
                :data-item-id="item.id"
                v-html="expressionHTML"
                >
            </div>
        </foreignObject>
    </g>
</template>

<script>
import { createRoundRectPath } from './ShapeDefaults';
import {InMemoryCache} from '../../../../LimitedSettingsStorage';
import MathBlockPropertiesEditor from './MathBlockPropertiesEditor.vue';

const cache = new InMemoryCache();
const itemCache = new InMemoryCache();

function renderExpression($store, item) {
    let assetsPath = $store.state.assetsPath;
    if (assetsPath === '/') {
        assetsPath = '';
    }

    const expression = item.shapeProps.expression;

    return cache.get(expression, () => {
        return new Promise((resolve, reject) => {
            const worker = new Worker(`${assetsPath}/js/katex-worker.js`);
            worker.onmessage = (event) => {
                resolve(event.data);
            };
            worker.postMessage({expression: expression});
        });
    });
}

export default {
    props: ['item', 'editorId'],

    components: {MathBlockPropertiesEditor},

    mounted() {
        renderExpression(this.$store, this.item)
        .then(html => {
            this.expressionHTML = html;
            itemCache.set(this.item.id, html);
        });
    },

    data() {
        return {
            expressionHTML: itemCache.getInstant(this.item.id, ''),
            htmlStyle: {
                fontSize: `${this.item.shapeProps.fontSize}px`,
                width: `${this.item.area.w}px`,
                height: `${this.item.area.h}px`,
                display: 'table-cell',
                'text-align': this.item.shapeProps.halign,
                'vertical-align': this.item.shapeProps.valign,
            }
        }
    },

    shapeConfig: {
        shapeType: 'vue',

        id: 'math_block',

        menuItems: [{
            group: 'General',
            name: 'Math Expression',
            iconUrl: '/assets/images/items/math-block.svg',
            item: {
                shapeProps: {
                    expression: 'c = \\pm\\sqrt{a^2 + b^2}'
                }
            },
        }],

        editorProps: {
            shapePropsEditor: {
                component: MathBlockPropertiesEditor
            },
        },

        getTextSlots(item) {
            return [];
        },

        computePath(item) {
            return createRoundRectPath(item.area.w, item.area.h, 0);
        },

        args: {
            expression : {type: 'string', value: '', name: 'Expression'},
            fontSize: {type: 'number', value: 15, name: 'Font size', min: 1},
            halign: {type: 'choice', value: 'center', options: ['left', 'center', 'right'], name: 'Horizontal Align'},
            valign: {type: 'choice', value: 'middle', options: ['top', 'middle', 'bottom'], name: 'Vertical Align'},
        },
    }
}
</script>