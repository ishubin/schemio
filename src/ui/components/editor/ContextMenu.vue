<template>
    <div class="context-menu">
        <ul ref="rootContextMenu" :style="{'top': `${y}px`, 'left': `${x}px`}">
            <li v-for="(option, optionIndex) in options" @click="onOptionSelected(option)">
                <span class="context-menu-suboptions-icon">
                    <i v-if="option.subOptions" class="fas fa-caret-right"/>
                </span>

                <i v-if="option.iconClass" :class="option.iconClass"/>
                <span class="context-menu-option-name">{{option.name}}</span>


                <ul v-if="option.subOptions" :style="subOptionsStyle(optionIndex, option.subOptions)">
                    <li v-for="subOption in option.subOptions" @click="onOptionSelected(subOption)">
                        <i v-if="subOption.iconClass" :class="subOption.iconClass"/>
                        <span class="context-menu-option-name">{{subOption.name}}</span>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>

<script>
import shortid from 'shortid';
import utils from '../../utils';

export default {
    props: ['mouseX', 'mouseY', 'options'],

    mounted() {
        document.body.addEventListener('mousedown', this.onDocumentClick);

        const rect = this.$refs.rootContextMenu.getBoundingClientRect();
        const overlapX = rect.right - window.innerWidth;
        const overlapY = rect.bottom - window.innerHeight;

        this.menuWidth = rect.width;
        this.menuHeight = rect.height;

        if (overlapX > 0) {
            this.x -= overlapX;
        }
        if (overlapY > 0) {
            this.y -= overlapY;
        }
    },

    beforeDestroy() {
        document.body.removeEventListener('mousedown', this.onDocumentClick);
    },

    data() {
        return {
            domId: shortid.generate(),
            x: this.mouseX,
            y: this.mouseY,
            menuWidth: 100,
            menuHeight: 100,
            mountTime: new Date().getTime()
        }
    },

    methods: {
        onDocumentClick(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.classList.contains('context-menu'))) {
                if (new Date().getTime() - this.mountTime > 500) {
                    setTimeout(() => {
                        this.$emit('close');
                    }, 100);
                }
            }
        },

        onOptionSelected(option) {
            if (!option.subOptions) {
                this.$emit('selected', option);
                this.$emit('close');
            }
        },

        subOptionsStyle(parentIndex, subOptions) {
            const style = {
                left: `${this.menuWidth - 4}px`,
                'min-width': `${this.menuWidth}px`
            };

            // calculcating approximate single option height
            // so that we can estimate the total height of the sub options menu
            const optionHeight = this.menuHeight / this.options.length;

            const subOptionsHeight = subOptions.length * optionHeight;
            const subOptionsX = this.x + this.menuWidth;
            const subOptionsY = parentIndex * optionHeight + this.y;
            
            const overlapX = subOptionsX + this.menuWidth - window.innerWidth;
            const overlapY = subOptionsY + subOptionsHeight - window.innerHeight;
            if (overlapY > 0) {
                style['top'] = `${-overlapY}px`;
            }

            if (overlapX > 0) {
                style['left'] = `${-this.menuWidth + 4}px`;
            }

            return style;
        }
    }

}
</script>