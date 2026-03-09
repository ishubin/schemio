<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgFill"></path>

        <foreignObject :x="0" :y="0" :width="item.area.w" :height="item.area.h" style="overflow: visible;">
            <div xmlns="http://www.w3.org/1999/xhtml" :style="containerStyle">
                
                <!-- Iframe Container -->
                <iframe v-if="isContentVisible"
                    :src="item.shapeProps.url"
                    :style="iframeStyle"
                    :frameborder="item.shapeProps.border ? 1 : 0"
                    :scrolling="item.shapeProps.scrolling ? 'yes' : 'no'"
                    allowfullscreen
                    mozallowfullscreen
                    webkitallowfullscreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>

                <!-- Placeholder / Load Button -->
                <div v-else :style="placeholderStyle" @click="loadContent">
                    <div :style="buttonStyle">
                        <i class="fas fa-play" style="font-size: 24px; color: white;"></i>
                        <span style="display: block; margin-top: 5px; color: white; font-family: sans-serif; font-size: 12px;">Load Content</span>
                    </div>
                </div>

                <!-- Interaction blocker for Edit Mode -->
                <div v-if="mode === 'edit'" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></div>
            </div>
        </foreignObject>
    </g>
</template>

<script>
import {getStandardRectPins} from './ShapeDefaults'
import AdvancedFill from '../AdvancedFill.vue';
import {computeStandardFill} from '../AdvancedFill.vue';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;
    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

export default {
    props: ['item', 'editorId', 'mode'],
    components: {AdvancedFill},

    data() {
        return {
            isLoaded: false
        };
    },

    mounted() {
        if (this.item.shapeProps.autoload) {
            this.isLoaded = true;
        }
    },

    watch: {
        'item.shapeProps.autoload'(val) {
            if (val) {
                this.isLoaded = true;
            }
        },
        'item.shapeProps.url'() {
            // Reset loaded state if URL changes and no autoload, or just keep it?
            // Usually if I change URL I might want to reload. 
            // Better to respect autoload.
            if (!this.item.shapeProps.autoload) {
                this.isLoaded = false;
            }
        }
    },

    methods: {
        loadContent() {
            this.isLoaded = true;
        }
    },

    shapeConfig: {
        shapeType: 'vue',
        id: 'web_frame',
        menuItems: [{
            group: 'General',
            name: 'Web Frame',
            iconUrl: '/assets/images/items/web-frame.svg', 
            item: {
                shapeProps: {
                    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    fill: {type: 'solid', color: 'rgba(255,255,255,1)'},
                    strokeColor: 'rgba(50, 50, 50, 1)',
                    strokeSize: 0,
                    autoload: true
                }
            }
        }],

        getPins: getStandardRectPins,
        computePath,

        getTextSlots(item) {
            return [];
        },

        editorProps: {
            disableEventLayer: true,
        },

        args: {
            url: {type: 'string', value: '', name: 'URL', description: 'URL to embed'},
            autoload: {type: 'boolean', value: true, name: 'Autoload', description: 'Load content immediately'},
            border: {type: 'boolean', value: false, name: 'Show Border'},
            scrolling: {type: 'boolean', value: false, name: 'Allow Scrolling'},
            cornerRadius: {type: 'number', value: 0, name: 'Corner Radius', min: 0, softMax: 50},
            fill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Background'},
            strokeColor: {type: 'color', value: 'rgba(50, 50, 50, 1)', name: 'Stroke Color'},
            strokeSize: {type: 'number', value: 0, name: 'Stroke Size', min: 0, max: 20},
        },
        
        controlPoints: {
             make(item) {
                return {
                    cornerRadius: {
                        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
                        y: 0
                    }
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, Math.round(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                }
            }
        }
    },

    computed: {
        isContentVisible() {
            return this.isLoaded || this.item.shapeProps.autoload;
        },

        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return computeStandardFill(this.item);
        },
        
        containerStyle() {
            return {
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                borderRadius: `${this.item.shapeProps.cornerRadius}px`,
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            };
        },

        iframeStyle() {
            return {
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: 'white'
            };
        },

        placeholderStyle() {
            return {
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.1)',
                cursor: 'pointer'
            };
        },
        
        buttonStyle() {
            return {
                padding: '10px 20px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: '8px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            };
        }
    }
}
</script>
