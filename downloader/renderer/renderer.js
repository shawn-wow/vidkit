let appConfig;
let i18n;
let i18nTitleBar;
let i18nDialog;
let i18nNewTask;
let i18nParse;
let i18nChangePath;
let i18nFilter;
let i18nSearch;
let i18nListOperations;
let i18nList;
let i18nDownloadDone;

let resourceMap = {};
let resourceMetaMap = {};

const AUTO_DOWNLOAD_KEY = 'AutoDownload';
const BB_DOWN_KEY = 'BBDown';

const minBtn = document.getElementById('minBtn');
const maxBtn = document.getElementById('maxBtn');
const closeBtn = document.getElementById('closeBtn');
const menuBtn = document.getElementById('menuBtn');
const urlInput = document.getElementById('urlInput');
const newTaskBtn = document.getElementById('newTaskBtn');
const resourceList = document.getElementById('resourceList');
const bbdownCb = document.getElementById('bbdownCb');
//const autoDownloadCb = document.getElementById('autoDownloadCb');
const downloadPath = document.getElementById('downloadPath');
const changePathBtn = document.getElementById('changePathBtn');
const statusFilter = document.getElementById('statusFilter');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');

const selectAllBtn = document.getElementById('selectAllBtn');
const selectInverseBtn = document.getElementById('selectInverseBtn');
const deleteBtn = document.getElementById('deleteBtn');
const moreBtn = document.getElementById('moreBtn');

/////////////////////init/////////////////////
async function init() {
    appConfig = await ipcAPI.invoke('app:downloader:init');
    console.log('@@@@@@initFunction:appConfig:', appConfig);
    i18nInit();
    initResourceList();
};

function i18nInit() {
    i18n = appConfig.i18n;
    i18nDialog = i18n['dialog'];
    i18nTitleBar = i18n['title-bar'];
    i18nNewTask = i18n['new-task'];
    i18nParse = i18n['parse'];
    i18nChangePath = i18n['change-path'];
    i18nFilter = i18n['filter'];
    i18nSearch = i18n['search'];

    i18nListOperations = i18n['list-operations'];
    i18nList = i18n['list'];
    i18nDownloadDone = i18n['download-done'];

    document.getElementById('appVersion').textContent = appConfig.version;
    minBtn.title = i18nTitleBar['minimize'];
    maxBtn.title = i18nTitleBar['maximize'];
    closeBtn.title = i18nTitleBar['close'];
    menuBtn.querySelector('img').title = i18nTitleBar['menu'];
    menuBtn.querySelector('img').alt = i18nTitleBar['menu'];

    bbdownCb.checked = storeGet(BB_DOWN_KEY) ?? true;
    document.getElementById('bbdownCbLabel').textContent = i18nParse['bbdown-cb-label'];

    urlInput.placeholder = bbdownCb.checked ? i18nNewTask['input-bb-placeholder'] : i18nNewTask['input-placeholder'];
    newTaskBtn.textContent = i18nNewTask['button'];

    //autoDownloadCb.checked = storeGet(AUTO_DOWNLOAD_KEY) ?? true;
    //autoDownloadCb.disabled = bbdownCb.checked;
    //document.getElementById('autoDownloadCbLabel').textContent = i18nParse['auto-download-cb-label'];
    downloadPath.textContent = appConfig.downloadDir;
    downloadPath.title = `${appConfig.downloadDir}\r${i18nChangePath['download-path']}`;
    changePathBtn.textContent = i18nChangePath['button'];

    for (let option of statusFilter.options) {
        option.text = i18nFilter[option.value];
    }
    searchInput.placeholder = i18nSearch['input-placeholder'];
    clearSearch.title = i18nSearch['clear'];

    selectAllBtn.textContent = i18nListOperations['select-all'];
    selectAllBtn.title = i18nListOperations['select-all-title'];
    selectInverseBtn.textContent = i18nListOperations['select-inverse'];
    deleteBtn.textContent = i18nListOperations['delete'];
    moreBtn.title = i18nListOperations['more'];
}
function initResourceList() {
    resourceList.innerHTML = '';
    resourceMetaMap = appConfig.history;
    if (Object.keys(resourceMetaMap).length === 0) {
        return;
    }
    const entries = Object.entries(resourceMetaMap);

    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    entries.forEach(([_, resourceMeta]) => {
        const item = createItem(resourceMeta);
        item && resourceList.appendChild(item);
    });
}

