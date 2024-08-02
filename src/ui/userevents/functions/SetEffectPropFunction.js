
export default {
    name: 'Set Effect Property',

    args: {
        effectName          : {name: 'Field', type: 'text', value: ''},
        field               : {name: 'Field', type: 'text', value: ''},
        value               : {name: 'Value', type: 'any', value: null},
        animated            : {name: 'Animated', type: 'boolean', value: false},
        animationDuration   : {name: 'Animation duration (sec)', type: 'number', value: 0.5, depends: {animated: true}},
        transition          : {name: 'Transition', type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground        : {name: 'In Background', type: 'boolean', value: false, depends: {animated: true}, description: 'Play animation in background without blocking invocation of other actions'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        resultCallback();
    }
};
