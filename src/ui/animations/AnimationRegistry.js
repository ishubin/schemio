

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
                status = animation.play(deltaTime);
            } catch(e) {
                status = false;
            }
            if (!status) {
                try {
                    animation.destroy();
                } catch(e) {
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
     */
    play(animation) {
        let success = false;
        try {
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
        _.forEach(animations, animation => {
            animation.destroy();
        });
    },

    disableAnimations() {
        animationsEnabled = false;
    },

    enableAnimations() {
        animationsEnabled = true;
    }
};