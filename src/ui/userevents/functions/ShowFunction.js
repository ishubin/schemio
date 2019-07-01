

export default {
    name: 'Show',

    execute(item, args) {
        if (item) {
            item.visible = true;
        }
    }
};
