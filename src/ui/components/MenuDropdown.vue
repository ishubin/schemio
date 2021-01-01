<template>
    <div class="menu-dropdown" :id="uid">
        <div ref="menuTitle" class="menu-dropdown-title">
            <span v-if="iconClass" class="icon-button" @click="toggleMenu"><i :class="iconClass"></i> {{name}}</span>
            <span v-else class="link" @click="toggleMenu">{{name}} <i class="fas fa-caret-down"></i></span>
        </div>
        <ul ref="menuList" v-if="menuDisplayed" :style="{'top': `${y}px`, 'left': `${x}px`}">
            <li v-for="option in options">
                <a v-if="option.link" :href="option.link">{{option.name}}</a>
                <span v-else @click="onOptionClicked(option)"><i v-if="option.iconClass" :class="option.iconClass"></i> {{option.name}}</span>
            </li>
        </ul>
    </div>
</template>

<script>
import shortid from 'shortid';

export default {

    /**
     * options: [{name: 'Option name', iconClass: 'fa fa-link', event: 'option-clicked'}]
     * or
     * options: [{name: 'Option name', link: '/path/to/link'}]
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
            menuDisplayed: false,
            x:0, y:0 // coords for the menu dropdown list, it will be calculated based on where the menu title is
        };
    },

    methods: {
        toggleMenu() {
            if (this.menuDisplayed) {
                // closing menu
                this.menuDisplayed = false;
                return;
            }
            // opening menu
            this.menuDisplayed = true;
            this.$nextTick(() => this.readjustDropdownOnScreen())
        },

        readjustDropdownOnScreen() {
            const titleRect = this.$refs.menuTitle.getBoundingClientRect();
            const menuRect = this.$refs.menuList.getBoundingClientRect();

            const width = menuRect.width;
            const height = menuRect.height;
            let originalX = Math.max(0, titleRect.x);
            let originalY = Math.max(0, titleRect.bottom);

            let rightSide = originalX + width;
            let bottomSide = originalY + height + this.searchTextfieldHeight;
            if (rightSide > window.innerWidth) {
                this.x = originalX + window.innerWidth - rightSide;
            } else {
                this.x = originalX;
            }

            if (bottomSide > window.innerHeight) {
                this.y = titleRect.top - height;
            } else {
                this.y = originalY;
            }
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