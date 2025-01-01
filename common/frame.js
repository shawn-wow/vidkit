const { app, ipcMain, Menu, shell, dialog, Notification } = require('electron');
const {clearDownloaderCache}  = require('../downloader/downloader')
let i18n;
let baseWindow;

function init(i18nObj, window) {
    i18n = i18nObj;
    baseWindow = window;
    ipcMain.on('app:menu:popup', (event) => settingsMenu(event));
    ipcMain.on('open:file', async (_, filePath) => {
        console.log('#####:open-file', filePath);
        filePath && shell.openPath(filePath);
    });

    ipcMain.on('open:external', async (_, sourceUrl) => {
        console.log('#####:open:external', sourceUrl);
        sourceUrl && shell.openExternal(sourceUrl);
    });
   
    /////////////////////title bar/////////////////////
    ipcMain.on('window:minimize', () => {
        baseWindow.minimize();
    })

    ipcMain.handle('window:maximize', (event) => {
        if (baseWindow.isMaximized()) {
            baseWindow.unmaximize();
            return false;
        }
        baseWindow.maximize();
        return true;
    })

    ipcMain.on('window:close', () => {
        baseWindow.close();
    })

    ipcMain.handle('dialog:show:message', async (_, options) => {
        //res : { response: 1, checkboxChecked: false }
        return await dialog.showMessageBox(baseWindow, options);
    });

    ipcMain.on('notification:show', (_, title, body) => {
        console.log('#####:notification:show:', title, body);
        if (Notification.isSupported()) {
            new Notification({ title, body }).show();
        }
    });

}

const clearCache = () => {
    clearDownloaderCache();
}
const settingsMenu = (event) => {
    let i18nMenu = i18n.menu;
    const temlate = [
        {
            label: i18nMenu['help'],
            icon: 'assets/menu/help.png',
            click: () => {
                console.log('help');
            }
        },
        {
            label: `${i18nMenu['upgrade']}[${i18nMenu['current-version']}${app.getVersion()}]`,
            icon: 'assets/menu/upgrade.png',
            click: () => {
                console.log('upgrade');
            }
        },
        {
            label: i18nMenu['clear-cache'],
            icon: 'assets/menu/clear-cache.png',
            click: clearCache
        },
        {
            label: i18nMenu['love'],
            icon: 'assets/menu/love.png',
            click: () => {
                console.log('love');
            }
        }
    ]

    Menu.buildFromTemplate(temlate).popup();
};

module.exports = { 
    frameInit:init,
}