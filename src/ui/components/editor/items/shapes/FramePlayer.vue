<template>
    <g>
        <foreignObject x="2" y="65" width="130" height="30">
            <div :style="textStyle">{{currentFrame}} / {{item.shapeProps.totalFrames}}</div>
        </foreignObject>

        <circle cx="20" cy="30" r="15"
            :fill="item.shapeProps.fillColor"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="1"/>
        <path d="M 6 12  L 0 6   L 6 0"
            transform="translate(16 24)"
            fill="none"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="3"
        />
        <circle cx="20" cy="30" r="15"
            @click="onClickedLeft"
            fill="rgba(255, 255, 255, 0)"
            stroke="rgba(255, 255, 255, 0)"
            stroke-width="1"
            style="cursor: pointer"/>

            
        <circle cx="66" cy="30" r="26"
            :fill="item.shapeProps.fillColor"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="1"/>
        <path d="M 0 18  L 0 0  L 12 9 Z"
            v-if="!isPlaying"
            transform="translate(63 21)"
            :fill="item.shapeProps.strokeColor"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="3"
        />
        <path d="M 0 0  L 0 18  M 8 0 L 8 18"
            v-if="isPlaying"
            transform="translate(62 21)"
            :fill="item.shapeProps.strokeColor"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="4"
        />
        <circle cx="66" cy="30" r="26"
            @click="onClickedTogglePlay"
            fill="rgba(255, 255, 255, 0)"
            stroke="rgba(255, 255, 255, 0)"
            stroke-width="1"
            style="cursor: pointer"/>


        <circle cx="112" cy="30" r="15" @click="onClickedRight"
            :fill="item.shapeProps.fillColor"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="1"/>
        <path d="M 0 12  L 6 6   L 0 0"
            transform="translate(109 24)"
            fill="none"
            :stroke="item.shapeProps.strokeColor"
            stroke-width="3"
        />
        <circle cx="112" cy="30" r="15" @click="onClickedRight"
            fill="rgba(255, 255, 255, 0)"
            stroke="rgba(255, 255, 255, 0)"
            stroke-width="1"
            style="cursor: pointer"/>
    </g>
</template>



<script>

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath() {
        return null
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
            intervalId: null
        };
    },

    methods: {
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
                this.isPlaying = true;
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
            return {
                'text-align': 'center',
                'font-size': this.item.shapeProps.fontSize + 'px'
            };
        }
    }
}
</script>