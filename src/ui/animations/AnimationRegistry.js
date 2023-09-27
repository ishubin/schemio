/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import shortid from 'shortid';
import { forEach } from '../collections';

// desired delta time between loop cycles in milliseconds
const DESIRED_DELTA_TIME = 16;

// storing animations registries in global map as they can be referenced from any item behavior function
const animationRegistries = new Map();

// maps editorId to animation registry unique id
// this is needed since in Vue, when updating the SchemeEditor component key,
// it first initializes new component and only then run beforeDestory function of the old one
// Because of this, and the fact the the same editorId is used, the animation registry is deleted
// and no animations could be played.
const editorIdMappings = new Map();

class AnimationRegistry {
    constructor(editorId) {
        this.id = shortid.generate();
        this.editorId = editorId;
        this.animationsEnabled = true;
        this.isAlreadyLooping = false;
        this.animations = [];
    }

    /**
     *
     * @param {Animation} animation
     * @param {String} entityId Id of an item. It is needed in order to be able to stop all animations for a specific item
     * @param {String} animationId Id of animation. It is used to avoid race conditions when same animations are played in parallel for the same item
     */
    play(animation, entityId, animationId) {
        // checking whether such animation already exists
        // this can be a case for frame player
        // instead of linear search this could be optimized by using a map of animation ids
        // but I don't think we are going to be using that many animations at the same time,
        // so it's fine like this for now
        for (let i = 0; i < this.animations.length; i++) {
            if (this.animations[i].id === animation.id) {
                this.animations[i].enabled = false;
                try {
                    this.animations[i].enabled = false;
                } catch (err) {
                    console.error(err);
                    this.animations[i].destroy();
                }
                this.animations.splice(i, 1);
                break;
            }
        }

        animation.entityId = entityId;
        animation.animationId = animationId;

        if (animationId) {
            stopSimilarAnimationForItem(this, entityId, animationId);
        }

        let success = false;
        try {
            animation.enabled = true;
            success = animation.init();
        } catch(e) {
            console.error('Could not initialize animation', e);
        }
        if (success) {
            this.animations.push(animation);
            startAnimationLoop(this);
        } else {
            try {
                animation.destroy();
            } catch(err) {
                console.error(err);
            }
        }
    }

    stopAllAnimations() {
        const animations = this.animations;
        this.animations = [];
        forEach(animations, animation => {
            try {
                animation.destroy();
            } catch(err) {
                console.error(err);
            }
        });
    }

    disableAnimations() {
        this.animationsEnabled = false;
    }

    enableAnimations() {
        this.animationsEnabled = true;
    }

    stopAllAnimationsForEntity(entityId) {
        forEach(this.animations, animation => {
            if (animation.entityId === entityId) {
                animation.enabled = false;
                try {

                } catch(err) {
                    console.error(err);
                    animation.destroy();
                }
            }
        });
    }

    destroy() {
        this.stopAllAnimations();
        if (animationRegistries.has(this.id)) {
            animationRegistries.delete(this.id);
        }
    }
}

/**
 *
 * @param {AnimationRegistry} registry
 * @param {*} timeMarker
 * @param {*} deltaTime
 * @returns
 */
function loopCycle(registry, timeMarker, deltaTime) {
    if (registry.animations.length === 0) {
        // stopping the empty loop as it does not make sense since there are no animations
        registry.isAlreadyLooping = false;
        return;
    }

    if (registry.animationsEnabled) {
        let i = 0;
        while (i < registry.animations.length) {
            let animation = registry.animations[i];
            let status = true;
            try {
                if (animation.enabled) {
                    status = animation.play(deltaTime);
                } else {
                    status = false;
                }
            } catch(e) {
                status = false;
                console.error(e);
            }
            if (!status) {
                try {
                    animation.destroy();
                } catch(e) {
                    console.error(e);
                }
                registry.animations.splice(i, 1);
            } else {
                i += 1;
            }
        }

        window.requestAnimationFrame(() => {
            const nextTimeMarker = performance.now();
            loopCycle(registry, nextTimeMarker, nextTimeMarker - timeMarker);
        });
    } else {
        registry.isAlreadyLooping = false;
    }
}

/**
 *
 * @param {AnimationRegistry} registry
 */
function startAnimationLoop(registry) {
    if (registry.animationsEnabled && !registry.isAlreadyLooping) {
        registry.isAlreadyLooping = true;
        window.requestAnimationFrame(() => loopCycle(registry, performance.now(), DESIRED_DELTA_TIME));
    }
}


/**
 *
 * @param {AnimationRegistry} registry
 * @param {*} entityId
 * @param {*} animationId
 */
function stopSimilarAnimationForItem(registry, entityId, animationId) {
    forEach(registry.animations, animation => {
        if (animation.entityId === entityId && animation.animationId === animationId) {
            animation.enabled = false;
        }
    });
}



/**
 *
 * @param {String} editorId
 * @returns {AnimationRegistry}
 */
export function createAnimationRegistry(editorId) {
    const registry = new AnimationRegistry(editorId);
    animationRegistries.set(registry.id, registry);
    editorIdMappings.set(editorId, registry.id);
    return registry;
}


function withAnimationRegistryForEditor(editorId, callback) {
    if (!editorIdMappings.has(editorId)) {
        return;
    }

    const id = editorIdMappings.get(editorId);
    if (animationRegistries.has(id)) {
        callback(animationRegistries.get(id));
    }
}

export function playInAnimationRegistry(editorId, animation, entityId, animationId) {
    withAnimationRegistryForEditor(editorId, registry => {
        registry.play(animation, entityId, animationId);
    });
}

export function stopAllAnimationsForEntityInAnimationRegistry(editorId, entityId) {
    withAnimationRegistryForEditor(editorId, registry => {
        registry.stopAllAnimationsForEntity(entityId);
    });
}