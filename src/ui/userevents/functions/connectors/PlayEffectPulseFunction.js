import shortid from 'shortid';
import _ from 'lodash';
import AnimationRegistry from '../../../animations/AnimationRegistry';


function svg(name, args, childElements) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    if (args) {
        _.forEach(args, (value, argName) => {
            element.setAttribute(argName, value);
        })
    }

    if (childElements) {
        _.forEach(childElements, childElement => {
            element.appendChild(childElement);
        })
    }
    return element;
}

class PulseEffectAnimation {
    constructor(connector, [particleSize, color, speed, particlesCount, offsetTime]) {
        this.connector = connector;
        this.domContainer = null;
        this.domConnectorPath = null;
        this.particles = [];
        this.timeToNextParticle = 0.0;
        this.particlesLeft = particlesCount;
        this.totalPathLength = 0;
        this.id = shortid.generate();
        this.args = { particleSize, color, speed, particlesCount, offsetTime };
    }

    // is invoked before playing. must return status whether it has succeeded initializing animation elements
    init() {
        this.domContainer = document.getElementById(`animation-container-connector-${this.connector.id}`);
        this.domConnectorPath = document.getElementById(`connector-${this.connector.id}-path`);

        if (!this.domContainer || !this.domConnectorPath) {
            return false;
        }
        
        this.totalPathLength = this.domConnectorPath.getTotalLength();


        // this.domContainer.appendChild(svg('defs', {}, [
        //     svg('filter', {id: `blur-filter-${this.id}`}, [
        //         svg('feGaussianBlur', {
        //             in: 'SourceGraphic',
        //             stdDeviation: '2'
        //         })
        //     ])
        // ]));
        return true;
    }

    // returns true or false whether animation should proceed. in case it returns false - it means that animation has finished and it will invoke destroy function
    play(dt) {
        if (this.particles.length === 0 && this.particlesLeft <= 0) {
            return false;
        }

        if (this.particlesLeft > 0) {
            this.timeToNextParticle -= dt;
            if (this.timeToNextParticle <= 0.0) {
                this.timeToNextParticle = this.args.offsetTime * 1000.0;
                this.createParticle();
            }
        }
        
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].pathPosition += this.args.speed * dt / 1000.0;
            if (this.particles[i].pathPosition > this.totalPathLength) {
                this.domContainer.removeChild(this.particles[i].domParticle);
                this.particles.splice(i, 1);
                i = i - 1;
            } else {
                const point = this.domConnectorPath.getPointAtLength(this.particles[i].pathPosition);

                this.particles[i].domParticle.setAttribute('cx', point.x);
                this.particles[i].domParticle.setAttribute('cy', point.y);
            }
        }

        return true;
    }

    // invoked when animation is instructed to remove its elements from dom.
    destroy() {
        console.error('not implemented yet');
    }

    createParticle() {
        const point = this.domConnectorPath.getPointAtLength(0);
        const domParticle = svg('circle', {
            cx: point.x,
            cy: point.y,
            r: this.args.particleSize / 2,
            fill: this.args.color,
            // style: `filter: url(#blur-filter-${this.id});`
        });

        this.domContainer.appendChild(domParticle);

        this.particles.push({
            pathPosition: 0.0,
            domParticle
        });

        this.particlesLeft -= 1;
    }
}

export default {
    name: 'Play Pulse Effect',
    args: [
        {name: 'Particle Size',     type: 'number', value: 10},
        {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        {name: 'Speed',             type: 'number', value: 60},
        {name: 'Particles',         type: 'number', value: 1},
        {name: 'Offset time (sec)', type: 'number', value: 0.5},
    ],

    execute(connector, args) {
        if (connector) {
            AnimationRegistry.play(new PulseEffectAnimation(connector, args))
        }
    }
};