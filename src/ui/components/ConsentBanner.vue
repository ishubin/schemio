<template>
    <div class="consent-banner">

        <div class="consent-banner-wrapper">
            <div class="consent-banner-container">
                We use cookies to make Schemio work. By using our site, you agree to our <a href="/terms-of-service">terms of service</a>
                <span class="btn btn-primary" @click="agreeAllAndSave">Agree All &amp; Save</span>
                <span class="btn btn-secondary" @click="onManageOptionsClicked()">Manage Options</span>
            </div>
        </div>

        <consent-modal v-if="showPreferenceModal" @close="showPreferenceModal = false"/>
    </div>
</template>

<script>
import utils from '../utils';
import forEach from 'lodash/forEach';

import {privacyConsent, saveConsent} from '../privacy';
import ConsentModal from './ConsentModal.vue';
import StoreUtils from '../store/StoreUtils';


export default {
    components: {ConsentModal},

    data() {
        return {
            showPreferenceModal: false,
        };
    },

    methods: {
        onManageOptionsClicked() {
            this.showPreferenceModal = true;
        },
        
        agreeAllAndSave() {
            const pcs = utils.clone(privacyConsent);
            forEach(pcs, pc => {
                pc.allowed = true;
            });
            saveConsent(pcs);
            StoreUtils.giveConsent(this.$store);
        },

    }
}
</script>