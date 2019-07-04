import utils from '../../../ui/utils.js';


export default {
    name: 'Set',

    execute(item, args) {
        if (item && args.length > 1 && args[0]) {
            utils.setObjectProperty(item, args[0], args[1]);
        }
    }
};
