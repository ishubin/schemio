import AnimationRegistry from '../../animations/AnimationRegistry';

export default {
    name: 'Stop All Animations',
    args: {},

    execute(entity, args) {
        if (entity && entity.id) {
            AnimationRegistry.stopAllAnimationsForEntity(entity.id);
        }
    }
};

