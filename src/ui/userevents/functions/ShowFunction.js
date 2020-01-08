

export default {
    name: 'Show',
    args: {},

    execute(item, args) {
        if (item) {
            item.visible = true;
        }
    }
};