function createItem(resourceMeta) {
    if (isBBDown(resourceMeta)) {
        return createItemByStatus(resourceMeta, bbdownItemInit);
    }
    let item;
    if (resourceMeta.status === 'download-success') {
        item = createItemByStatus(resourceMeta,
            (resourceMeta) => initDoneStatus(resourceMeta, updateItemToDownloadSuccess));
    } else if (resourceMeta.status === 'download-failed') {
        item = createItemByStatus(resourceMeta,
            (resourceMeta) => initDoneStatus(resourceMeta, updateItemToDownloadFailed));
    } else if (resourceMeta.status === 'parse-success') {
        item = createItemByStatus(resourceMeta, updateItemToParseSuccess);
    } else if (resourceMeta.status === 'parse-failed') {
        item = createItemByStatus(resourceMeta, updateItemToParseFailed);
    }
    return item;
}

function createItemByStatus(resourceMeta, updateByStatusFun) {
    const timestamp = resourceMeta.timestamp;
    const item = document.createElement('div');
    item.dataset.timestamp = timestamp;
    resourceMap[timestamp] = item;
    updateByStatusFun(resourceMeta);
    return item;
}

function initDoneStatus(resourceMeta, doneStatusFun) {
    item = meta2item(resourceMeta)
    item.innerHTML = `
        <input type="checkbox" class="checkbox-input">
        <img src="${resourceMeta.thumbnail}" class="thumb" alt="${i18nList['thumb-alt']}" title="${resourceMeta.url}">
        <div class="content">
            <div class="title">${resourceMeta.title}</div>
            <div class="action-btns"></div>
            <div class="progress-area">
                <div class="progress-info"></div>
            </div>
        </div>
    `;
    doneStatusFun(resourceMeta);
}

init();

/////////////////////title bar/////////////////////
minBtn.addEventListener('click', () => {
    ipcAPI.send('window:minimize');
});

maxBtn.addEventListener('click', async () => {
    updateMaximizeStatus(await ipcAPI.invoke('window:maximize'));
});
ipcAPI.on('window:maximize:changed', (_, isMaximized) => {
    updateMaximizeStatus(isMaximized);
});
function updateMaximizeStatus(isMaximized) {
    maxBtn.innerHTML = isMaximized ? '❐' : '□';
    maxBtn.title = isMaximized ? i18nTitleBar['restore'] : i18nTitleBar['maximize'];
}

closeBtn.addEventListener('click', () => {
    //need judge the download task is done or not
    showInfoBox({
        type: 'question',
        message: i18nDialog['close-download-warning'],
        buttons: [i18nDialog['close-download-btn-no'], i18nDialog['close-download-btn-ok']],
        cancelId: 0
    }, (result) => {
        console.log('@@@@@@closeBtn:', result);
        result.response === 1 && ipcAPI.send('window:close');
    });
});

menuBtn.addEventListener('click', async () => {
    ipcAPI.send('app:menu:popup');
});

/////////////////////button event/////////////////////
urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        newTaskBtn.click();
    }
});
urlInput.addEventListener('dblclick', function () {
    urlInput.select();
});
newTaskBtn.addEventListener('click', async () => {
    const url = extractUrl(urlInput.value);
    console.log('@@@@@@url:', url);
    if (isOnlyBB()) {
        dealBBTask(url);
    } else {
        dealNormalTask(url);
    }
    //urlInput.value = '';
});
bbdownCb.addEventListener('change', () => {
    console.log('@@@@@@bbdownCb:', bbdownCb.checked);
    storeSet(BB_DOWN_KEY, bbdownCb.checked);
    urlInput.placeholder = bbdownCb.checked ? i18nNewTask['input-bb-placeholder'] : i18nNewTask['input-placeholder'];
    //autoDownloadCb.disabled = bbdownCb.checked;
});
// autoDownloadCb.addEventListener('change', () => {
//     storeSet(AUTO_DOWNLOAD_KEY, autoDownloadCb.checked);
// });

downloadPath.addEventListener("click", () => ipcAPI.send('open:file', downloadPath.textContent));
changePathBtn.addEventListener("click", () => ipcAPI.send('download:dir:setting'));
ipcAPI.on('download:dir:update', (_, downloadDir) => {
    downloadPath.textContent = downloadDir;
    downloadPath.title = `${i18nChangePath['download-path']}${downloadDir}`;
});

