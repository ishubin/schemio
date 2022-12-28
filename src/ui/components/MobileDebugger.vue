<template>
    <modal title="Mobile Debugger" @close="$emit('close')">
    </modal>
</template>

<script>
import utils from '../utils';
import Modal from './Modal.vue';


export default {
    components: {Modal},

    data() {
        return {
            logEntries: utils.clone(logEntries),
        };
    }
};
</script>