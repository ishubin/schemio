
export default {
    name: 'Wait',

    // Set function does not need to specify arguments as it is an special function 
    // and its arguments are handled seprately
    args: {
        time: {type: 'number', value: 0.1, name: 'Time (s)', description: 'Number of seconds for which it should wait until executing next action in the list'}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        setTimeout(resultCallback, args.time * 1000.0);
    }
};
