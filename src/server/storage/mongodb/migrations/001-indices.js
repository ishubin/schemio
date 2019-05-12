
module.exports = {
    details: 'Creating unique indices for categories, text index for schemes for searching',
    up(db) {
        return Promise.resolve(null).then(() =>
            db.collection('migrations').createIndex({id: 1}, {unique: true})
        ).then(() =>
            db.collection('categories').createIndex({id: 1}, {unique: true})
        ).then(() =>
            db.collection('categories').createIndex({parentId: 1, lname: 1}, {unique: true})
        ).then(() =>
            db.collection('schemes').createIndex({name: "text", description: "text", itemsText: "text"})
        );
    }
}
