<template>
    <modal title="Change Log" @close="$emit('close')">
        <div class="diff-change-log">
            <div v-for="change in changes" class="diff-change-log-entry" :class="[`diff-change-${change.changeType}`]">
                <span v-if="change.itemId"><i class="fas fa-cube"></i> {{change.name}}</span>
                <ul v-if="change.changeType === 'modification'">
                    <li v-for="mod in change.modifications">
                        <i class="fas fa-cog"></i> {{mod.propertyName}}
                    </li>
                </ul>
            </div>
        </div>
    </modal>
</template>

<script>
import { ChangeType } from '../../scheme/scheme-diff';
import forEach from 'lodash/forEach';
import utils from '../../utils';
import Modal from '../Modal.vue';

export default {
    components: { Modal },

    props: ['changeLog'],

    data() {
        const changes = utils.clone(this.changeLog);
        forEach(changes, change => {
            if (change.change === ChangeType.DELETION) {
                change.changeType = 'deletion';
            } else if (change.change === ChangeType.ADDITION) {
                change.changeType = 'addition';
            } else {
                change.changeType = 'modification';

                forEach(change.modifications, mod => {
                    mod.propertyName = mod.path.join('.');
                });
            }
        })

        return {
            changes,
        }
    }
}
</script>