<template>
    <g>
        <foreignObject x="0" :y="0" v-if="hiddenTextProperty !== 'name'" 
            :width="item.area.w" :height="topOffset">
            <div :style="textStyle">{{item.name}}</div>
        </foreignObject>

        <g v-for="(button,buttonIndex) in buttons">
            <circle 
                :cx="leftOffset + buttonIndex * (buttonSize + buttonSpaceSize) + buttonSize / 2 + 2"
                :cy="buttonSize/2 + 2 + topOffset"
                :r="buttonSize/2"
                :fill="item.shapeProps.fillColor"
                :stroke="item.shapeProps.strokeColor"
                stroke-width="1"/>

            <foreignObject 
                :x="leftOffset + buttonIndex * (buttonSize + buttonSpaceSize) + 2"
                :y="1 + topOffset"
                :width="buttonSize"
                :height="buttonSize">
                <div style="width: 100%; height: 100%; text-align: center; vertical-align: middle;">
                    <i :class="[isPlaying?button.iconPlaying:button.icon]" :style="{'font-size':buttonFontSize, 'color': item.shapeProps.strokeColor}"></i>
                </div>
            </foreignObject>

            <circle 
                :cx="leftOffset + buttonIndex * (buttonSize + buttonSpaceSize) + buttonSize / 2 + 2"
                :cy="buttonSize/2 + 2 + topOffset"
                :r="buttonSize/2"
                @click="onClickedButton(buttonIndex)"
                fill="rgba(255, 255, 255, 0)"
                stroke="rgba(255, 255, 255, 0)"
                stroke-width="1"
                style="cursor: pointer"/>
        </g>

        <foreignObject x="0" :y="buttonSize + 6 + topOffset" 
            :width="item.area.w" height="30">
            <div :style="textStyle">{{currentFrame}} / {{item.shapeProps.totalFrames}}</div>
        </foreignObject>
    </g>
</template>



<script>


function generateTextStyle(item) {
    return {
        'text-align':   'center',
        'font-size':    item.shapeProps.fontSize + 'px'
    };
}

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath(item) {
        const w = item.area.w;
        const h = item.area.h;

        return `M 0 0   L ${w} 0  L ${w} ${h}  L 0 ${h} z`;
    },

    identifyTextEditArea(item, itemX, itemY) {
        return {
            property: 'name',
            style: generateTextStyle(item)
        }
    },
    editorProps: {
        description     : 'rich',
        text            : 'disabled',
        ignoreEventLayer: true
    },

    args: {
        totalFrames: {type: 'number', value: 5, name: 'Total frames'},
        frameDelay: {type: 'number', value: 1, name: 'Frame delay (sec)'},
        fillColor: {type: 'color', value: 'rgba(220, 220, 220, 1.0)', name: 'Fill color'},
        strokeColor: {type: 'color', value: 'rgba(30,30,30,1.0)', name: 'Stroke color'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'},
    },

    /**
     * Returns events that given item is able to emit
     * The result of this function is dynamic based on the item settings.
     * This is used in order to build suggestions in BehaviorPanel.
     */
    getEvents(item) {
        const events = [];
        if (item.shapeProps.totalFrames > 0) {
            for (let i = 1; i <= item.shapeProps.totalFrames; i++) {
                events.push({
                    name: `Frame-${i}`
                });
            }
        }
        return events;
    },

    data() {
        return {
            currentFrame: 1,
            isPlaying: false,
            intervalId: null,

            topOffset: 30,
            buttonSize: 20,
            buttonSpaceSize: 4,
            buttonFontSize: '10px',

            buttons: [{
                icon: 'fas fa-fast-backward',
                iconPlaying: 'fas fa-fast-backward',
                click: () => {this.onClickedToBegin()}
            }, {
                icon: 'fas fa-step-backward',
                iconPlaying: 'fas fa-step-backward',
                click: () => {this.onClickedLeft()}
            }, {
                icon: 'fas fa-play',
                iconPlaying: 'fas fa-pause',
                click: () => {this.onClickedTogglePlay()}
            }, {
                icon: 'fas fa-step-forward',
                iconPlaying: 'fas fa-step-forward',
                click: () => {this.onClickedRight()}
            }, {
                icon: 'fas fa-fast-forward',
                iconPlaying: 'fas fa-fast-forward',
                click: () => {this.onClickedToEnd()}
            }]
        };
    },

    methods: {
        onClickedButton(buttonIndex) {
            this.buttons[buttonIndex].click();
        },

        onClickedToBegin() {
            this.currentFrame = 1;
            this.emitCurrentFrameEvent();
        },

        onClickedToEnd() {
            this.currentFrame = this.item.shapeProps.totalFrames;
            this.emitCurrentFrameEvent();
        },

        onClickedLeft() {
            if (this.currentFrame > 1) {
                this.currentFrame -= 1;
                this.emitCurrentFrameEvent();
            }
        },

        onClickedRight() {
            if (this.currentFrame < this.item.shapeProps.totalFrames) {
                this.currentFrame += 1;
                this.emitCurrentFrameEvent();
            }
        },

        onClickedTogglePlay() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }

            if (!this.isPlaying) {
                if (this.currentFrame === this.item.shapeProps.totalFrames) {
                    this.currentFrame = 1;
                }
                this.isPlaying = true;
                this.emitCurrentFrameEvent();
                this.intervalId = setInterval(this.onPlayInterval, this.item.shapeProps.frameDelay * 1000);
            } else {
                this.isPlaying = false;
            }
        },

        onPlayInterval() {
            if (this.currentFrame < this.item.shapeProps.totalFrames) {
                this.currentFrame += 1;   
                this.emitCurrentFrameEvent();
            } else {
                this.isPlaying = false;
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        },

        emitCurrentFrameEvent() {
            this.$emit('custom-event', `Frame-${this.currentFrame}`);
        }
    },

    computed: {
        textStyle() {
            return generateTextStyle(this.item)
        },

        leftOffset() {
            return this.item.area.w / 2 - (this.buttonSize*2.5 + this.buttonSpaceSize*2);
        }
    }
}
</script>