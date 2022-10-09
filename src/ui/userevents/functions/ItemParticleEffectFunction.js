/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';
import AnimationRegistry from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import Shape from '../../components/editor/items/shapes/Shape';
import { worldPointOnItem } from '../../scheme/SchemeContainer';
import myMath from '../../myMath';
import EventBus from '../../components/editor/EventBus';

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


class Particle {
    constructor() {
        this.lifeTime = 0;
        this.position = { x: 0, y: 0 };
        this.angle = 0;
        this.scale = 1;
        this.opacity = 0;
        this.direction = {x: 0, y: 0};
        this.floatAngle = 0;
        this.floatAngleDirection = 0;
    }

    update() {}

    destroy() {}
}


class DomParticle extends Particle {
    constructor(domContainer, domParticle) {
        super();
        this.domParticle = domParticle;
        this.domContainer = domContainer;
        domContainer.appendChild(domParticle);
    }

    update() {
        this.domParticle.setAttribute('style', `opacity: ${this.opacity}`);
        this.domParticle.setAttribute('transform', `translate(${this.position.x} ${this.position.y}) rotate(${this.angle}) scale(${this.scale} ${this.scale})`);
    }

    destroy() {
        this.domContainer.removeChild(this.domParticle);
    }
}


// since item destroying is a very expensive operation, it's better to destroy all items in bulk at the end of the animation
class ItemRecycler {
    constructor(schemeContainer) {
        this.items = [];
        this.schemeContainer = schemeContainer;
        this.recycledItems = [];
    }

    recycleItem(item) {
        this.recycledItems.push(item);
    }


    destroy() {
        //TODO fix this. it forces to reindex all items and components which completely resets user behaviors and they stop working in component items
        this.schemeContainer.deleteNonIndexableItems(this.items);
    }

    borrowItem(elementSelector) {
        if (this.recycledItems.length > 0) {
            return this.recycledItems.pop();
        }

        const particleReferenceItem = this.schemeContainer.findFirstElementBySelector(elementSelector);
        if (particleReferenceItem) {
            const [clonedItem] = this.schemeContainer.cloneItems([particleReferenceItem]);
            this.schemeContainer.addNonIndexableItem(clonedItem);
            this.items.push(clonedItem);
            return clonedItem;
        }
        return null;
    }
}

class ItemParticle extends Particle {
    constructor(schemeContainer, elementSelector, item, itemRecycler) {
        super();
        this.item = item;
        this.particleItem = null;
        this.schemeContainer = schemeContainer;
        this.itemRecycler = itemRecycler;

        this.particleItem = this.itemRecycler.borrowItem(elementSelector);
    }

    update() {
        if (!this.particleItem) {
            return;
        }
        const worldPoint = worldPointOnItem(this.position.x, this.position.y, this.item);
        this.particleItem.visible = true;
        this.particleItem.area.x = worldPoint.x - this.particleItem.area.px * this.particleItem.area.w;
        this.particleItem.area.y = worldPoint.y - this.particleItem.area.py * this.particleItem.area.h;
        this.particleItem.area.sx = this.scale;
        this.particleItem.area.sy = this.scale;
        this.particleItem.area.r = this.angle;
        this.particleItem.opacity = this.opacity * 100;
        EventBus.emitItemChanged(this.particleItem.id);
    }

    destroy() {
        if (this.particleItem) {
            this.itemRecycler.recycleItem(this.particleItem);
        }
    }
}


class ItemParticleEffectAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.resultCallback = resultCallback;
        this.domContainer = null;
        this.domItemPath = null;
        this.particles = [];
        this.schemeContainer = schemeContainer;
        this.itemRecycler = new ItemRecycler(schemeContainer);

        this.generatorCounter = 0.0;
        this.particlesLeft = this.args.particlesCount;
        this.cleanupDomElements = [];
        this.totalPathLength = 0.0;
        this.singleParticleBirthTime = this.args.birthTime / Math.max(1, this.args.particlesCount);
    }

    init() {
        this.domContainer = document.getElementById(`animation-container-${this.item.id}`);

        const shape = Shape.find(this.item.shape);
        if (!shape) {
            return false;
        }
        this.domItemPath = this.schemeContainer.getSvgOutlineOfItem(this.item);

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
                    const toGenerate = Math.min(this.particlesLeft, roundedCounter);
                    for (let i = 0; i < toGenerate; i++) {
                        this.createParticle();
                    }
                    this.generatorCounter -= roundedCounter;
                }
            } else {
                while(this.particlesLeft > 0) {
                    this.createParticle();
                }
            }
        }
        
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].lifeTime > this.args.lifeTime) {
                this.particles[i].destroy();
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

        let particle = null;
        if (this.args.particleType === 'item') {
            particle = new ItemParticle(this.schemeContainer, this.args.item, this.item, this.itemRecycler);
        } else {
            particle = new DomParticle(this.domContainer, this.createParticleDom(this.args.particleType, this.args.particleSize, this.args.color));
        }

        particle.position = position;

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
        particle.update();

        this.particlesLeft -= 1;
    }

    playParticle(particle, dt) {
        particle.lifeTime += dt/1000.0;

        if (this.args.travelAlongPath) {
            let maxLifeTime = this.args.lifeTime;
            if (maxLifeTime < 0.1) {
                maxLifeTime = 1.0;
            }
            let pathLength = 0; 
            if (this.args.backwards) {
                pathLength = this.totalPathLength * Math.max(0, (1.0 - particle.lifeTime / maxLifeTime));
            } else {
                pathLength = this.totalPathLength * particle.lifeTime / maxLifeTime;
            }
            const point = this.domItemPath.getPointAtLength(pathLength);
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

            if (this.args.adjustRotation) {
                const nextPoint  = this.domItemPath.getPointAtLength(pathLength + 2);
                const Vx = nextPoint.x - point.x;
                const Vy = nextPoint.y - point.y;
                const dSquared = Vx * Vx + Vy * Vy;
                if (!myMath.tooSmall(dSquared)) {
                    const d = Math.sqrt(dSquared);

                    const vx = Vx / d;
                    const vy = Vy / d;
                    const angle = myMath.fullAngleForNormalizedVector(vx, vy) * 180 / Math.PI;

                    particle.angle = angle;
                    
                    if (isFinite(this.args.rotationOffset)) {
                        particle.angle += this.args.rotationOffset;
                    };
                }
            }

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
        particle.scale = scale;
        particle.opacity = opacity;
        
        particle.update();
    }

    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
        forEach(this.particles, particle => {
            particle.destroy();
        });

        this.itemRecycler.destroy();

        forEach(this.cleanupDomElements, domElement => {
            this.domContainer.removeChild(domElement);
        });

        this.cleanupDomElements = [];
    }

    createParticleDom(type, size, color) {
        if (type === 'circle') {
            return this.svg('circle', { cx: 0, cy: 0, r: size / 2, fill: color});
        } else if (type === 'rect') {
            return this.svg('rect', {x: -size/2, y: -size/2, width: size, height: size, fill: color, stroke: 'none'});
        } else {
            return this.svg('circle', { cx: 0, cy: 0, r: size / 2, fill: `url(#animation-particle-effect-gradient-${this.id})`});
        }
    }

}

export default {
    name: 'Particle Effect',

    description: 'Generates particles on the outline of the item',

    args: {
        particleType:   {name: 'Particle Type',     type: 'choice', value: 'spot', options: [
            'spot', 'circle', 'rect', 'item'
        ]},
        item              : {name: 'Item',              type: 'element', value: null, depends: {particleType: 'item'}},
        particlesCount    : {name: 'Particles',         type: 'number', value: 20},
        particleSize      : {name: 'Particle size',     type: 'number', value: 20},
        color             : {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        speed             : {name: 'Speed',             type: 'number', value: 60, depends: {travelAlongPath: false}},
        lifeTime          : {name: 'Life time (sec)',   type: 'number', value: 2.0},
        birthTime         : {name: 'Birth time (sec)',  type: 'number', value: 0.5, description: 'Time in which it should generate all particles'},
        growth            : {name: 'Growth to (%)',     type: 'number', value: 10},
        decline           : {name: 'Decline from (%)',  type: 'number', value: 90},
        fadeIn            : {name: 'Fade in (%)',       type: 'number', value: 5},
        fadeOut           : {name: 'Fade out (%)',      type: 'number', value: 95},
        travelAlongPath   : {name: 'Travel along path', type: 'boolean',value: true, description: 'The particle emits in the beggining of the path and travels along the path'},
        backwards         : {name: 'Travel backwards',  type: 'boolean',value: false, depends: {travelAlongPath: true}},
        adjustRotation    : {name: 'Adjust rotation',   type: 'boolean',value: true, description: 'Adjust rotation of particles to path', depends: {travelAlongPath: true}},
        rotationOffset    : {name: 'Rotation offset',   type: 'number', value: 0, description: 'Rotation angle offset', depends: {adjustRotation: true, travelAlongPath: true}},
        travelFloatRadius : {name: 'Travel float radius',type: 'number', value: 5, depends: {travelAlongPath: true}},
        travelFloatSpeed  : {name: 'Travel float speed',type: 'number', value: 10, depends: {travelAlongPath: true}},
        inBackground      : {name: 'In background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invokation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            AnimationRegistry.play(new ItemParticleEffectAnimation(item, args, schemeContainer, resultCallback), item.id);
        }
        if (args.inBackground) {
            resultCallback();
        }
    }
}