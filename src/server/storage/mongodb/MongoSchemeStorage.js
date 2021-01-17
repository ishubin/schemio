/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const shortid           = require('shortid');
const _                 = require('lodash');
const config            = require('../../config.js');
const mongo             = require('./Mongo.js');

const CURRENT_SCHEME_VERSION  = 1;

//TODO align it with client side
const RESULTS_PER_PAGE = 20;

class MongoSchemeStorage {
    _schemes() {
        return mongo.db().collection('schemes');
    }
    _schemePreviews() {
        return mongo.db().collection('schemePreviews');
    }
    _tags() {
        return mongo.db().collection('tags');
    }
    _categories() {
        return mongo.db().collection('categories');
    }

    combineItemsText(items) {
        let text = '';
        _.forEach(items, item => {
            if (item.name) {
                text += '\n' + item.name;
            }
            if (item.description) {
                text += '\n' + item.description;
            }
            if (item.properties) {
                text += '\n' + item.properties;
            }

            if (item.childItems) {
                text += '\n' + this.combineItemsText(item.childItems);
            }
        });

        return text;
    }

    findSchemes(projectId, query) {
        var mongoQuery = {projectId: mongo.sanitizeString(projectId)};
        if (query.hasOwnProperty('category')) {
            let categoryId = null;
            if (query.category != 0) {
                categoryId = query.category;
            }
            if (query.includeSubcategories) {
                mongoQuery['$or'] = [
                     {categoryId: mongo.sanitizeString(categoryId)},
                     {'allSubCategoryIds': mongo.sanitizeString(categoryId)}
                ];
            } else {
                mongoQuery['categoryId'] = mongo.sanitizeString(categoryId);
            }
        }
        if (query.query && query.query.length > 0) {
            mongoQuery['$text'] = {'$search': mongo.sanitizeString(query.query)};
        }
        if (query.tag){
            mongoQuery['indexedTags'] = query.tag;
        }

        var offset = 0;
        if (query.offset) {
            offset = parseInt(query.offset);
        }
        var limit = RESULTS_PER_PAGE;

        return Promise.all([
            this._schemes().count(mongoQuery),
            this._schemes().find(mongoQuery).skip(offset).limit(limit).toArray()
        ]).then(values => {
            var count = values[0];
            var schemes = values[1];
            return {
                results: _.map(schemes, scheme => {
                    return {
                        "id": scheme.id,
                        "name": scheme.name,
                        "description": scheme.description,
                        "tags": scheme.tags,
                        "modifiedTime": scheme.modifiedTime,
                        "previewUrl": scheme.previewUrl
                    };
                }),
                total: count,
                resultsPerPage: limit,
                offset: 0
            };
        });
    }

    createScheme(projectId, scheme) {
        scheme.id = shortid.generate();
        scheme.version = CURRENT_SCHEME_VERSION;

        scheme.itemsText = this.combineItemsText(scheme.items);
        scheme.projectId = projectId;

        return this._enrichSchemeWithCategoryData(projectId, scheme)
        .then(enrichedScheme => {
            return this._schemes().insertOne(enrichedScheme).then(result => {
                return scheme;
            });
        });
    }

    _enrichSchemeWithCategoryData(projectId, scheme) {
        let promise = Promise.resolve(null);
        if (scheme.categoryId) {
            promise = this._categories().findOne({
                id: mongo.sanitizeString(scheme.categoryId),
                projectId: mongo.sanitizeString(projectId)
            }).then(category => {
                if (!category) {
                    return Promise.reject(`Category does not exist: ${scheme.categoryId}`);
                }
                return category;
            })
        }

        return promise.then(category => {
            if (category) {
                scheme.allSubCategoryIds = _.map(category.ancestors, a => a.id);
            } else {
                scheme.allSubCategoryIds = [];
            }

            return scheme;
        });
    }

    getScheme(projectId, schemeId) {
        return this._schemes().findOne({
            id: mongo.sanitizeString(schemeId),
            projectId: mongo.sanitizeString(projectId)
        }).then(scheme => {
            if (scheme) {
                return {
                    id: scheme.id,
                    name: scheme.name,
                    description: scheme.description,
                    tags: scheme.tags,
                    modifiedTime: scheme.modifiedTime,
                    categoryId: scheme.categoryId,
                    items: scheme.items,
                    previewUrl: scheme.previewUrl,
                    style: scheme.style || {}
                };
            } else {
                return null;
            }
        });
    }

    deleteScheme(projectId, schemeId) {
        return this._schemes().deleteOne({
            id: mongo.sanitizeString(schemeId),
            projectId: mongo.sanitizeString(projectId)
        });
    }

    deleteMultipleSchemes(projectId, schemeIds) {
        return this._schemes().deleteMany({
            id: { $in: schemeIds },
            projectId: mongo.sanitizeString(projectId)
        });
    }

    extractTagsFromScheme(scheme) {
        const tagsMap = {};
        if (scheme.tags) {
            _.forEach(scheme.tags, tag => {
                tagsMap[tag] = true;
            });
        }
        _.forEach(scheme.items, item => {
            if (item.tags) {
                _.forEach(item.tags, tag => {
                    tagsMap[tag] = true;
                });
            }
        });
        return _.keys(tagsMap);
    }

    saveScheme(projectId, schemeId, scheme) {
        const tags = this.extractTagsFromScheme(scheme);
        this.saveTags(projectId, tags);

        scheme.itemsText = this.combineItemsText(scheme.items);
        scheme.indexedTags = tags;
        scheme.version = CURRENT_SCHEME_VERSION;
        scheme.projectId = projectId;

        return this._enrichSchemeWithCategoryData(projectId, scheme)
        .then(enrichedScheme => {
            return this._schemes().updateOne({
                id: mongo.sanitizeString(schemeId),
                projectId: mongo.sanitizeString(projectId)
            }, {$set: enrichedScheme});
        });
    }

    /**
     * Updates scheme preview url inside scheme object
     * @param {*} projectId 
     * @param {*} schemeId 
     * @param {*} schemePreviewUrl 
     */
    updateSchemePreviewUrl(projectId, schemeId, schemePreviewUrl) {
        return this._schemes().updateOne({
            id: mongo.sanitizeString(schemeId),
            projectId: mongo.sanitizeString(projectId)
        }, {$set: {previewUrl: schemePreviewUrl}});
    }

    getTags(projectId) {
        return this._tags().find({
            projectId: mongo.sanitizeString(projectId)
        }).toArray().then(tags => {
            if (tags && tags.length > 0) {
                return _.map(tags, tag => tag.name);
            } else {
                return [];
            }
        });
    }

    saveTags(projectId, tags) {
        const uniqTags = _.uniq(tags);

        const promises = _.map(uniqTags, tag => {
            return this._tags().updateOne({
                name: tag, 
                projectId: projectId
            }, {$set: {
                name: tag,
                projectId: projectId
            }}, {
                upsert: true
            });
        });
        return Promise.all(promises);
    }

    /**
     * Stores schemes svg in schemePreviews collection
     * @param {*} projectId 
     * @param {*} schemeId 
     * @param {*} svgContent 
     */
    saveSchemePreview(projectId, schemeId, svgContent) {
        return this._schemePreviews().updateOne(
            {projectId, schemeId},
            {$set: {schemeId, projectId, content: svgContent, type: 'svg'}},
            {upsert: true}
        );
    }

    getSchemePreview(projectId, schemeId) {
        return this._schemePreviews().findOne({projectId, schemeId});
    }
}

module.exports = MongoSchemeStorage;
