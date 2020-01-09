import shortid from 'shortid';
import _ from 'lodash';
import AnimationRegistry from '../../../animations/AnimationRegistry';

const PI_2 = Math.PI * 2.0;

function _enrichDomElement(element, args, childElements) {
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
}

function svg(name, args, childElements) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    _enrichDomElement(element, args, childElements);
    return element;
}

function html(name, args, childElements) {
    const element = document.createElement(name);
    _enrichDomElement(element, args, childElements);
    return element;
}

class ParticleEffectAnimation {
    constructor(connector, args) {
        this.connector = connector;
        this.args = args;
        this.domContainer = null;
        this.domConnectorPath = null;
        this.particles = [];
        this.timeToNextParticle = 0.0;
        this.particlesLeft = args.particlesCount;
        this.totalPathLength = 0;
        this.growthDistance = args.growthDistance;
        this.declineDistance = args.declineDistance;
        this.id = shortid.generate();
        this.cleanupDomElements = [];
    }

    // is invoked before playing. must return status whether it has succeeded initializing animation elements
    init() {
        this.domContainer = document.getElementById(`animation-container-connector-${this.connector.id}`);
        this.domConnectorPath = document.getElementById(`connector-${this.connector.id}-path`);

        if (!this.domContainer || !this.domConnectorPath) {
            return false;
        }
        
        this.totalPathLength = this.domConnectorPath.getTotalLength();
        const midPath = this.totalPathLength/2;
        this.growthDistance = Math.min(this.growthDistance, midPath);
        this.declineDistance = Math.min(this.declineDistance, midPath);

        const graidentDefs = svg('defs', {});
        graidentDefs.innerHTML = `
            <radialGradient id="animation-particle-effect-gradient-${this.id}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style="stop-color:${this.args.color};
            stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.args.color};stop-opacity:0" />
            </radialGradient>
        `;
        this.domContainer.appendChild(graidentDefs);
        this.cleanupDomElements.push(graidentDefs);

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
                this.playParticle(this.particles[i], dt);
            }
        }
        return true;
    }

    createParticle() {
        const point = this.domConnectorPath.getPointAtLength(0);
        const domParticle = this.createParticleDom(this.args.particleType, this.args.particleSize, this.args.color);
        domParticle.setAttribute('transform', `translate(${point.x} ${point.y})`);
        this.domContainer.appendChild(domParticle);
        
        let floatAngle = 0;
        if (this.args.floatRadius > 0) {
            floatAngle = Math.random() * PI_2;
        }

        let floatAngleDirection = 1;
        if (Math.random() >= 0.5) {
            floatAngleDirection = -1;
        }

        this.particles.push({
            pathPosition: 0.0,
            domParticle,
            floatAngle,
            floatAngleDirection
        });

        this.particlesLeft -= 1;
    }

    playParticle(particle, dt) {
        const point = this.domConnectorPath.getPointAtLength(particle.pathPosition);
        let x = point.x;
        let y = point.y;

        if (this.args.floatRadius > 0) {
            particle.floatAngle += particle.floatAngleDirection * this.args.speed * dt / 50000.0;
            if (particle.floatAngle > PI_2) {
                particle.floatAngle -= PI_2;
            }
            x = point.x + this.args.floatRadius * Math.cos(particle.floatAngle);
            y = point.y + this.args.floatRadius * Math.sin(particle.floatAngle);
        }

        let scale = 1.0;
        if (particle.pathPosition < this.growthDistance && this.growthDistance >= 1.0) {
            scale = Math.max(0, Math.min(1.0, 1.0 - (this.growthDistance - particle.pathPosition) / this.growthDistance));
        } else if (particle.pathPosition > this.totalPathLength - this.declineDistance && this.declineDistance >= 1.0) {
            scale = Math.max(0, Math.min(1.0, (this.totalPathLength - particle.pathPosition) / this.declineDistance));
        }

        particle.domParticle.setAttribute('transform', `translate(${x} ${y}) scale(${scale} ${scale})`);
    }

    // invoked when animation is instructed to remove its elements from dom.
    destroy() {
        _.forEach(this.particles, particle => {
            this.domContainer.removeChild(particle.domParticle);
        });

        _.forEach(this.cleanupDomElements, domElement => {
            this.domContainer.removeChild(domElement);
        });

        this.cleanupDomElements = [];
    }

    createParticleDom(type, size, color) {
        if (type === 'circle') {
            return svg('circle', { cx: 0, cy: 0, r: size / 2, fill: color});
        } else if (type === 'message') {
            const icon = html('i', {class: 'fas fa-envelope', style: `color: ${color}; font-size: ${Math.floor(size)}px;`});
            const particle = svg('foreignObject', { width: 100, height: 100, x: -size/2, y: -size/2 }, [icon]);
            const rect = icon.getBoundingClientRect();
            if (rect) {
                particle.setAttribute('x', -rect.width/2);
                particle.setAttribute('y', -rect.height/2);
            }
            return particle;
        } else {
            return svg('circle', { cx: 0, cy: 0, r: size / 2, fill: `url(#animation-particle-effect-gradient-${this.id})`});
        }
    }

}

export default {
    name: 'Particle Effect',
    args: {
        particleType:   {name: 'Particle Type',     type: 'choice', value: 'blur-circle', options: [
            'blur-circle', 'circle', 'rect', 'message'
        ]},
        particleSize:   {name: 'Particle Size',     type: 'number', value: 10},
        color:          {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        speed:          {name: 'Speed',             type: 'number', value: 60},
        particlesCount: {name: 'Particles',         type: 'number', value: 1},
        offsetTime:     {name: 'Offset time (sec)', type: 'number', value: 0.5},
        growthDistance: {name: 'Growth Distance',   type: 'number', value: 30},
        declineDistance:{name: 'Decline Distance',  type: 'number', value: 30},
        floatRadius:    {name: 'Float Radius',      type: 'number', value: 5}
    },

    execute(connector, args) {
        if (connector) {
            AnimationRegistry.play(new ParticleEffectAnimation(connector, args))
        }
    }
};