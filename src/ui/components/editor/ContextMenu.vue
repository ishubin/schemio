<template>
    <div class="context-menu" :style="{'top': `${mouseY + 10}px`, 'left': `${mouseX + 10}px`}">
        <slot></slot>
    </div>
</template>

<script>
export default {
    props: ['mouseX', 'mouseY'],

    mounted() {
        document.body.addEventListener('click', this.onDocumentClick);
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onDocumentClick);
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