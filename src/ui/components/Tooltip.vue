<template>
    <div class="tooltip">
        <i @mouseover="onMouseOver" class="tooltip-icon fas fa-info-circle"></i>

        <div :id="`tooltip-wrapper-${id}`" class="tooltip-wrapper" :style="{left: x+'px', top: y+'px'}">
            <div class="tooltip-text">
                <slot></slot>
            </div>
        </div>
    </div>
</template>
<script>
import shortid from 'shortid';

export default {
    props: [],

    data() {
        return {
            id: shortid.generate(),
            x: 0,
            y: 0
        };
    },

    methods: {
        onMouseOver(event) {
            this.x = event.x + 10;
            let y = event.y + 20;
            const domElement = document.getElementById(`tooltip-wrapper-${this.id}`);
            if (domElement) {
                const bbRect = domElement.getBoundingClientRect();
                if (bbRect.height + y > window.innerHeight) {
                    y = event.y - bbRect.height;
                }
            }
            this.y = y;
        }
    }
}
</script>