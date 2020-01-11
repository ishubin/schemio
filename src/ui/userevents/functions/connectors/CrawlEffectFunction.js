import AnimationRegistry from '../../../animations/AnimationRegistry';
import Animation from '../../../animations/Animation';


class CrawlEffectAnimation extends Animation {
    constructor(connector, args) {
        super();
        this.connector = connector;
        this.args = args;
        this.domContainer = null;
        this.domConnectorPath = null;
        this.domAnimationPath = null;

        this.time = 0.0;
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-connector-${this.connector.id}`);
        this.domConnectorPath = document.getElementById(`connector-${this.connector.id}-path`);

        if (!this.domContainer || !this.domConnectorPath) {
            return false;
        }

        const pathText = this.domConnectorPath.getAttribute('d');
        
        this.domAnimationPath = this.svg('path', {
            'd': pathText,
            'stroke-width': this.args.strokeWidth || 1,
            'stroke': this.args.color,
            'fill': 'none',
            'stroke-linejoin': 'round',
            'stroke-dasharray': this.args.length
        });

        this.domContainer.appendChild(this.domAnimationPath);
        return true;
    }

    play(dt) {
        this.time += dt;
        this.domAnimationPath.setAttribute('stroke-dashoffset', Math.floor(-this.time * this.args.speed / 1000.0));

        if (this.time > this.args.duration * 1000.0) {
            return false;
        }
        return true;
    }

    destroy() {
        this.domContainer.removeChild(this.domAnimationPath);
    }
}

export default {
    name: 'Crawl Effect',
    args: {
        length:         {name: 'Length',            type: 'number', value: 10},
        color:          {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        speed:          {name: 'Speed',             type: 'number', value: 60},
        duration:       {name: 'Duration (sec)',    type: 'number', value: 2.0},
        strokeWidth:    {name: 'Stroke Width',      type: 'number', value: 3}
    },

    execute(connector, args) {
        if (connector) {
            AnimationRegistry.play(new CrawlEffectAnimation(connector, args))
        }
    }
};