const { ipcMain, Menu, app, shell, clipboard } = require('electron');
const { onWebContentsMenu } = require('../common/contentsmenu');

let i18n;
let downloaderView;
function init(i18nObj, view) {
    downloaderView = view;
    i18n = i18nObj;
    ipcMain.on('item:more:menu', (_, resourceMeta) => itemMoreMenu(resourceMeta));
    ipcMain.on('operations:more:menu', (event) => operationsMoreMenu(event, i18n));
    ipcMain.on('item:copy-url:btn', (_, resourceMeta) => clipboard.writeText(resourceMeta.url));
    ipcMain.on('item:file-path:span', (_, resourceMeta) => shell.showItemInFolder(resourceMeta.filePath));
    view.webContents.on('context-menu', (event, params) => onWebContentsMenu(event, params, i18n));
}

const itemMoreMenu = (resourceMeta) => {
    let i18nList = i18n.list;
    const temlate = [
        {
            label: i18nList['preview'],
            click: () => {
                shell.openExternal(resourceMeta.sourceUrl)
            }
        },
        {
            label: i18nList['copy-source-url'],
            click: () => {
                clipboard.writeText(resourceMeta.sourceUrl);
            }
        },
        {
            label: i18nList['copy-url'],
            click: () => {
                clipboard.writeText(resourceMeta.url);
            }
        }
    ]

    if (resourceMeta.status === 'download-success') {
        temlate.unshift(
            {
                label: i18nList['open-file-path'],
                click: () => {
                    shell.showItemInFolder(resourceMeta.filePath);
                }
            });
    }

    Menu.buildFromTemplate(temlate).popup();
};

const operationsMoreMenu = (event, i18n) => {
    let i18nListOperations = i18n['list-operations'];
    const temlate = [
        {
            label: i18nListOperations['clear'],
            click: () => {
                event.sender.send('operations:more:clear');
            }
        },
    ]

    Menu.buildFromTemplate(temlate).popup();
};

module.exports = {
    itemOperationsInit: init
}