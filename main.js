const { app, BrowserWindow, ipcMain, shell, WebContentsView, BaseWindow } = require('electron');
const path = require('path');
const {frameInit} = require('./common/frame')
const { createDownloaderView, resizeDownloaderView } = require('./downloader/downloader')
const i18n = require('./assets/zh.json');

let mainWindow;
let currentView;
let downloaderView;

function createWindow() {
    mainWindow = new BaseWindow({
        width: 800,
        minWidth: 600,
        height: 600,
        minHeight: 300,
        frame: false,
        // show: false
    });
    frameInit(i18n, mainWindow);
    currentView = downloaderView = createDownloaderView(i18n, mainWindow);
    mainWindow.contentView.addChildView(currentView);
    mainWindow.show();
    // Handle window resizing

    mainWindow.on('resize', resizeView);
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BaseWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


const resizeView = () => {
    if (currentView === downloaderView) {
        resizeDownloaderView();
    }
};
