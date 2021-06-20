<template>
    <modal title="Privacy Preference" @close="$emit('close')"
        :maxHeight="300"
        :useMask="true"
        secondaryButton="Confirm Choice"
        secondaryButtonStyle="btn-primary"
        primaryButton="Agree All &amp; Save"
        @secondary-submit="confirmChoice"
        @primary-submit="agreeAllAndSave"
        >
        <h2>Our use of cookies</h2>

        We use cookies, unique identifiers and other device data to make Schemio work. 

        <div class="consent-section" v-for="(pc, pcId) in privacyConsent">
            <h3>{{pc.name}}</h3>
            <input class="consent-allow" type="checkbox" :checked="pc.allowed" @input="onConsentChange(pcId, arguments[0].target.checked)" :disabled="pc.mandatory"/>

            <p v-html="pc.description"></p>
        </div>
    </modal>
</template>


<script>
import utils from '../utils';
import forEach from 'lodash/forEach';
import { privacyConsent, saveConsent, hasConsent } from '../privacy';
import Modal from './Modal.vue';
import StoreUtils from '../store/StoreUtils';


export default {
    components: { Modal },

    data() {
        const pcs = utils.clone(privacyConsent);

        forEach(pcs, pc => {
            pc.allowed = hasConsent(pc.id)
        });

        return {
            privacyConsent: pcs
        };
    },

    methods: {
        onConsentChange(consentId, isAllowed) {
            this.privacyConsent[consentId].allowed = isAllowed;
        },

        agreeAllAndSave() {
            forEach(this.privacyConsent, pc => {
                pc.allowed = true;
            });
            saveConsent(this.privacyConsent);
            StoreUtils.giveConsent(this.$store);
            this.$emit('close');
        },

        confirmChoice() {
            saveConsent(this.privacyConsent);
            StoreUtils.giveConsent(this.$store);
            this.$emit('close');
        }

    },
}
</script>