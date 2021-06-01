
export default {
    name: 'Wait',

    description: 'Waits for specified amount of time until the next function',

    args: {
        time: {type: 'number', value: 0.1, name: 'Time (s)', description: 'Number of seconds for which it should wait until executing next action in the list'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        setTimeout(resultCallback, args.time * 1000.0);
    }
};