/////////////////////filter search/////////////////////
function clearFilter() {
    statusFilter.value = 'all';
    searchInput.value = '';
    clearSearch.classList.remove('show');
    filterItems();
}
statusFilter.addEventListener('change', filterItems);
searchInput.addEventListener('input', filterItems);

searchInput.addEventListener('input', () => {
    clearSearch.classList.toggle('show', searchInput.value.length > 0);
});

clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    clearSearch.classList.remove('show');
    filterItems();
});

function matchStatus(status, dataStatus) {
    if (status === 'all') {
        return true;
    } else if (status === 'download-success') {
        return dataStatus === 'download-success';
    } else if (status === 'downloading') {
        return dataStatus === 'downloading' || dataStatus === 'parse-success';
    } else { //'download-failed'
        return dataStatus === 'parse-failed' || dataStatus === 'download-failed';
    }
}

function filterItems() {
    const status = statusFilter.value.toLowerCase();
    const keyword = searchInput.value.trim().toLowerCase();
    const items = document.querySelectorAll('.resource-item');

    items.forEach(item => {
        const resourceMeta = item2meta(item);
        if (!matchStatus(status, resourceMeta.status)) {
            item.style.display = 'none';
            return;
        }
        const matchKeyword = !keyword ||
            resourceMeta.title?.toLowerCase().includes(keyword) ||
            resourceMeta.url?.toLowerCase().includes(keyword);

        item.style.display = matchKeyword ? '' : 'none';
    });
}
/////////////////////batch operations/////////////////////
function showSelectedTips(focusElement, selectedCount) {
    const message = `${i18nListOperations['selected-tips']}${selectedCount}`;
    const left = focusElement.offsetLeft - 10;
    const top = focusElement.offsetTop + focusElement.offsetHeight + 10;
    const selectedToast = document.getElementById('selectedToast')
    selectedToast.querySelector('.message-text').textContent = message;
    selectedToast.style.left = left + 'px';
    selectedToast.style.top = top + 'px';
    selectedToast.classList.remove('hidden');

    focusElement.addEventListener('mouseleave', () => {
        selectedToast.classList.add('hidden');
    }, { once: true });
}

function getDisplayItemCheckboxes() {
    const checkboxes = [];
    let unCheckedCount = 0;
    let checkedCount = 0;
    Object.values(resourceMap).forEach(item => {
        if (item.style.display === 'none') {
            return;
        }
        const checkbox = item.querySelector('.checkbox-input:not([disabled])');
        if (checkbox) {
            checkboxes.push(checkbox);
            if (!checkbox.checked) {
                unCheckedCount++;
            } else {
                checkedCount++;
            }
        }
    }
    );
    return {
        checkboxes,
        checkedCount,
        unCheckedCount
    };
}

selectAllBtn.addEventListener('click', () => {
    const { checkedCount, unCheckedCount, checkboxes } = getDisplayItemCheckboxes();
    const allChecked = unCheckedCount === 0;
    const displayCount = checkedCount + unCheckedCount;
    checkboxes.forEach(cb => cb.checked = !allChecked);
    displayCount > 0 && showSelectedTips(selectAllBtn, !allChecked ? checkboxes.length : 0);
});

selectInverseBtn.addEventListener('click', () => {
    const { checkedCount, unCheckedCount, checkboxes } = getDisplayItemCheckboxes();
    checkboxes.forEach(cb => cb.checked = !cb.checked);
    const displayCount = checkedCount + unCheckedCount;
    displayCount > 0 && showSelectedTips(selectInverseBtn, unCheckedCount);
});

function clearAllData() {
    resourceList.innerHTML = '';
    resourceMap = {};
    resourceMetaMap = {};
    ipcAPI.send('clear:resources');
}

