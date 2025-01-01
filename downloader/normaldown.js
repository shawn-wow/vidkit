const { ipcMain, session } = require('electron');
const path = require('path');
const { renameDownloadFileWithTitle, logFormat } = require('../common/util');
const { parseUrlFromServer } = require('./parseServer');
const { registerDBCallback, toDB } = require('./db');
const { getDownloadPath } = require('./setting');

let resourceMetaMap = {};
let downloadItemMap = {};
let downloaderView;
let i18n;

function init(i18nObj, view) {
    i18n = i18nObj;
    downloaderView = view;
    registerDBCallback(deleteCallback, clearCallback);
    ipcMain.on('download:begin', (_, resourceMeta) => {
        beginDownload(resourceMeta, false);
    });
    ipcMain.on('download:retry', async (_, resourceMeta) => {
        beginDownload(resourceMeta, true);
    });
    ipcMain.on('download:cancel', async (_, resourceMeta) => {
        resourceMeta && downloadItemMap[resourceMeta.timestamp]?.cancel();
    });
    session.defaultSession.on('will-download', willDownload);
}

/////////////////////item download process/////////////////////
let isTest = false;
let count = 0;
let isTrue = true;
let sourceUrls = [
    'https://isorepublic.com/wp-content/uploads/2019/01/iso-republic-clouds-maple-tree.mp4',
    'https://isorepublic.com/wp-content/uploads/2019/09/iso-republic-animated-wrenches.mp4',
    'https://isorepublic.com/wp-content/uploads/2019/01/iso-republic-swift-moving-clouds.mp4',
    'https://isorepublic.com/wp-content/uploads/2018/03/isorepublic-free-video-camp-fire.mp4',
    'https://isorepublic.com/wp-content/uploads/2019/01/iso-republic-campfire-embers.mp4'
]

function useTestData(event, resourceMeta) {
    if (isTrue) {
        const index = (count++) % sourceUrls.length;
        resourceMeta['title'] = `Resource: ${sourceUrls[index].substring(51)}`;
        resourceMeta['sourceUrl'] = sourceUrls[index];
        //resourceMeta['thumbnail'] = 'https://www.electronjs.org/zh/assets/images/windows-taskbar-jumplist-150789129102203795fc34e12d8b0a3d.png';
        resourceMeta['status'] = 'parse-success';
    }
    isTrue = !isTrue;
    event.sender.send('parse:result', resourceMeta);
    toDB(resourceMeta);
}

function parse(event, resourceMeta) {
    resourceMeta['status'] = 'parse-failed';
    if (isTest) {
        useTestData(event, resourceMeta);
        return;
    }
    parseUrlFromServer(resourceMeta, () => {
        console.log('resourceMeta:', resourceMeta);
        if (resourceMeta.sourceUrl) {
            resourceMeta['status'] = 'parse-success';
        }
        event.sender.send('parse:result', resourceMeta);
        toDB(resourceMeta);
    });
}



ipcMain.on('parse:task', (event, resourceMeta) => {
    parse(event, resourceMeta);
});

function beginDownload(resourceMeta, isRetry) {
    const url = resourceMeta.sourceUrl;
    if (resourceMetaMap[url]) {
        console.log(logFormat('Simultaneously downloading a file multiple times', url));
        return;
    }
    resourceMetaMap[url] = resourceMeta;
    isRetry && toDB(resourceMeta);
    downloaderView.webContents.downloadURL(url);
}

const willDownload = async (_, downloadItem, webContents) => {
    const url = downloadItem.getURL();
    const resourceMeta = resourceMetaMap[url];
    delete resourceMetaMap[url];

    const fileExtension = path.extname(downloadItem.getFilename()) || '.mp4';
    const savedFilePath = path.join(getDownloadPath(), `${resourceMeta.timestamp}${fileExtension}`);;
    console.log(logFormat('Will download', savedFilePath));
    downloadItemMap[resourceMeta.timestamp] = downloadItem;

    console.log('#####:download:begin', resourceMeta);

    //webContents.send('download:resource:meta:binded', resourceMeta);
    resourceMeta.status = 'downloading';
    downloadItem.setSavePath(savedFilePath);

    downloadItem.on('updated', (_, state) => {
        if (state === 'interrupted') {
            console.log(logFormat('Download is interrupted, can be resumed'));
        } else if (state === 'progressing') {
            if (downloadItem.isPaused()) {
                console.log('Download is paused');
            } else {
                resourceMeta.totalBytes = downloadItem.getTotalBytes();
                resourceMeta.receivedBytes = downloadItem.getReceivedBytes();
                webContents.send('download:progress', resourceMeta);
            }
        }
    })
    downloadItem.once('done', async (_, state) => {
        if (!downloadItemMap[resourceMeta.timestamp]) {
            //may user has deleted the downloading task, then we do not need to send the result to render process.
            console.log(logFormat('Download canceled by delete operation', resourceMeta.timestamp, state));
            return;
        }
        delete downloadItemMap[resourceMeta.timestamp];
        console.log(logFormat('Download done', resourceMeta.timestamp, state));
        if (state === 'completed') {
            resourceMeta.status = 'download-success';
            console.log('#####:renameDownloadFileWithTitle:', savedFilePath, resourceMeta.title)
            resourceMeta.filePath = await renameDownloadFileWithTitle(savedFilePath, resourceMeta.title);
            console.log('#####:resourceMeta.filePath11:', resourceMeta.filePath)
        } else {
            resourceMeta.status = 'download-failed';
            resourceMeta['error'] = state;
        }
        resourceMeta['finishedAt'] = Date.now();
        webContents.send('download:result', resourceMeta);
        toDB(resourceMeta);
    })
};

function deleteCallback(resourceMeta) {
    const downloadItem = downloadItemMap[resourceMeta.timestamp];
    if (downloadItem) {
        // must delete befor cancel, then we can know the task is deleted when the download is done(cancel).  
        delete downloadItemMap[resourceMeta.timestamp];
        downloadItem && 'progressing' === downloadItem.getState() && downloadItem.cancel();
    }
}

function clearCallback() {
    const progressingItems = Object.values(downloadItemMap).filter(item => 'progressing' === item.getState());
    // must delete befor cancel, then we can know the task is deleted when the download is done(cancel).
    downloadItemMap = {};
    progressingItems.forEach(item => item.cancel());
}

module.exports = {
    normalDownInit: init,
}