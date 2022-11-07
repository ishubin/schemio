<template>
    <div ref="tabContainer" class="elec-tab-container">
        <div ref="tabWrapper" class="elec-tab-wrapper">
            <div class="file-tab" v-for="(file, fileIdx) in files"
                :class="{selected: fileIdx === currentOpenFileIndex}"
                :key="`tab-${file.path}`"
            >
                <span class="title" @click="$emit('selected-file', fileIdx)">{{file.name}}</span>
                <span class="close" @click="$emit('closed-file', fileIdx)"><i class="fas fa-times"></i></span>
            </div>
        </div>
        <div ref="scroller" class="scroller" @mousedown="onScrollerMouseDown" :style="{left: `${scrollPos}px`}" :class="{disabled: scrollerDisabled}"></div>
    </div>
</template>

<script>
import { dragAndDropBuilder } from '../../ui/dragndrop';
import myMath from '../../ui/myMath';
export default {
    props: {
        files               : {type: Array, required: true},
        currentOpenFileIndex: {type: Number, required: true},
    },

    data() {
        return {
            scrollPos: 0,
            scrollerDisabled: true
        };
    },

    mounted() {
        this.updateScrollerPosition();
    },

    methods: {
        scrollTabs() {
            const width = this.$refs.tabContainer.getBoundingClientRect().width;
            const scrollerWidth = this.$refs.scroller.getBoundingClientRect().width;
            const ratio = this.scrollPos / (width - scrollerWidth - 2);
            const scrollLeft = (this.$refs.tabWrapper.scrollWidth - width) * ratio;
            this.$refs.tabWrapper.scrollLeft = scrollLeft;
        },

        onScrollerMouseDown(event) {
            const originalX = event.pageX;
            const originalScroll = this.scrollPos;
            dragAndDropBuilder(event)
            .onDrag(event => {
                const width = this.$refs.tabContainer.getBoundingClientRect().width;
                const scrollerWidth = this.$refs.scroller.getBoundingClientRect().width;
                const dx = event.pageX - originalX;
                this.scrollPos = myMath.clamp(originalScroll + dx, 0, width - scrollerWidth - 2);
                this.scrollTabs();
            })
            .build();
        },

        updateScrollerPosition() {
            const width = this.$refs.tabContainer.getBoundingClientRect().width;
            const scrollerWidth = this.$refs.scroller.getBoundingClientRect().width;
            const scrollWidth = this.$refs.tabWrapper.scrollWidth;
            if (scrollWidth <= width) {
                this.scrollPos = 0;
                this.scrollerDisabled = true;
                return;
            }
            if (this.scrollerDisabled) {
                this.scrollerDisabled = false;
            }
            const scrollPos = this.$refs.tabWrapper.scrollLeft * (width - scrollerWidth - 2) / (scrollWidth - width)
            this.scrollPos = myMath.clamp(scrollPos, 0, width - scrollerWidth - 2);
        }

    },

    watch: {
        files() {
            this.$nextTick(() => {
                this.updateScrollerPosition();
            });
        }
    }
}
</script>