function getDisplayCheckedItems() {
    const checkedItems = [];
    Object.values(resourceMap).forEach(item => {
        if (item.style.display !== 'none') {
            const checkbox = item.querySelector('.checkbox-input:not([disabled])');
            checkbox && checkbox.checked && checkedItems.push(item);
        }
    });
    return checkedItems;
}
deleteBtn.addEventListener('click', () => {
    const checkedItems = getDisplayCheckedItems();
    if (checkedItems.length === 0) return;

    showInfoBox({
        type: 'warning',
        message: `${checkedItems.length}${i18nDialog['delete-task-warning']}`,
        buttons: [i18nDialog['delete-task-btn-no'], i18nDialog['delete-task-btn-ok']],
        cancelId: 0
    }, (result) => {
        if (result.response === 0) {
            return;
        }
        //clear resourceMap and resourceMetaMap firstly, then update to main process
        if (checkedItems.length === resourceList.children.length) {
            clearAllData();
            return;
        }

        const deleteResources = [];
        checkedItems.forEach(cb => {
            const item = cb.closest('.resource-item');
            const timestamp = item.dataset.timestamp;
            item.remove();
            delete resourceMap[timestamp];
            deleteResources.push(resourceMetaMap[timestamp]);
            delete resourceMetaMap[timestamp];

        });
        ipcAPI.send('delete:resources', deleteResources);
    });
});

moreBtn.addEventListener('click', () => {
    ipcAPI.send('operations:more:menu');
});
ipcAPI.on('operations:more:clear', () => {
    if (resourceList.children.length === 0) {
        return;
    }
    showInfoBox({
        type: 'warning',
        message: `${resourceList.children.length}${i18nDialog['clear-data-warning']}`,
        buttons: [i18nDialog['clear-data-btn-no'], i18nDialog['clear-data-btn-ok']],
        cancelId: 0
    }, (result) => {
        result.response === 1 && clearAllData();
    });

});

/////////////////////task process/////////////////////
function isOnlyBB() {
    return bbdownCb.checked;
}

function dealNormalTask(url) {
    if (!url) {
        showErrorBox(i18nNewTask['invalid-url']);
        return;
    }
    const resourceMeta = {
        url: url,
        timestamp: Date.now(),
        thumbnail: '../../assets/default-thumbnail.png'
    }
    initTask(resourceMeta, updateItemToParsing, 'parse:task');
}
function dealBBTask(url) {
    if (!url.includes("bilibili.com")) {
        showErrorBox(i18nNewTask['invalid-bb-url']);
        return;
    }
    const resourceMeta = {
        timestamp: Date.now(),
        url: url,
        sourceUrl: 'bbdown',
        status: 'downloading',
        thumbnail: '../../assets/default-thumbnail.png'
    };
    initTask(resourceMeta, bbdownItemInit, 'bbdown:task:start');
}

function initTask(resourceMeta, itemInitFun, newTaskChannel) {
    clearFilter();
    const timestamp = resourceMeta.timestamp;
    resourceMetaMap[timestamp] = resourceMeta;

    const item = document.createElement('div');
    item.dataset.timestamp = timestamp;
    resourceMap[timestamp] = item;
    itemInitFun(resourceMeta);
    const resourceList = document.getElementById('resourceList');
    resourceList.insertBefore(item, resourceList.firstChild);
    resourceList.scrollTop = 0;
    ipcAPI.send(newTaskChannel, resourceMeta);
}

function resourceExisted(resourceMeta) {
    if (!resourceMap[resourceMeta.timestamp]) {
        console.log('@@@@@@Task might be deleted: ', resourceMeta);
        return false;
    }
    return true;
}
const onIpcParseResult = (resourceMeta) => {
    resourceMetaMap[resourceMeta.timestamp] = resourceMeta;
    if (resourceMeta.status === "parse-success") {
        updateItemToParseSuccess(resourceMeta);
        // autoDownloadCb.checked && 
        meta2item(resourceMeta).querySelector('.action-btn.download').click();
    } else {
        updateItemToParseFailed(resourceMeta);
    }
};
const onIpcDownloadProgress = (resourceMeta) => {
    if (!resourceMap[resourceMeta.timestamp]) {
        console.log('@@@@@@Task might be deleted: ', resourceMeta);
        return;
    }
    if (resourceMetaMap[resourceMeta.timestamp].totalBytes === undefined) {
        //first time received data
        resourceMetaMap[resourceMeta.timestamp] = resourceMeta;
        updateItemToDownloading(resourceMeta);
    }
    updateProgress(resourceMeta);
}
const onDownloadResult = (resourceMeta) => {
    if (!resourceMap[resourceMeta.timestamp]) {
        console.log('@@@@@@Task might be deleted: ', resourceMeta);
        return;
    }
    resourceMetaMap[resourceMeta.timestamp] = resourceMeta;

    if (resourceMeta.status === 'download-success') {
        updateItemToDownloadSuccess(resourceMeta);
    } else {
        updateItemToDownloadFailed(resourceMeta);
    }
};

