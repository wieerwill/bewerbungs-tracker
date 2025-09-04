/*
 * diskDB
 * http://arvindr21.github.io/diskDB
 *
 * Copyright (c) 2014 Arvind Ravulavaru
 * Licensed under the MIT license.
 */
const { join } = require('path'),
    { red, green } = require('chalk'),
    { isValidPath, writeToFile } = require('./util'),
    Collection = require('./collection')

class DiskDB {
    connect(path, collections) {
        if (isValidPath(path)) {
            this._db = { path };
            console.log(green('Successfully connected ' + path));
            if (collections) {
                this.loadCollections(collections);
            }
        } else {
            console.log(red('The DB Path [' + path + '] does not seem to be valid'));
            return false;
        }
        return this;
    }

    loadCollections(collections) {
        if (!this._db) {
            console.log(e('Initialize the DB before you add collections'));
            return false;
        }
        if (Array.isArray(collections)) {
            collections.forEach(collection => {
                if (!collection.includes('.json')) {
                    collection = `${collection}.json`;
                }
                const collectionFile = join(this._db.path, collection);
                if (!isValidPath(collectionFile)) {
                    writeToFile(collectionFile);
                }
                const collectionName = collection.replace('.json', '');
                this[collectionName] = new Collection(this, collectionName);
            });
        } else {
            console.log(red('Invalid Collections Array.'));
        }
        return this;
    }
}

module.exports = { DiskDB }