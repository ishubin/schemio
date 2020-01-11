import _ from 'lodash';
import AnimationRegistry from '../../../animations/AnimationRegistry';
import Animation from '../../../animations/Animation';


class CrawlEffectAnimation extends Animation {
    constructor(connector, args) {
        super();
        this.connector = connector;
        this.args = args;
        this.domContainer = null;
        this.domConnectorPath = null;
        this.originalPathDomAttributes = {};
        this.animationDomAttributes = {
            'stroke-dasharray': this.args.length,
            'stroke-dashoffset': 0,
            'stroke-width': this.args.strokeWidth || 1,
            'stroke': this.args.color,
            'fill': 'none',
            'stroke-linejoin': 'round',
        };
        this.time = 0.0;
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-connector-${this.connector.id}`);
        this.domConnectorPath = document.getElementById(`connector-${this.connector.id}-path`);

        if (!this.domContainer || !this.domConnectorPath) {
            return false;
        }

        _.forEach(this.domConnectorPath.getAttributeNames(), attrName => {
            this.originalPathDomAttributes[attrName] = this.domConnectorPath.getAttribute(attrName);
        });
        
        _.forEach(this.animationDomAttributes, (value, name) => {
            this.domConnectorPath.setAttribute(name, value);
        });
        return true;
    }

    play(dt) {
        this.time += dt;
        this.domConnectorPath.setAttribute('stroke-dashoffset', Math.floor(-this.time * this.args.speed / 1000.0));

        if (this.time > this.args.duration * 1000.0) {
            return false;
        }
        return true;
    }

    destroy() {
        _.forEach(this.animationDomAttributes, (value, name) => {
            this.domConnectorPath.removeAttribute(name);
        });
        _.forEach(this.originalPathDomAttributes, (value, name) => {
            this.domConnectorPath.setAttribute(name, value);
        });
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
            AnimationRegistry.play(new CrawlEffectAnimation(connector, args), connector.id);
        }
    }
};