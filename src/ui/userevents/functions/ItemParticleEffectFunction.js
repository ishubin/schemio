import _ from 'lodash';
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';

const PI_2 = Math.PI * 2.0;

function calculateCenterOfPath(svgPath) {
    const totalPathLength = svgPath.getTotalLength();

    let x = 0, y = 0;

    for(let i = 0; i < 10; i++) {
        const p = svgPath.getPointAtLength(totalPathLength * i / 10);
        x += p.x;
        y += p.y;
    }

    return {
        x: x/10,
        y: y/10
    }
}


class ItemParticleEffectAnimation extends Animation {
    constructor(item, args, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.resultCallback = resultCallback;
        this.domContainer = null;
        this.domItemPath = null;
        this.particles = [];

        this.generatorCounter = 0.0;
        this.particlesLeft = this.args.particlesCount;
        this.cleanupDomElements = [];
        this.totalPathLength = 0.0;
        this.singleParticleBirthTime = this.args.birthTime / Math.max(1, this.args.particlesCount);
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-${this.item.id}`);
        this.domItemPath = document.getElementById(`item-svg-path-${this.item.id}`);

        if (!this.domContainer || !this.domItemPath) {
            return false;
        }
        
        this.totalPathLength = this.domItemPath.getTotalLength();
        this.center = calculateCenterOfPath(this.domItemPath);


        const graidentDefs = this.svg('defs', {});
        graidentDefs.innerHTML = `
            <radialGradient id="animation-particle-effect-gradient-${this.id}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style="stop-color:${this.args.color};stop-opacity:1" />
            <stop offset="25%" style="stop-color:${this.args.color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.args.color};stop-opacity:0" />
            </radialGradient>
        `;
        this.domContainer.appendChild(graidentDefs);
        this.cleanupDomElements.push(graidentDefs);

        return true;
    }

    play(dt) {
        if (this.particles.length === 0 && this.particlesLeft <= 0) {
            return false;
        }

        if (this.particlesLeft > 0) {
            if (this.singleParticleBirthTime > 0.0001) {
                this.generatorCounter += dt / (this.singleParticleBirthTime * 1000.0);
                if (this.generatorCounter >= 1.0) {
                    const roundedCounter = Math.floor(this.generatorCounter);
                    this.generatorCounter -= roundedCounter;

                    const toGenerate = Math.min(this.particlesLeft, roundedCounter);
                    for (let i = 0; i < toGenerate; i++) {
                        this.particlesLeft -= 1;
                        this.createParticle();
                    }
                }
            } else {
                while(this.particlesLeft > 0) {
                    this.particlesLeft -= 1;
                    this.createParticle();
                }
            }
        }
        
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].lifeTime > this.args.lifeTime) {
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
        let pathPosition = 0;
        if (!this.args.travelAlongPath) {
            pathPosition = Math.random() * this.totalPathLength;
        }
        const position = this.domItemPath.getPointAtLength(pathPosition);
        const domParticle = this.createParticleDom(this.args.particleType, this.args.particleSize, this.args.color);
        domParticle.setAttribute('transform', `translate(${position.x} ${position.y})`);
        this.domContainer.appendChild(domParticle);

        const particle = {
            lifeTime: 0.0,
            domParticle,
            position,
        };

        if (this.args.travelAlongPath) {
            if (this.args.travelFloatRadius > 0) {
                particle.floatAngle = Math.random() * PI_2;
            }

            let floatAngleDirection = 1;
            if (Math.random() >= 0.5) {
                floatAngleDirection = -1;
            }
            particle.floatAngleDirection = floatAngleDirection;
        } else {
            const direction = {x: 0, y: 0};
            direction.x = position.x - this.center.x;
            direction.y = position.y - this.center.y;
            const d = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
            if (d > 0.0001) {
                direction.x = direction.x / d;
                direction.y = direction.y / d;
            }
            particle.direction = direction;
        }
        this.particles.push(particle);

        this.particlesLeft -= 1;
    }

    playParticle(particle, dt) {
        particle.lifeTime += dt/1000.0;

        if (this.args.travelAlongPath) {
            let maxLifeTime = this.args.lifeTime;
            if (maxLifeTime < 0.1) {
                maxLifeTime = 1.0;
            }
            const point = this.domItemPath.getPointAtLength(this.totalPathLength * particle.lifeTime / maxLifeTime);
            let x = point.x;
            let y = point.y;

            if (this.args.travelFloatRadius > 0) {
                particle.floatAngle += particle.floatAngleDirection * this.args.travelFloatSpeed * dt / (1000 * this.args.lifeTime);
                if (particle.floatAngle > PI_2) {
                    particle.floatAngle -= PI_2;
                }
                x = point.x + this.args.travelFloatRadius * Math.cos(particle.floatAngle);
                y = point.y + this.args.travelFloatRadius * Math.sin(particle.floatAngle);
            }

            particle.position.x = x;
            particle.position.y = y;

        } else {
            particle.position.x += particle.direction.x * this.args.speed * dt / 1000.0;
            particle.position.y += particle.direction.y * this.args.speed * dt / 1000.0;
        }
            
        

        let scale = 1.0;
        let opacity = 1;

        if (this.args.lifeTime > 0.0) {
            const lifeTimePercent = 100.0 * particle.lifeTime / this.args.lifeTime
            if (lifeTimePercent < this.args.fadeIn) {
                opacity = lifeTimePercent / this.args.fadeIn;
            } else if (lifeTimePercent > this.args.fadeOut && this.args.fadeOut < 99.999) {
                opacity = (100 - lifeTimePercent) / (100 - this.args.fadeOut);
            }

            if (lifeTimePercent < this.args.growth) {
                scale = lifeTimePercent / this.args.growth;
            } else if (lifeTimePercent > this.args.decline && this.args.decline < 99.999) {
                scale = (100 - lifeTimePercent) / (100 - this.args.decline);
            }
        }
        
        particle.domParticle.setAttribute('style', `opacity: ${opacity}`);
        particle.domParticle.setAttribute('transform', `translate(${particle.position.x} ${particle.position.y}) scale(${scale} ${scale})`);
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
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
            return this.svg('circle', { cx: 0, cy: 0, r: size / 2, fill: color});
        } else if (type === 'rect') {
            return this.svg('rect', {x: -size/2, y: -size/2, width: size, height: size, fill: color, stroke: 'none'});
        } else if (type === 'message') {
            const icon = this.html('i', {class: 'fas fa-envelope', style: `color: ${color}; font-size: ${Math.floor(size)}px;`});
            const particle = this.svg('foreignObject', { width: 100, height: 100, x: -size/2, y: -size/2 }, [icon]);
            const rect = icon.getBoundingClientRect();
            if (rect) {
                particle.setAttribute('x', -rect.width/2);
                particle.setAttribute('y', -rect.height/2);
            }
            return particle;
        } else {
            return this.svg('circle', { cx: 0, cy: 0, r: size / 2, fill: `url(#animation-particle-effect-gradient-${this.id})`});
        }
    }

}

