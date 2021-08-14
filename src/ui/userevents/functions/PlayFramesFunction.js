import AnimationRegistry from "../../animations/AnimationRegistry";


export default {
    name: 'Play Frames',
    
    description: 'Triggers animations in specified frame player',

    args: {
        startFrame: {type: 'number', value: 1, min: 1, name: 'Starting Frame'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (!item) {
            resultCallback();
            return;
        }
        const frameAnimation = schemeContainer.getFrameAnimation(item.id);
        if (!frameAnimation) {
            resultCallback();
            return;
        }

        frameAnimation.setFrame(args.startFrame);
        AnimationRegistry.play(frameAnimation);
    }
}