<template>
   <div>
        <svg-editor
            :schemeContainer="schemeContainer" :width="800" :height="400" :offsetX="0" :offsetY="0" :zoom="1.0"
            mode="view"
            ></svg-editor>
    </div>
</template>

<script>
import SvgEditor from '../components/editor/SvgEditor.vue';

export default {
    props: ['schemeContainer'],

    components: {SvgEditor},

    data() {
        return {
            name: 'QWwqeqqwe'
        }
    }
}
</script>