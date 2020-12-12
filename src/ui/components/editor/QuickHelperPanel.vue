<template>
    <div class="quick-helper-panel-wrapper">
        <div class="quick-helper-panel">
            <div v-if="currentStatePanel === 'curve-edit-helper'" class="quick-helper-panel-section">
                <input type="checkbox" :checked="curveEditAutoAttachEnabled" @input="onCurveEditAutoAttachClicked" id="chk-curve-edit-auto-attach"/>
                <label for="chk-curve-edit-auto-attach"> Auto-Attach</label>
                <span @click="stopEditCurve" class="btn btn-small btn-primary">Stop Edit</span>
            </div>
        </div>
    </div>
</template>


<script>
import EventBus from './EventBus';

export default {
    beforeMount() {
        EventBus.$on(EventBus.EDITOR_STATE_CHANGED, this.onEditorStateChanged);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.EDITOR_STATE_CHANGED, this.onEditorStateChanged);
    },

    data() {
        return {
            currentStatePanel: null
        };
    },

    methods: {
        onCurveEditAutoAttachClicked(event) {
            if (event.target.checked) {
                this.$store.dispatch('enableCurveEditAutoAttach');
            } else {
                this.$store.dispatch('disableCurveEditAutoAttach');
            }
        },

        onEditorStateChanged(stateName) {
            if (stateName === 'edit-curve') {
                this.currentStatePanel = 'curve-edit-helper';
            } else {
                this.currentStatePanel = null;
            }
        },

        stopEditCurve() {
            EventBus.$emit(EventBus.CURVE_EDIT_STOPPED);
        },
    },

    computed: {
        curveEditAutoAttachEnabled() {
            return this.$store.getters.curveEditAutoAttachEnabled;
        }
    }
}
</script>