const onBBDownloading = (resourceMeta, progressText) => {
    console.log('@@@@@@onBBDownloading:', resourceMeta);
    const item = meta2item(resourceMeta);
    resourceMeta.title && (item.querySelector('.title').textContent = resourceMeta.title);

    if (resourceMeta.status === 'downloading') {
        progressText && (item.querySelector('.progress-text').textContent = progressText);
    } else {
        bbdownBtnGroupUpdate(item, resourceMeta);
    }
}

ipcAPI.on('parse:result', (_, resourceMeta) => {
    console.log('@@@@@@parse:result:', resourceMeta);
    resourceExisted(resourceMeta) && onIpcParseResult(resourceMeta);
});
ipcAPI.on('download:progress', (_, resourceMeta) => {
    resourceExisted(resourceMeta) && onIpcDownloadProgress(resourceMeta);
});
ipcAPI.on('download:result', (_, resourceMeta) => {
    console.log('@@@@@@download:result:', resourceMeta);
    resourceExisted(resourceMeta) && onDownloadResult(resourceMeta);
});

ipcAPI.on('bbdown:task:log', (_, resourceMeta, progressText) => {
    console.log('@@@@@@download:result:', resourceMeta);
    resourceExisted(resourceMeta) && onBBDownloading(resourceMeta, progressText);
});

/////////////////////update bbdown item /////////////////////
function bbdownItemInit(resourceMeta) {
    //console.log('@@@@@@bbdownItemInit:', resourceMeta);
    const item = meta2item(resourceMeta);
    item.className = 'resource-item';
    item.innerHTML = `
    <input type="checkbox" class="checkbox-input">
    <img src="${resourceMeta.thumbnail}" class="thumb" alt="${i18nList['thumb-alt']}" title="${resourceMeta.url}">
    <div class="content">
        <div class="title">${resourceMeta.title || resourceMeta.url}</div>
        <div class="action-btns"></div>
        <div class="progress-area">
            <span class="progress-text"></span>
        </div>
    </div>
`;
    bbdownBtnGroupUpdate(item, resourceMeta);
}
function bbdownBtnGroupUpdate(item, resourceMeta) {
    const actionBtns = item.querySelector('.action-btns');
    let downloadBtn;
    let subClass;
    let downloadListener;

    if (resourceMeta.status === 'download-success') {
        downloadBtn = 'open-btn';
        subClass = 'open';
        downloadListener = addOpenListener;
        item.querySelector('.progress-area').innerHTML = `<span class="file-path" title="${resourceMeta.filePath}">${resourceMeta.filePath}</span>`;
        addFilePathListener(item, resourceMeta);
    } else if (resourceMeta.status === 'download-failed') {
        downloadBtn = 'redownload-btn';
        subClass = 'download';
        downloadListener = addReDownloadListener;
        item.querySelector('.progress-text').textContent = resourceMeta.error;
    } else {//downloading 
        downloadBtn = 'cancel-btn';
        subClass = 'cancel';
        downloadListener = addCancelDownloadListener;
    }

    actionBtns.innerHTML = `
    <button class="action-btn ${subClass}">${i18nList[downloadBtn]}</button>
    <button class="action-btn copy-url">${i18nList['copy-url-btn']}</button>
    `;
    downloadListener(item, resourceMeta);
    addCopyUrlListener(item, resourceMeta);
    addThumbListener(item, resourceMeta);
}


/////////////////////update item by status/////////////////////
function updateItemToParsing(resourceMeta) {
    //console.log('@@@@@@updateItemToParsing:', resourceMeta);
    const item = meta2item(resourceMeta);
    item.className = 'resource-item parsing';
    item.innerHTML = `
        <input type="checkbox" class="checkbox-input" disabled>
        <div class="parsing-icon">${i18nParse['parsing']}</div>
        <div class="content">
            <div class="url">${resourceMeta.url}</div>
        </div>
    `;
}

