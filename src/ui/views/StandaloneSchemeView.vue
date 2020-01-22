<template>
   <div oncontextmenu="return false;">
        <svg-editor :scheme-container="schemeContainer" :width="width" :height="height" :offset-x="0" :offset-y="0" :zoom="1.0" mode="view" />
    </div>
</template>

<script>
import SvgEditor from '../components/editor/SvgEditor.vue';
import SchemeContainer from '../scheme/SchemeContainer';
import EventBus from '../components/editor/EventBus';

export default {
    props: ['scheme', 'width', 'height'],

    components: {SvgEditor},

    data() {
        return {
            schemeContainer: new SchemeContainer(this.scheme, EventBus),
        }
    }
}
</script>