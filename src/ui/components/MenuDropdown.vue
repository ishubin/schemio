<template>
    <div class="menu-dropdown" :id="uid">
        <span class="icon-button" @click="toggleMenu"><i v-if="iconClass" :class="iconClass"></i> {{name}}</span>
        <ul v-if="menuDisplayed">
            <li v-for="option in options">
                <span @click="onOptionClicked(option)"><i v-if="option.iconClass" :class="option.iconClass"></i> {{option.name}}</span>
            </li>
        </ul>
    </div>
</template>

<script>
import shortid from 'shortid';

export default {

    /**
     * options: [{name: 'Option name', iconClass: 'fa fa-link', event: 'option-clicked'}]
     */
    props: ['name', 'iconClass', 'options'],

    mounted() {
        document.body.addEventListener('click', this.onBodyClick);
    },

    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
    },

    data() {
        return {
            uid: `menu-dropdown-${shortid.generate()}`,
            menuDisplayed: false
        };
    },

    methods: {
        toggleMenu() {
            this.menuDisplayed = !this.menuDisplayed;
        },

        onOptionClicked(option) {
            this.menuDisplayed = false;
            this.$emit(option.event);
        },

        onBodyClick(event) {
            if (this.menuDisplayed === true) {
                if (event.srcElement && event.srcElement.closest(`#${this.uid}`)) {
                    return;
                }
                this.menuDisplayed = false;
            }

        }
    }
}
</script>