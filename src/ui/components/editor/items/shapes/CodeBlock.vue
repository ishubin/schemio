<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgFill"></path>

        <g v-if="item.shapeProps.frame === 'mac'">
            <circle cx="15" cy="15" r="5" fill="#EC6762"/>
            <circle cx="30" cy="15" r="5" fill="#F4BE5E"/>
            <circle cx="45" cy="15" r="5" fill="#61C761"/>
        </g>
    </g>
</template>
<script>
import {getStandardRectPins} from './ShapeDefaults'
import AdvancedFill from '../AdvancedFill.vue';
import {computeStandardFill} from '../AdvancedFill.vue';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

const darkBackground = 'rgba(40, 40, 40, 1.0)';
const lightBackground = 'rgba(240, 240, 240, 1.0)';

function onThemeUpdate($store, item, value, previousValue) {
    if (value === 'dark') {
        item.shapeProps.fill = {type: 'solid', color: darkBackground};
        item.textSlots.title.color = 'rgba(245, 245, 245, 1.0)';
        item.textSlots.body.color = 'rgba(245, 245, 245, 1.0)';
    } else {
        item.shapeProps.fill = {type: 'solid', color: lightBackground};
        item.textSlots.title.color = 'rgba(0, 0, 0, 1.0)';
        item.textSlots.body.color = 'rgba(0, 0, 0, 1.0)';
    }
}

function onLangUpdate($store, item, value, previousValue) {
    const foreignObject = document.getElementById(`item-text-slot-${item.id}-body`);
    if (foreignObject) {
        highlightItemTextSlot($store, item, foreignObject);
    }
}

function highlightItemTextSlot($store, item, foreignObject) {
    const language = langMapping[item.shapeProps.lang];
    if (!language) {
        return;
    }
    let assetsPath = $store.state.assetsPath;
    if (assetsPath === '/') {
        assetsPath = '';
    }
    const worker = new Worker(`${assetsPath}/js/syntax-highlight-worker.js`);
    worker.onmessage = (event) => {
        const itemTextElement = foreignObject.querySelector('.item-text-element');
        if (itemTextElement) {
            itemTextElement.innerHTML = event.data;
        }
    };
    const code = document.createElement('code');
    code.appendChild(document.createTextNode(item.textSlots.body.text));
    worker.postMessage({text: code.innerText, lang: language});
}

const langMapping = {
    'Bash': 'bash',
    'C': 'c',
    'C++': 'cpp',
    'C#': 'csharp',
    'CSS': 'css',
    'Diff': 'diff',
    'GO': 'go',
    'GraphQL': 'graphql',
    'Ini': 'ini',
    'Java': 'java',
    'JavaScript': 'javascript',
    'JSON': 'json',
    'Kotlin': 'kotlin',
    'Less': 'less',
    'Lua': 'lua',
    'Makefile': 'makefile',
    'Markdown': 'markdown',
    'Objective C': 'objectivec',
    'Perl': 'perl',
    'PHP': 'php',
    'PHP Template': 'php-template',
    'Text': 'plaintext',
    'Python': 'python',
    'Python REPL': 'python-repl',
    'R': 'r',
    'Ruby': 'ruby',
    'Rust': 'rust',
    'SCSS': 'scss',
    'Shell': 'shell',
    'SQL': 'sql',
    'Swift': 'swift',
    'TypeScript': 'typescript',
    'VB.NET': 'vbnet',
    'WebAssembly': 'wasm',
    'XML': 'xml',
    'YAML': 'yaml'
};

const allLanguages = Object.keys(langMapping);


export default {
    props: ['item', 'editorId'],
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
                        color: 'rgba(245, 245, 245, 1.0)',
                        paddingTop: 4,
                        paddingLeft: 10,
                        paddingRight: 10,
                        paddingBottom: 4
                    },
                    body: {
                        font: 'Courier New',
                        text: '',
                        color: 'rgba(245, 245, 245, 1.0)',
                        halign: 'left',
                        valign: 'top',
                        whiteSpace: 'pre-wrap',
                        paddingTop: 10,
                        paddingLeft: 10,
                        paddingRight: 10,
                        paddingBottom: 10
                    }
                }
            },
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath,

        /**
         * Invoked when in place text editor was closed
         * @param {*} $store
         * @param {Item} item
         * @param {String} slotName
         * @param {HTMLElement} element
         */
        onTextSlotTextUpdate($store, item, slotName, element) {
            if (slotName !== 'body') {
                return;
            }
            highlightItemTextSlot($store, item, element);
        },

        getTextSlots(item) {
            const headerHeight = item.shapeProps.frame === 'none' ? 0 : item.shapeProps.headerHeight;

            const slots = [{
                name: 'body',
                markupDisabled: true,
                cssClass: `syntax-theme-${item.shapeProps.theme}`,
                area: {x: 0, y: headerHeight, w: item.area.w, h: Math.max(1, item.area.h - headerHeight)}
            }];
            if (item.shapeProps.frame !== 'none') {
                slots.push({
                    name: 'title', area: {x: 0, y: 0, w: item.area.w, h: Math.max(0, item.shapeProps.headerHeight)}
                });
            }

            return slots;
        },

        editorProps: {},
        args: {
            theme       : {type: 'choice', value: 'dark', options: ['dark', 'light'], name: 'Theme', onUpdate: onThemeUpdate },
            frame       : {type: 'choice', value: 'mac', options: ['mac', 'none'], name: 'Frame'},
            lang        : {type: 'choice', value: 'JavaScript', options: allLanguages, name: 'Language', onUpdate: onLangUpdate},
            fill        : {type: 'advanced-color', value: {type: 'solid', color: darkBackground}, name: 'Fill'},
            strokeColor : {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Stroke color'},
            strokeSize  : {type: 'number', value: 1, name: 'Stroke size'},
            cornerRadius: {type: 'number', value: 4, name: 'Corner radius', min: 0},
            headerHeight: {type: 'number', value: 30, name: 'Header hight', min: 0},
        },

        /**
         * `mounted` function is called from ItemSvg component when the item component is mounted
         * @param {*} $store
         * @param {Item} item
         * @param {Array<HTMLElement>} textSlots
         */
        mounted($store, item, textSlots) {
            if (!Array.isArray(textSlots)) {
                return;
            }
            textSlots.forEach(foreignObject => {
                if (foreignObject.getAttribute('data-text-slot-name') === 'body') {
                    highlightItemTextSlot($store, item, foreignObject);
                }
            });
        }
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return computeStandardFill(this.item);
        },
    },
}
</script>