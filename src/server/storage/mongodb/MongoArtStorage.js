const ArtStorage     = require('../ArtStorage.js');
const MongoClient       = require('mongodb').MongoClient;
const shortid           = require('shortid');
const _                 = require('lodash');


const mongodbUrl = 'mongodb://localhost:27017';
// Database Name
const dbName = 'myproject';
const poolSize = 10;



class MongoArtStorage extends ArtStorage {
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

    _art() {
        return this.db.collection('art');
    }

    createArt(art) {
        var artItem = {
            id: shortid.generate(),
            name: art.name,
            url: art.url,
            modifiedDate: art.modifiedDate
        };

        return this._art().insertOne(artItem).then(result => {
            return artItem;
        });
    }

    getArt() {
        return this._art().find({}).toArray().then(result => {
            return _.map(result, item => {
                return {
                    id: item.id,
                    name: item.name,
                    url: item.url
                };
            });
        });
    }

}

module.exports = MongoArtStorage;
