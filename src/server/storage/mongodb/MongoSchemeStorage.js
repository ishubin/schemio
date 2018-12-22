const SchemeStorage     = require('../SchemeStorage.js');
const MongoClient       = require('mongodb').MongoClient;
const assert            = require('assert');
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

    findSchemes(query) {
        return this._inSchemes().find({}).toArray().then(schemes => {
            return _.map(schemes, scheme => {
                delete scheme['_id'];
                return scheme;
            });
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
}

module.exports = MongoSchemeStorage;