function updateBtnGroup(item, resourceMeta) {
    const actionBtns = item.querySelector('.action-btns');

    let downloadBtn;
    let subClass;
    let downloadListener;

    if (resourceMeta.status === 'download-success') {
        downloadBtn = 'open-btn';
        subClass = 'open';
        downloadListener = addOpenListener; 
        addFilePathListener(item, resourceMeta);
    } else if (resourceMeta.status === 'download-failed') {
        downloadBtn = 'redownload-btn';
        subClass = 'download';
        downloadListener = addReDownloadListener;
    } else if (resourceMeta.status === 'downloading') {
        downloadBtn = 'cancel-btn';
        subClass = 'cancel';
        downloadListener = addCancelDownloadListener;
    } else {
        downloadBtn = 'download-btn';
        subClass = 'download';
        downloadListener = addDownloadListener;
    }
    actionBtns.innerHTML = `
        <button class="action-btn ${subClass}">${i18nList[downloadBtn]}</button>
        <button class="action-btn send-to-phone"  title="${i18nList['send2phone-btn-title']}">${i18nList['send2phone-btn']}</button>
        <button class="action-btn more" title="${i18nList['more-btn']}">•••</button>
    `;
    downloadListener(item, resourceMeta);
    addSendToPhoneListener(item, resourceMeta);
    addMoreListener(item, resourceMeta);
    addThumbListener(item, resourceMeta);
}

function updateItemToParseSuccess(resourceMeta) {
    const item = meta2item(resourceMeta);
    item.className = 'resource-item';
    item.innerHTML = `
        <input type="checkbox" class="checkbox-input">
        <img src="${resourceMeta.thumbnail}" class="thumb" alt="${i18nList['thumb-alt']}" title="${resourceMeta.url}">
        <div class="content">
            <div class="title">${resourceMeta.title}</div>
            <div class="action-btns"></div>
        </div>
    `;

    updateBtnGroup(item, resourceMeta);
}

function updateItemToParseFailed(resourceMeta) {
    item = meta2item(resourceMeta)
    const currentTime = new Date().toLocaleString();
    item.className = 'resource-item failed';
    item.innerHTML = `
        <input type="checkbox" class="checkbox-input">
        <button class="retry-btn">${i18nParse['parse']}</button>
        <div class="content">
            <div class="url">${resourceMeta.url}</div>
            <div class="failed-message">[${currentTime}] ${i18nParse['parse-failed']}</div>
        </div>
    `;

    item.querySelector('.retry-btn').addEventListener('click', () => {
        const rm = { timestamp: resourceMeta.timestamp, url: resourceMeta.url };
        resourceMetaMap[rm.timestamp] = rm;
        updateItemToParsing(rm);
        ipcAPI.send('parse:task', rm);
    });
    item.querySelector('.content .url').addEventListener('click', () => {
        ipcAPI.send('open:external', resourceMeta.url);
    });
}

function updateItemToDownloading(resourceMeta) {
    item = meta2item(resourceMeta)
    const progressArea = item.querySelector('.progress-area') ?? document.createElement('div');
    progressArea.className = 'progress-area';
    progressArea.innerHTML = `
        <div class="progress-container">
            <div class="progress-bar">
                <div class="progress" style="width: 0%"></div>
            </div>
            <span class="progress-text">0%</span>
        </div>
        <div class="progress-info">
            <span class="size-info">${formatFileSize(resourceMeta.totalBytes)} | ${formatFileSize(resourceMeta.receivedBytes)}</span>
        </div>   
    `;
    item.querySelector('.content').appendChild(progressArea);
    updateBtnGroup(item, resourceMeta);
}

function updateProgress(resourceMeta) {
    const item = meta2item(resourceMeta);
    let progress = `${(resourceMeta.receivedBytes * 100 / resourceMeta.totalBytes).toFixed(1)}%`;

    item.querySelector('.progress').style.width = `${progress}`;
    item.querySelector('.progress-text').textContent = progress;

    const progressSizeInfo = item.querySelector('.progress-info span:last-child');
    progressSizeInfo.textContent = `${formatFileSize(resourceMeta.totalBytes)} | ${formatFileSize(resourceMeta.receivedBytes)}`;
}


