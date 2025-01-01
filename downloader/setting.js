const { app, ipcMain, dialog } = require('electron');
const { storeSet, storeGet} = require('../common/mpstore');
const DOWNLOAD_PATH_KEY = 'DownloadPath';

let i18n;
function init(i18nObj) {
    i18n = i18nObj;
    ipcMain.on('download:dir:setting', (event) => {
        setDownloadPath(event);
    });
    ipcMain.handle('download:dir:getting', (_) => {
        return getDownloadPath();
    });
    
    ipcMain.on('store:setting', (_, key, value) => {
        storeSet(key, value);
    })
    
    ipcMain.on('store:getting', (_, key) => {
        _.returnValue = storeGet(key)
    })
}


function getDownloadPath() {
    let downloadPath = storeGet(DOWNLOAD_PATH_KEY);
    if (!downloadPath) {
        downloadPath = path.join(app.getPath('downloads'), app.getName());
        storeSet(DOWNLOAD_PATH_KEY, downloadPath);
    }
    return downloadPath;
}

function setDownloadPath(event) {
    console.log('#####:set-download-dir');
    dialog.showOpenDialog({
        title: i18n['change-path']['choose-dialog-title'],
        defaultPath: getDownloadPath(),
        properties: ['openDirectory', 'createDirectory']
    }).then(result => {
        if (result.canceled) {
            console.log('#####:set-download-dir canceled');
        } else {
            storeSet(DOWNLOAD_PATH_KEY, result.filePaths[0]);
            event.sender.send('download:dir:update', result.filePaths[0]);
            console.log('#####:set-download-dir:', result.filePaths[0]);
        }
    }).catch(err => {
        console.log('#####:set-download-dir:', err);
    });
}

module.exports = {
    userSettingInit: init,
    getDownloadPath,
}