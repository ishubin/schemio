import forEach from 'lodash/forEach';

// desired delta time between loop cycles in milliseconds
const DESIRED_DELTA_TIME = 16;

let animationsEnabled = true;
let isAlreadyLooping = false;
const animations = [];


function loopCycle(timeMarker, deltaTime) {
    if (animations.length === 0) {
        // stopping the empty loop as it does not make sense since there are no animations
        isAlreadyLooping = false;
        return;
    }

    if (animationsEnabled) {
        let i = 0;
        while (i < animations.length) {
            let animation = animations[i];
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
                animations.splice(i, 1);
            } else {
                i += 1;
            }
        }

        window.requestAnimationFrame(() => {
            const nextTimeMarker = performance.now();
            loopCycle(nextTimeMarker, nextTimeMarker - timeMarker);
        });
    } else {
        isAlreadyLooping = false;
    }
}

function startAnimationLoop() {
    if (animationsEnabled && !isAlreadyLooping) {
        isAlreadyLooping = true;
        window.requestAnimationFrame(() => loopCycle(performance.now(), DESIRED_DELTA_TIME));
    }
}


export default {
    /**
     * 
     * @param {Animation} animation
     * @param {String} entityId Id of an item. It is needed in order to be able to stop all animations for a specific item
     */
    play(animation, entityId) {
        // checking whether such animation already exists
        // this can be a case for frame player
        // instead of linear search this could be optimized by using a map of animation ids
        // but I don't think we are going to be using that many animations at the same time,
        // so it's fine like this for now
        for (let i = 0; i < animations.length; i++) {
            if (animations[i].id === animation.id) {
                animations.enabled = false;
                animations.splice(i, 1);
                break;
            }
        }

        animation.entityId = entityId;
        let success = false;
        try {
            animation.enabled = true;
            success = animation.init();
        } catch(e) {
            console.error('Could not initialize animation', e);
        }
        if (success) {
            animations.push(animation);
            startAnimationLoop();
        } else {
            animation.destroy();
        }
    },


    stopAllAnimations() {
        const animations = this.animations;
        this.animations = [];
        forEach(animations, animation => {
            animation.destroy();
        });
    },

    disableAnimations() {
        animationsEnabled = false;
    },

    enableAnimations() {
        animationsEnabled = true;
    },

    stopAllAnimationsForEntity(entityId) {
        forEach(animations, animation => {
            if (animation.entityId === entityId) {
                animation.enabled = false;
            }
        });
    }
};