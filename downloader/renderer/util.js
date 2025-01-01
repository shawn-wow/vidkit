function extractUrl(text) {
    const urlRegex = /((http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:\/~+#]*[\w\-\@?^=%&\/~+#])?(?![\w]))/gi;
    const match = text.match(urlRegex);
    return match ? match[0] : "";
}

function formatFileSize(size) {
    if (size === null || size === undefined || isNaN(Number(size))) {
        return '-';
    }

    const value = Math.abs(Number(size));
    if (value === 0) return '0B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(value) / Math.log(1024));

    // Ensure we don't go out of bounds of the units array.
    if (i >= units.length) {
        return `${(value / Math.pow(1024, units.length - 1)).toFixed(2)} ${units[units.length - 1]}`;
    }

    return `${(value / Math.pow(1024, i)).toFixed(i ? 2 : 0)}${units[i]}`;
}

async function showInfoBox(options, callback) {
    //{ response: 1, checkboxChecked: false }
    let result = await ipcAPI.invoke('dialog:show:message', options);
    if (callback) {
        callback(result);
    }
    return result;
}

async function showErrorBox(content) {
    await ipcAPI.invoke('dialog:show:message', {
        type: 'error',
        title: i18nDialog['error-title'],
        message: content,
    });
}

function storeSet(key, value) {
    //console.log('#####:store:setting:', key, value);
    ipcAPI.send('store:setting', key, value);
}

function storeGet(key) {
    return ipcAPI.sendSync('store:getting', key);
}

function showQRCode(url) {
    const modal = document.getElementById('qrcodeModal');
    const container = document.getElementById('qrcodeContainer');
    container.innerHTML = ''; // 清空容器

    // 创建 canvas 元素
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // 生成二维码
    QRCode.toCanvas(canvas, url, {
        width: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function (error) {
        if (error) console.error(error);
    });

    modal.classList.remove('hidden');

    // 动态添加事件监听
    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => modal.classList.add('hidden');

    // 关闭按钮点击事件
    closeBtn.onclick = closeModal;

    // 背景点击事件
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

// left and top calculate is a problem
function showIndividualTips(message, left, top) {
    const messageToast = document.createElement('div');
    messageToast.innerHTML = `
      <div class="message-toast">
        <div class="message-text">${message}</div>
      </div>
    `;
    left && (messageToast.style.left = left + 'px');
    top && (messageToast.style.top = top + 'px');
    const destrory = () => {
        messageToast.remove();
    };
    requestAnimationFrame(() => {
        document.addEventListener('click', destrory);
        document.addEventListener('keydown', destrory);
    });
    document.body.appendChild(messageToast);
}

function showTips(message, left, top, timeout) {
    const messageToast = document.getElementById('messageToast')
    messageToast.querySelector('.message-text').textContent = message;
    left && (messageToast.style.left = left + 'px');
    top && (messageToast.style.top = top + 'px');
    messageToast.classList.remove('hidden');

    const hideMessage = () => {
        messageToast.classList.add('hidden');
        document.removeEventListener('click', hideMessage);
        document.removeEventListener('keydown', hideMessage);
    };

    requestAnimationFrame(() => {
        document.addEventListener('click', hideMessage);
        document.addEventListener('keydown', hideMessage);
    });

    // can also use setTimeout to hide the message after 8 seconds
    timeout && setTimeout(hideMessage, timeout);
}