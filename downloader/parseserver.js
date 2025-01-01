const { httpGet} = require('../common/util');
const serverUrl = `https://www.yourhost/?url=`;

const parseUrlFromServer= async (resourceMeta, callback) => {
    let parseRequestUrl = serverUrl.concat(encodeURIComponent(resourceMeta.url));
    console.log('parseRequestUrl:', parseRequestUrl);
    httpGet(parseRequestUrl, (data) => {
        console.log('data:', data);
        if (null === data || void 0 === data) {
            callback();
            return;
        }
        let responseJson = JSON.parse(data);
        if (responseJson && responseJson.video && responseJson.video.length > 0) {
            resourceMeta['title'] = responseJson.title;
            resourceMeta['sourceUrl'] = responseJson.url;
            resourceMeta['thumbnail'] = responseJson.thumbnail;
            callback();
        } else {
            callback();
        }
    });
}

module.exports = {
   parseUrlFromServer,
}