<template>
    <div class="item-tooltip" :style="tooltipStyle" data-type="item-tooltip">
        <h2>{{item.name}}</h2>
        <div v-html="sanitizedItemDescription"></div>
    </div>
</template>

<script>
import htmlSanitize from '../../htmlSanitize';
export default {
    props: ['item', 'x', 'y'],

    mounted() {
        this.timeMounted = new Date().getTime();
        document.body.addEventListener('click', this.onBodyClick);
    },
    beforeDestroy() {
        document.body.removeEventListener('click', this.onBodyClick);
    },
    data() {
        const maxWidth      = Math.min(400, window.innerWidth - 60);
        const maxHeight     = Math.min(500, window.innerHeight - 60);

        const leftOverlap   = Math.min(0, window.innerWidth - this.x - maxWidth);
        const topOverlap    = Math.min(0, window.innerHeight - this.y - maxHeight);

        return {
            timeMounted:    0,
            positionLeft:   this.x + leftOverlap,
            positionTop:    this.y + topOverlap,
            maxWidth:       maxWidth,
            maxHeight:      maxHeight  
        };
    },

    methods: {
        onBodyClick(event) {
            //checking whether there is a race condition and 
            // this is the initial click event that led to opening of a tooltip
            if (new Date().getTime() - this.timeMounted > 200)  {
                // checking whether user clicked inside tooltip or not
                if (!this.isInsideTooltip(event.srcElement)) {
                    this.$emit('close');
                }
            }
        },

        isInsideTooltip(domElement) {
            if (domElement.getAttribute('data-type') === 'item-tooltip') {
                return true;
            } else if (domElement.parentElement) {
                return this.isInsideTooltip(domElement.parentElement);
            }
            return false;
        }
    },

    computed: {
        tooltipStyle() {
            return {
                'left':         this.positionLeft + 'px',
                'top':          this.positionTop + 'px',
                'background':   '#eee',
                'padding':      '10px',
                'max-width':    `${this.maxWidth}px`,
                'max-height':   `${this.maxHeight}px`
            };
        },
        sanitizedItemDescription() {
            return htmlSanitize(this.item.description);
        }
    }
}
</script>