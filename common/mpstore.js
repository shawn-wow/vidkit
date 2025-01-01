const Store = require('electron-store');
const store = new Store();

function storeSet(key, value) {
    store.set(key, value);
}
function storeGet(key) {
    return store.get(key);
}

function storeHas(key) {
    return store.has(key);
}

function storeDelete(key) {
    store.delete(key);
}

function storeClear() {
    store.clear();
}

module.exports = {
    storeSet,
    storeGet,
    storeHas,
    storeDelete,
    storeClear,
}