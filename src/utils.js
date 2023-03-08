import _ from "lodash";
import fetch from "node-fetch";
import archiver from "archiver";
import path from "path";
import url from "url";
import axios from "axios";
import https from "https";

export async function archivePipe(destination, urls) {
    let proms = []
    for (const docUrl of _.keys(urls)) {
        proms.push(fetch(docUrl)
            .catch(error => console.log(`Failed to download: ${docUrl}`, error)));
    }

    const archive = archiver('zip');

    archive.pipe(destination);

    for (const resp of await Promise.all(proms)) {

        if(!resp) continue;

        const fileName = urls[resp.url] || path.basename(url.parse(resp.url).pathname);
        console.log(`fileName: ${fileName}, url: ${resp.url}`);
        archive.append(resp.body, {name: fileName});
    }

    await archive.finalize();

    console.log(`finalized archive: fileCount=${_.size(urls)}`);
}

export const BASE_URL_KVDB = process.env.BASE_URL_KVDB;

export const CACHE = {};


export async function fetchWardData(wardId, opts={includePuData: true}) {
    let data = CACHE[wardId];
    let startTime = new Date().getTime();

    if(!data){
        const url = `https://lv001-g.inecelectionresults.ng/api/v1/elections/63f8f25b594e164f8146a213/pus?ward=${wardId}`;
        console.log('Fetching url:', url);

        const response = await axios.get(url, {timeout: 50000});
        data = response.data;

        CACHE[wardId] = data;
    }

    if(opts?.includePuData){
        const endpoint = `${BASE_URL_KVDB}/api/polling-data`;
        try{
            const resp = await axios.get(`${endpoint}/${wardId}`, {httpsAgent: new https.Agent({
                    rejectUnauthorized: false,//endpoint.indexOf('localhost') > -1
                })});
            data['polling_data'] = _.transform(resp.data.puData, (result, item) => {
                result[item.puCode] = item;
            }, {});
        }catch (e) {
            console.log('Unable to fetch polling data:', e.stack);
            data['polling_data'] = {};
        }
    }

    let endTime = new Date().getTime();
    data['request_duration'] = endTime - startTime;

    return data;
}

export const STATES = require('./ref_data').STATES;