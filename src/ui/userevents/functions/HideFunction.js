
export default {
    name: 'Hide',
    args: [],

    execute(item, args) {
        if (item) {
            item.visible = false;
        }
    }
};
