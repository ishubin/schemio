<template>
    <div class="quick-helper-panel-wrapper">
        <div class="quick-helper-panel">
            <div v-if="currentPanel === 'curve-edit-helper'" class="quick-helper-panel-section">
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
        EventBus.$on(EventBus.CURVE_EDITED, this.onCurveEdited);
        EventBus.$on(EventBus.CANCEL_CURRENT_STATE, this.onCurrentStateCanceled);
    },

    beforeDestroy() {
        EventBus.$off(EventBus.CURVE_EDITED, this.onCurveEdited);
        EventBus.$off(EventBus.CANCEL_CURRENT_STATE, this.onCurrentStateCanceled);
    },

    data() {
        return {
            currentPanel: null
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
        onCurveEdited() {
            this.showTopHelperCurveEdit();
        },

        showTopHelperCurveEdit() {
            this.currentPanel = 'curve-edit-helper';
        },

        stopEditCurve() {
            EventBus.$emit(EventBus.CURVE_EDIT_STOPPED);
        },

        onCurrentStateCanceled(stateName) {
            if (stateName === 'edit-curve') {
                this.currentPanel = null;
            }
        },
    },

    computed: {
        curveEditAutoAttachEnabled() {
            return this.$store.getters.curveEditAutoAttachEnabled;
        }
    }
}
</script>