function updateItemToDownloadSuccess(resourceMeta) {
    const item = meta2item(resourceMeta);
    item.className = 'resource-item success';

    const progressArea = item.querySelector('.progress-area') ?? item.querySelector('.content').appendChild(document.createElement('div'));
    progressArea.className = 'progress-area';
    progressArea.innerHTML = `
        <div class="progress-info">
            <span class="file-path" title="${resourceMeta.filePath}">${resourceMeta.filePath}</span>
            <span>${formatFileSize(resourceMeta.totalBytes)} [${new Date().toLocaleString()}]</span>
        </div>   
    `;

    updateBtnGroup(item, resourceMeta);
}

function updateItemToDownloadFailed(resourceMeta) {
    const item = meta2item(resourceMeta);
    item.className = 'resource-item download-failed';

    const progressArea = item.querySelector('.progress-area') ?? item.querySelector('.content').appendChild(document.createElement('div'));
    progressArea.className = 'progress-area';
    progressArea.innerHTML = `
        <div class="progress-info">
            <span class="failed-message">[${i18nDownloadDone[resourceMeta.error] ?? i18nDownloadDone['default'] + resourceMeta.error}, ${new Date().toLocaleString()}] ${i18n['downloading-fail-notification']}</span>
        </div>   
    `;
    updateBtnGroup(item, resourceMeta);
}
///////////////////// item listener/////////////////////
function addThumbListener(item, resourceMeta) {
    const thumb = item.querySelector('.thumb');
    if (thumb) {
        thumb.addEventListener('click', () => {
            ipcAPI.send('open:external', resourceMeta.url);
        });
    }
}
function addDownloadListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.download');
    if (btn) {
        btn.addEventListener('click', () => {
            ipcAPI.send('download:begin', resourceMeta);
        });
    }
}

function addReDownloadListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.download');
    if (btn) {
        btn.addEventListener('click', () => {
            if (isBBDown(resourceMeta)) {
                dealBBTask(resourceMeta.url);
            } else {
                dealNormalTask(resourceMeta.url);
            }
            // reback to normal status
            // item.className = 'resource-item';
            // const rm = {
            //     timestamp: resourceMeta.timestamp,
            //     url: resourceMeta.url,
            //     sourceUrl: resourceMeta.sourceUrl,
            //     title: resourceMeta.title,
            //     thumbnail: resourceMeta.thumbnail,
            //     status: 'parse-success'
            // };
            // resourceMetaMap[rm.timestamp] = rm;
            // ipcAPI.send('download:begin', rm);
        });
    }
}

function addCancelDownloadListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.cancel');
    if (btn) {
        btn.addEventListener('click', () => {
            showInfoBox({
                type: 'question',
                message: i18nDialog['cancel-task-warning'],
                buttons: [i18nDialog['cancel-task-btn-no'], i18nDialog['cancel-task-btn-ok']],
                cancelId: 0
            }, (result) => {
                result.response === 1 &&
                    ipcAPI.send(isBBDown(resourceMeta) ? 'bbdown:task:stop' : 'download:cancel', resourceMeta);
            });
        });
    }
}

function addOpenListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.open');
    if (btn) {
        btn.addEventListener('click', () => {
            ipcAPI.send('open:file', resourceMeta.filePath);
        });
    }
}

function addSendToPhoneListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.send-to-phone');
    if (btn) {
        btn.addEventListener('click', () => {
            showQRCode(resourceMeta.sourceUrl);
        });
    }
}

function addMoreListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.more');
    if (btn) {
        btn.addEventListener('click', (e) => {
            ipcAPI.send('item:more:menu', resourceMeta);
        });
    }
}

function addCopyUrlListener(item, resourceMeta) {
    const btn = item.querySelector('.action-btn.copy-url');
    if (btn) {
        btn.addEventListener('click', (e) => {
            ipcAPI.send('item:copy-url:btn', resourceMeta);
        });
    }
}

function addFilePathListener(item, resourceMeta) {
    const span = item.querySelector('.progress-area .file-path');
    if (span) {
        span.addEventListener('click', (e) => {
            ipcAPI.send('item:file-path:span', resourceMeta);
        });
    }
}

function meta2item(meta) {
    return resourceMap[meta.timestamp];
}

function item2meta(item) {
    return resourceMetaMap[item.dataset.timestamp];
}

function isBBDown(resourceMeta) {
    return resourceMeta.sourceUrl === 'bbdown';
}