


export default {
    name: 'Set',

    execute(item, args) {
        if (item && args.length > 1 && args[0]) {
            const objectPath = args[0].split('.');
            let field = item;
            let i = 0;
            while(i < objectPath.length) {
                const fieldName = objectPath[i].trim();
                if (fieldName) {
                    if (i < objectPath.length - 1) {
                        if (!field.hasOwnProperty(fieldName)) {
                            field[fieldName] = {};
                        }
                        field = field[fieldName];
                        if (typeof field !== 'object') {
                            // not doing anything since there is a conflict
                            return;
                        }
                    } else {
                        // this is the lowest nested property
                        if (field.hasOwnProperty(fieldName) && typeof field[fieldName] === 'object') {
                            // should not change in case the field is actually an object
                            return;
                        }
                        field[fieldName] = args[1];
                        return;   
                    }
                } else {
                    //Probably an error, so return and don't do anything.
                    return;
                }
                i += 1;
            }
        }
    }
};
