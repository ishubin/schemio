
export default {
    name: 'Hide',

    execute(item, args) {
        if (item) {
            item.visible = false;
        }
    }
};