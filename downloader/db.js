const { ipcMain } = require('electron');
const { storeGet, storeSet } = require('../common/mpstore');
const { logFormat } = require('../common/util');
const DB_KEY = 'ResourceDataBase';

const deleteCallbacks = [];
const clearCallbacks = [];

function init() {
    ipcMain.on('delete:resources', (_, deleteResources) => {
        console.log('#####:delete-resources:', deleteResources);
        deleteFromDB(...deleteResources);
    })
    ipcMain.on('clear:resources', () => {
        clearDB();
    })
}

function registerDBCallback(deleteCallback, clearCallback) {
    deleteCallbacks.push(deleteCallback);
    clearCallbacks.push(clearCallback);
}

function fromDB() {
    return storeGet(DB_KEY) || {};
}
function toDB(...resourceMetas) {
    console.log(logFormat(`Save data DB[count:${resourceMetas.length}]`), resourceMetas);
    let data = fromDB();
    for (let resourceMeta of resourceMetas) {
        data[resourceMeta.timestamp] = resourceMeta;
    }
    storeSet(DB_KEY, data);
}

function deleteFromDB(...deleteResources) {
    console.log(logFormat(`Delete data from DB[count:${deleteResources.length}]`), deleteResources);
    let data = fromDB();
    console.log('#####:delete-from-db:befor:', Object.keys(data).length)
    deleteResources.forEach(resourceMeta => {
        deleteCallbacks.forEach(callback => callback(resourceMeta));
        delete data[resourceMeta.timestamp];
    });

    console.log('#####:delete-from-db:after:', Object.keys(data).length);
    storeSet(DB_KEY, data);
}

function clearDB() {
    console.log(logFormat('Clear DB'));
    clearCallbacks.forEach(callback => callback());
    storeSet(DB_KEY, {});
}


module.exports = {
    dbInit: init,
    fromDB,
    toDB,
    registerDBCallback,
}