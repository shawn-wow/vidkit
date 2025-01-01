const { net } = require('electron')
const path = require('path');
const fs = require('fs');


function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

const httpGet = (url, callback) => {
    const request = net.request(url);
    let data = '';
    request.setHeader('Content-Type', 'application/json');
    request.on('response', (response) => {
        console.log(`STATUS: ${response.statusCode}`);
        //console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
        response.on('data', (chunk) => {
            //console.log(`BODY: ${chunk}`)
            data += chunk;
        });
        response.on('end', () => {
            //console.log('Request is Finished:', data);
            callback(data);
        });
    });
    request.on('finish', () => {
        console.log('Request is Finished');
    });
    request.on('abort', () => {
        console.log('Request is Aborted');
        callback(null);
    });
    request.on('error', (error) => {
        console.log(`ERROR: ${JSON.stringify(error)}`)
        callback(null);
    });
    request.on('close', (error) => {
        console.log('Last Transaction has occurred(close):', error)
        setTimeout(() => {
            if (data.length == 0) {
                callback(null);
            }
        }, 6000);
    });
    request.end();
}

//---todo
const httpGetSync = (url) => {
    return new Promise((resolve, reject) => {
        const request = net.request(url);
        request.setHeader('Content-Type', 'application/json');
        request.on('response', (response) => {
            let data = '';
            console.log(`STATUS: ${response.statusCode}`);
            //console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
            response.on('data', (chunk) => {
                //console.log(`BODY: ${chunk}`)
                data += chunk;
            });
            response.on('end', () => {
                //console.log('Request is Finished:', data);
                resolve(data);
            });
        });
        request.on('finish', () => {
            console.log('Request is Finished');
        });
        request.on('abort', () => {
            console.log('Request is Aborted');
            reject(null);
        });
        request.on('error', (error) => {
            console.log(`ERROR: ${JSON.stringify(error)}`)
            reject(null);
        });
        request.on('close', (error) => {
            console.log('Last Transaction has occurred(close):', error)
            setTimeout(() => {
                if (data.length == 0) {
                    reject(null);
                }
            }, 10000);
        });
        request.end();
    })
}

const readJsonFile = (filePath, callback) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            callback(jsonData);
        } catch (err) {
            console.error(err);
        }
    });
}
const writeJsonFile = (filePath, data, callback) => {
    fs.writeFile(filePath, JSON.stringify(data), 'utf8', (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('JSON data has been saved.');
        callback();
    });
}

const readJsonFileAsync = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        throw err;
    }
}

const writeJsonFileAsync = async (filePath, data) => {
    try {
        await fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
        console.log('JSON data has been saved.');
    } catch (err) {
        console.error(err);
        throw err;
    }
}

const logFormat = (...args) => {
    return `[${new Date().toLocaleString()}] ${args}`;
}

function buildRenamedFilePath(dirName, fileName) {
    return buildRenamedFilePathWithExtension(dirName, fileName, path.extname(fileName));
}

function buildRenamedFilePathWithExtension(dirName, fileName, fileExtension) {
    fileExtension = fileExtension?.trim() || '.mp4';
    let title = path.basename(fileName, fileExtension);
    let fileIndex = 1;
    fileName = `${title}${fileExtension}`;
    let filePath = path.join(dirName, fileName);
    while (fs.existsSync(filePath)) {
        fileName = `${title}(${fileIndex})${fileExtension}`;
        filePath = path.join(dirName, fileName);
        fileIndex++;
    }
    return filePath;
}


async function renameDownloadFileWithTitle(oldPath, title) {
    const fileName = getValidFileName(title, '-', 60);
    const filePath = fileName && buildRenamedFilePathWithExtension(path.dirname(oldPath), fileName, path.extname(oldPath));
    if (!filePath) {
        console.error('Invalid file path:', filePath);
        return oldPath;
    }
    await fs.rename(oldPath, filePath, (err) => {
        if (err) {
            console.error('fs.rename fail:', err);
            filePath = oldPath;
        }
    });
    console.log(logFormat(`Saving file: ${filePath}`));
    return filePath;
}


function getValidFileName(str, replacement = '-', maxLength = 255) {
    let validFileName = str.replace(/[\x00-\x1F\x7F]/g, "");
    const illegalCharsRegex = /[\/\\:*\?"<>| ]+/g;
    validFileName = validFileName.replace(illegalCharsRegex, replacement).replace(/-{2,}/g, '-');
    validFileName = validFileName.replace(/^[-]+|[-]+$/g, '');

    if (validFileName.length === 0) {
        return null;
    }

    if (Buffer.byteLength(validFileName) > maxLength) {
        validFileName = validFileName.slice(0, maxLength);
        validFileName = validFileName.replace(/-+$/, '');
    }

    return validFileName;
}

module.exports = {
    buildRenamedFilePath,
    renameDownloadFileWithTitle,
    getValidFileName,
    httpGet,
    logFormat,
    sleep,
}