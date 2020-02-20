import AnimationRegistry from '../../animations/AnimationRegistry';

export default {
    name: 'Stop All Animations',
    args: {},

    execute(entity, args, schemeContainer, userEventBus, resultCallback) {
        //TODO figure out a way to stop all invocations for specified item
        if (entity && entity.id) {
            AnimationRegistry.stopAllAnimationsForEntity(entity.id);
        }
        resultCallback();
    }
};

