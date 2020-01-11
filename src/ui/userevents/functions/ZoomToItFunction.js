import EventBus from '../../components/editor/EventBus';

export default {
    name: 'Zoom To It',
    args: {},

    execute(item, args) {
        if (item && item.area) {
            EventBus.$emit(EventBus.BRING_TO_VIEW, item.area);
        }
    }
};

