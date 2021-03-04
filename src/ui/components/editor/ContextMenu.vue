<template>
    <div :id="`context-menu-${domId}`" class="context-menu" :style="{'top': `${y}px`, 'left': `${x}px`}">
        <slot></slot>
    </div>
</template>

<script>
import shortid from 'shortid';

export default {
    props: ['mouseX', 'mouseY'],

    mounted() {
        document.body.addEventListener('click', this.onDocumentClick);

        const domElement = document.getElementById(`context-menu-${this.domId}`);
        if (domElement) {
            const rect = domElement.getBoundingClientRect();
            const overlapX = rect.right - window.innerWidth;
            const overlapY = rect.bottom - window.innerHeight;
            if (overlapX > 0) {
                this.x -= overlapX;
            }
            if (overlapY > 0) {
                this.y -= overlapY;
            }
        }
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onDocumentClick);
    },

    data() {
        return {
            domId: shortid.generate(),
            x: this.mouseX,
            y: this.mouseY
        }
    },

    methods: {
        onDocumentClick() {
            setTimeout(() => {
                this.$emit('close');
            }, 100);
        }
    }

}
</script>