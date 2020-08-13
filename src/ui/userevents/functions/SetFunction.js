import utils from '../../../ui/utils.js';
import EventBus from '../../components/editor/EventBus';


export default {
    name: 'Set',

    // Set function does not need to specify arguments as it is an special function 
    // and its arguments are handled seprately
    args: {},

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item && args.hasOwnProperty('field') && args.hasOwnProperty('value')) {
            utils.setObjectProperty(item, args.field, args.value);
            EventBus.emitItemChanged(item.id);
        }

        resultCallback();
    }
};