export default {
    name: 'Particle Effect',
    args: {
        particleType:   {name: 'Particle Type',     type: 'choice', value: 'spot', options: [
            'spot', 'circle', 'rect', 'message'
        ]},
        particlesCount    : {name: 'Particles',         type: 'number', value: 100},
        particleSize      : {name: 'Particle Size',     type: 'number', value: 10},
        color             : {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        speed             : {name: 'Speed',             type: 'number', value: 60, depends: {travelAlongPath: false}},
        lifeTime          : {name: 'Life Time (sec)',   type: 'number', value: 1.0},
        birthTime         : {name: 'Birth time (sec)',  type: 'number', value: 0.1, description: 'Time in which it should generate all particles'},
        growth            : {name: 'Growth to (%)',     type: 'number', value: 0.1},
        decline           : {name: 'Decline from (%)',  type: 'number', value: 0.1},
        fadeIn            : {name: 'Fade in (%)',       type: 'number', value: 1},
        fadeOut           : {name: 'Fade out (%)',      type: 'number', value: 50},
        travelAlongPath   : {name: 'Travel Along Path', type: 'boolean',value: false, description: 'The particle emits in the beggining of the path and travels along the path'},
        travelFloatRadius : {name: 'Travel Float Radius',type: 'number', value: 5, depends: {travelAlongPath: true}},
        travelFloatSpeed  : {name: 'Travel Float Speed',type: 'number', value: 10, depends: {travelAlongPath: true}},
        inBackground      : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            AnimationRegistry.play(new ItemParticleEffectAnimation(item, args, resultCallback), item.id);
        }
        if (this.args.inBackground) {
            resultCallback();
        }
    }
}