import utils from '../../../ui/utils.js';


export default {
    name: 'Set',

    // Set function does not need to specify arguments as it is an special function 
    // and its arguments are handled seprately
    args: [],

    execute(item, args) {
        if (item && args.length > 1 && args[0]) {
            utils.setObjectProperty(item, args[0], args[1]);
        }
    }
};
