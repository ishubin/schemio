/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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

    /**
    deletes category, all of its sub-categories
    */
    deleteCategory(categoryId) { return Promise.resolve(null); }


    getCategoryTree() { return Promise.resolve(null);}
}


module.exports = CategoryStorage;
