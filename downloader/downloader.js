const { app, ipcMain, WebContentsView } = require('electron');
const path = require('path');
const { bbDownInit } = require('./bbdown');
const { normalDownInit } = require('./normaldown');
const { userSettingInit, getDownloadPath } = require('./setting');
const { itemOperationsInit } = require('./itemoperations')
const { dbInit, fromDB } = require('./db')

let view;
let baseWindow;
let i18n;
function create(i18nObj, window) {
    baseWindow = window;
    i18n = i18nObj;
    view = new WebContentsView({
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            // contextIsolation: true,
            // enableRemoteModule: false,
            // nodeIntegration: false,
        },
    });
    resize();
    view.webContents.loadFile(path.join(__dirname, './renderer/index.html'));
    view.webContents.openDevTools();
    initIpc();
    normalDownInit(i18n, view);
    bbDownInit();
    userSettingInit(i18n);
    itemOperationsInit(i18n, view);
    dbInit();
    return view;
}

function initIpc() {
    ipcMain.handle('app:downloader:init', async () => {
        console.log('#####:app:downloader:init');
        let appConfig = {
            downloadDir: getDownloadPath(),
            i18n: i18n,
            version: app.getVersion(),
            history: fromDB(),
        };
        return appConfig;
    });
}

function resize() {
    const { width, height } = baseWindow.getContentBounds();
    view.setBounds({
        x: 0,
        y: 0,
        width: width,
        height: height,
    });
}

function clearCache() {
}

module.exports = {
    createDownloaderView: create,
    resizeDownloaderView: resize,
    clearDownloaderCache: clearCache,
}




