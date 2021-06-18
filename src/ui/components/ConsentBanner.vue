<template>
    <div class="consent-banner">

        <div class="consent-banner-wrapper">
            <div class="consent-banner-container">
                We use cookies to make Schemio work. By using our site, you agree to our <a href="/terms-of-service">terms of service</a>
                <span class="btn btn-primary" @click="agreeAllAndSave">Agree All &amp; Save</span>
                <span class="btn btn-secondary" @click="onManageOptionsClicked()">Manage Options</span>
            </div>
        </div>

        <modal title="Privacy Preference" v-if="showPreferenceModal" @close="showPreferenceModal = false"
            :maxHeight="300"
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
    </div>
</template>

<script>
import utils from '../utils';
import forEach from 'lodash/forEach';

import {privacyConsent, saveConsent} from '../privacy';
import Modal from './Modal.vue';



export default {
    components: {Modal},

    data() {
        return {
            showPreferenceModal: false,
            privacyConsent: utils.clone(privacyConsent)
        };
    },

    methods: {
        onManageOptionsClicked() {
            this.showPreferenceModal = true;
        },
        
        onConsentChange(consentId, isAllowed) {
            this.privacyConsent[consentId].allowed = isAllowed;
        },

        agreeAllAndSave() {
            forEach(this.privacyConsent, pc => {
                pc.allowed = true;
            });
            saveConsent(this.privacyConsent);
            this.$emit('close');
        },

        confirmChoice() {
            saveConsent(this.privacyConsent);
            this.$emit('close');
        }
    }
}
</script>