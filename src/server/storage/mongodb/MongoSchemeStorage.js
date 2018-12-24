const SchemeStorage     = require('../SchemeStorage.js');
const MongoClient       = require('mongodb').MongoClient;
const shortid           = require('shortid');
const _                 = require('lodash');


//TODO put all this into config
const mongodbUrl = 'mongodb://localhost:27017';
// Database Name
const dbName = 'myproject';
const poolSize = 10;




class MongoSchemeStorage extends SchemeStorage {
    constructor() {
        super();
        this.db = null;
        MongoClient.connect(mongodbUrl, {
            poolSize: poolSize
        }).then(client => {
            this.db = client.db(dbName);
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    }

    _inSchemes() {
        return this.db.collection('schemes');
    }
    _inTags() {
        return this.db.collection('tags');
    }

    findSchemes(query) {
        return this._inSchemes().find({}).toArray().then(schemes => {
            return {
                results: _.map(schemes, scheme => {
                    delete scheme['_id'];
                    return scheme;
                }),
                total: 10,
                resultsPerPage: 100,
                offset: 0
            };
        });
    }

    createScheme(scheme) {
        scheme.id = shortid.generate();
        return this._inSchemes().insert(scheme).then(result => {
            console.log('Result', result);
            return scheme;
        });
    }

    getScheme(schemeId) {
        return this._inSchemes().findOne({id: schemeId}).then(scheme => {
            delete scheme['_id'];
            return scheme;
        });
    }

    saveScheme(schemeId, scheme) {
        if (scheme.tags) {
            var tags = [].concat(scheme.tags);
            _.forEach(scheme.items, item => {
                if (item.tags) {
                    tags = tags.concat(item.tags);
                }
            });
        }
        this.saveTags(tags);
        return this._inSchemes().update({id: schemeId}, scheme);
    }

    getTags() {
        return this._inTags().find({}).toArray().then(tags => {
            return _.map(tags, tag => tag.name);
        });
    }

    saveTags(tags) {
        console.log('Got tags: ', tags);
        var uniqTags = _.uniq(tags);
        console.log('Storing tags: ', uniqTags);

        var promises = _.map(uniqTags, tag => {
            return this._inTags().updateOne({
                name: tag
            }, {
                name: tag
            }, {
                upsert: true
            });
        });
        return Promise.all(promises);
    }
}

module.exports = MongoSchemeStorage;
