class CategoryStorage {

    /**
    id - is the unique short name of a category which is used as an id
    parentId - the id of parent category
    */
    createCategory(name, id, parentId) { return Promise.resolve(null); }

    /**
    Returns category with all its ancestors
    */
    getCategory(id) {  return Promise.resolve(null); }


    /**
    returns list of categories
    */
    getCategories(parentId) {  return Promise.resolve([]); }
}


module.exports = CategoryStorage;
