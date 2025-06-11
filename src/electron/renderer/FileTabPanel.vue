<template>
    <div ref="tabContainer" class="elec-tab-container">
        <div ref="tabWrapper" class="elec-tab-wrapper file-droppable" :data-file-tab-id="files.length" @wheel.prevent="scrollByWheel">
            <div class="file-tab file-droppable" v-for="(file, fileIdx) in files"
                :class="{selected: fileIdx === currentOpenFileIndex, 'dragged-before': dragging.destinationIdx === fileIdx && dragging.isBefore, 'dragged-after': dragging.destinationIdx === fileIdx && !dragging.isBefore}"
                :key="`tab-${file.path}`"
                :title="file.path"
                @mousedown="onFileTabMouseDown($event, file, fileIdx)"
                :data-file-tab-id="fileIdx"
            >
                <i v-if="file.modified" class="icon-file-modified fa-solid fa-circle"></i>
                <span class="title">{{file.name}}</span>
                <!-- <span class="title" @click="$emit('selected-file', fileIdx)">{{file.name}}</span> -->
                <span class="close" @click="$emit('closed-file', fileIdx)"><i class="fas fa-times"></i></span>
            </div>
        </div>
        <div ref="scroller" class="scroller" @mousedown="onScrollerMouseDown" :style="{left: `${scrollPos}px`}" :class="{disabled: scrollerDisabled}"></div>

        <div ref="tabDragger"
            class="file-tab file-tab-dragged-preview"
            :style="{display: dragging.file ? 'inline-block' : 'none'}"
            >
            <span class="title" v-if="dragging.file">
                {{ dragging.file.name }}
            </span>
        </div>
    </div>
</template>

<script>
import { dragAndDropBuilder } from '../../ui/dragndrop';
import myMath from '../../ui/myMath';

const scrollerPadding = 2;


export default {
    props: {
        files               : {type: Array, required: true},
        currentOpenFileIndex: {type: Number, required: true},
    },

    data() {
        return {
            scrollPos: 0,
            scrollerDisabled: true,
            dragging: {
                sourceIdx: -1,
                destinationIdx: -1,
                isBefore: false,
                file: null
            }
        };
    },

    mounted() {
        this.updateScrollerPosition();
    },

    methods: {
        onFileTabMouseDown(event, file, fileIdx) {
            this.dragging.sourceIdx = fileIdx;
            dragAndDropBuilder(event)
            .withDraggedElement(this.$refs.tabDragger)
            .withDroppableClass('file-droppable')
            .withScrollableElement(this.$refs.tabWrapper, false)
            .onScroll(tabWrapper => {
                this.updateScrollerPosition();
            })
            .onDragStart(event => {
                this.dragging.file = file;
            })
            .onDone(event => {
                if (this.dragging.destinationIdx >= 0) {
                    let dstIdx = this.dragging.destinationIdx;
                    if (!this.dragging.isBefore) {
                        dstIdx = Math.min(dstIdx + 1, this.files.length);
                    }

                    if (this.dragging.sourceIdx !== dstIdx) {
                        this.$emit('reordered-files', this.dragging.sourceIdx, dstIdx);
                    }
                }
                this.dragging.destinationIdx = -1;
                this.dragging.file = null;
            })
            .onDrag(event => {
                const rect = this.$refs.tabContainer.getBoundingClientRect();
                if (event.pageX < rect.length || event.pageX > rect.right || event.pageY < rect.top || event.pageY > rect.bottom) {
                    this.destinationIdx = -1;
                }
            })
            .onDragOver((event, element) => {
                const bbox = element.getBoundingClientRect();
                let destinationTabIdx = parseInt(element.getAttribute('data-file-tab-id'));
                if (!isNaN(destinationTabIdx) && destinationTabIdx !== fileIdx) {
                    this.dragging.destinationIdx = destinationTabIdx;
                } else {
                    this.destinationIdx = -1;
                }
                this.dragging.isBefore = event.clientX < bbox.left + bbox.width/2;
            })
            .onSimpleClick(() => {
                this.$emit('selected-file', fileIdx);
            })
            .build();
        },

        scrollTabs() {
            const width = this.$refs.tabContainer.getBoundingClientRect().width;
            const scrollerWidth = this.$refs.scroller.getBoundingClientRect().width;
            const ratio = this.scrollPos / (width - scrollerWidth - scrollerPadding);
            const scrollLeft = (this.$refs.tabWrapper.scrollWidth - width) * ratio;
            this.$refs.tabWrapper.scrollLeft = scrollLeft;
        },

        scrollByWheel(event) {
            if (!this.scrollerDisabled) {
                const width = this.$refs.tabContainer.getBoundingClientRect().width;
                const scrollerWidth = this.$refs.scroller.getBoundingClientRect().width;
                let delta = event.deltaX;
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                    delta = event.deltaY;
                }
                const limit = 50;
                delta = myMath.clamp(delta, -limit, limit);
                this.scrollPos = myMath.clamp(this.scrollPos + delta, 0, width - scrollerWidth - scrollerPadding);
                this.scrollTabs();
            }
        },

        onScrollerMouseDown(event) {
            const originalX = event.pageX;
            const originalScroll = this.scrollPos;
            dragAndDropBuilder(event)
            .onDrag(event => {
                const width = this.$refs.tabContainer.getBoundingClientRect().width;
                const scrollerWidth = this.$refs.scroller.getBoundingClientRect().width;
                const dx = event.pageX - originalX;
                this.scrollPos = myMath.clamp(originalScroll + dx, 0, width - scrollerWidth - scrollerPadding);
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
            const scrollPos = this.$refs.tabWrapper.scrollLeft * (width - scrollerWidth - scrollerPadding) / (scrollWidth - width)
            this.scrollPos = myMath.clamp(scrollPos, 0, width - scrollerWidth - scrollerPadding);
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