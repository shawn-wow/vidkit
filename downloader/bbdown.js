const { ipcMain } = require('electron');
const path = require('path');
const pty = require('node-pty');
const stripAnsi = require('strip-ansi');
const { logFormat, renameDownloadFileWithTitle} = require('../common/util');
const { getDownloadPath } = require('./setting');
const { registerDBCallback, toDB } = require('./db');

const bbdown = path.join(__dirname, `../bin/BBDown${process.platform === 'win32' && '.exe'}`);
let processMap = {};
const titleKey = '视频标题:';
const successKey = '任务完成';
const position = 0;



function init() {
  ipcMain.on('bbdown:task:start', (event, resourceMeta) => {
    toDB(resourceMeta);
    startBB(event, resourceMeta, getDownloadPath());
  });

  ipcMain.on('bbdown:task:stop', (event, resourceMeta) => {
    stopBB(resourceMeta);
  });
  registerDBCallback(deleteCallback, clearCallback);
}

function startBB(event, resourceMeta, downloadPath) {
  const fileName = `${resourceMeta.timestamp}`;
  const savedFilePath = path.join(downloadPath, `${fileName}.mp4`);
  const ptyProcess = pty.spawn(bbdown, ['--work-dir', downloadPath, '--file-pattern', fileName, resourceMeta.url], {
    name: 'xterm-color',
    cols: 500,
    rows: 500,
    useConpty: false

  });
  processMap[resourceMeta.timestamp] = ptyProcess;

  let buffer = '';
  ptyProcess.onData(data => {
    buffer += stripAnsi(data);
    const lines = buffer.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      // console.log('bbdown:task:log', line);
      let index;
      if (!resourceMeta.title && (index = line.indexOf(titleKey, position)) >= 0) {
        resourceMeta.title = line.substring(titleKey.length + index).trim();
      }
      event.sender.send('bbdown:task:log', resourceMeta, line);
    }
    if (buffer.indexOf(successKey) >= 0) {
      resourceMeta.status = 'download-success'
    }
    buffer = lines[lines.length - 1];
  });

  ptyProcess.onExit(async (code, signal) => {
    if (!processMap[resourceMeta.timestamp]) {
      //may user has deleted the downloading task, then we do not need to send the result to render process.
      console.log(logFormat('Download canceled by delete operation', resourceMeta.timestamp), code, signal);
      return;
    }
    delete processMap[resourceMeta.timestamp];
    (resourceMeta.status === 'download-success') ?? (resourceMeta.status = 'download-failed');
    if (resourceMeta.status === 'download-success') {
      resourceMeta.filePath = await renameDownloadFileWithTitle(savedFilePath, resourceMeta.title);
      event.sender.send('bbdown:task:log', resourceMeta);
    } else {
      resourceMeta.status = 'download-failed';
      resourceMeta['error'] = `Download fail, code[${JSON.stringify(code)}], signal[${JSON.stringify(signal)}]`;
      event.sender.send('bbdown:task:log', resourceMeta, resourceMeta['error']);
    }
    toDB(resourceMeta);
    console.log(logFormat(`bbdown exit, code[${JSON.stringify(code)}], signal[${JSON.stringify(signal)}]`));
  });
}

function stopBB(resourceMeta) {
  processMap[resourceMeta.timestamp]?.kill();
}

function deleteCallback(resourceMeta) {
  const process = processMap[resourceMeta.timestamp];
  if (process) {
    delete processMap[resourceMeta.timestamp];
    process.kill();
  }
}

function clearCallback() {
  Object.values(processMap).forEach(process => process.kill());
  processMap = {};
}

module.exports = {
  bbDownInit: init
}