const gulp = require('gulp');
const cheerio = require('cheerio');
const axios = require('axios');
const _ = require('lodash');
const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');
const path = require('path');
const {Bucket, Storage} = require('@google-cloud/storage');
const https = require("https");

const TOKEN = process.env.SESSION_TOKEN;

const LOCALS = {
    spa__user: process.env.SESSION_SPA_USER,
    spa__token: process.env.SESSION_SPA_TOKEN,
    undefined: process.env.SESSION_SPA_UNDEFINED,
};

const TIMEOUT = 0;

const BASE_URL = 'https://www.inecelectionresults.ng';

exports.exportIrev = async function exportIrev() {
    const stateIds = [33,];

    const headers = {
        Origin: 'https://www.inecelectionresults.ng',
        Referer: 'https://www.inecelectionresults.ng/',
        'If-None-Match': 'W/"26a-qNeyQltzWc4JrchS4QBuWNCAe0I"',
        'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': "macOS",
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
        Authorization: `Bearer ${TOKEN}`
    }

    const browser = await puppeteer.launch();

    try{
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on('request', async (request) => {
            const currentheaders = request.headers();
            _.assign(headers, currentheaders);
            await request.continue({
                headers
            });
        });

        await page.goto(BASE_URL);
        await page.evaluate((locals) => {

            for (const key in locals) {
                localStorage.setItem(key, locals[key]);
            }

        }, LOCALS);

        console.log('Waiting for page to refresh...');
        const refreshed = await waitRefresh(page, {timeout: TIMEOUT});
        console.log('Refreshed:', refreshed);

        const states = await getStates(page);
        const statesFiltered = _.isEmpty(stateIds) ? states : states.filter(s => _.includes(stateIds, s.id));

        console.log('States:', statesFiltered);

        for (const state of statesFiltered) {
            const lgaInfos = await getLgas(state.id, page);

            for (const lgaInfo of lgaInfos) {
                const wards = await getWards(lgaInfo.url, page);

                for (const puInfo of wards.puUrls) {
                    const puUrl = puInfo.url;
                    const visitedPus = [];
                    const pus = [];
                    const allPuInfos = await getPuInfos(puUrl, page);
                    console.log(`Got ${allPuInfos.pus.length} PUs for ${puUrl}`);

                    for (const pu of allPuInfos.pus) {

                        if(!pu.isResultAvailable){
                            console.log(`No results ready for "${pu.name}" (${pu.id})`);
                            continue;
                        }

                        const res = await _getDocData(puUrl, visitedPus, page);

                        _.assign(pu, res, {
                            state: state.name,
                            stateId: state.id,
                            lga: lgaInfo.name,
                        });
                        //console.log(res);

                        visitedPus.push(pu.name);
                        pus.push(pu);
                    }

                    console.log(lgaInfo.url, pus);

                    await saveResults(allPuInfos.pus.map(p => _.omit(p, ['element'])));
                }
            }
        }

        await page.close();

    } finally {
        await browser.close();
    }

}

exports.default = exports.exportIrev;

exports.exportLgas = async function() {

    //await fs.mkdir('build');

    let stateId = 18;
    while (stateId < 38){
        const url = `https://lv001-g.inecelectionresults.ng/api/v1/elections/63f8f25b594e164f8146a213/lga/state/${stateId}`;
        console.log('Fetching url:', url);

        const res = await axios.get(url);

        await fs.writeFile(`build/data_lgas_${stateId}.json`, JSON.stringify(res.data, null, 2));
        stateId += 1;
    }

    console.log('Done!');
}

async function fetchWardData(wardId) {
    const filePath = `./build/data_ward_${wardId}.json`
    let data = null;

    try {
        data = require(filePath);
    }catch (e) {
        console.log(`ward data for "${wardId}" not present, fetching from server...`);
    }

    if(!data){
        const url = `https://lv001-g.inecelectionresults.ng/api/v1/elections/63f8f25b594e164f8146a213/pus?ward=${wardId}`;
        console.log('Fetching url:', url);

        const response = await axios.get(url, {timeout: 50000});
        data = response.data;

        await fs.writeFile(filePath, JSON.stringify(data, null, 4));
        console.log('saved ward data:', filePath);
    }

    return data;
}

const url = require('url');
const {STATES} = require('./src/ref_data');

exports.fetchStats = async function(){
    const newStates = [];
    for (const state of STATES) {
        const lgaData = require(`./build/data_lgas_${state.id}`);

        const wardCount = _.sum(lgaData.data.map(l => l.wards.length));

        let puCount = 0;
        let results = 0;

        for (const lga of lgaData.data) {
            for (const ward of lga.wards) {
                const wardData = require(`./build/data_ward_${ward._id}.json`);
                puCount += wardData.data.length;

                for (const pu of wardData.data) {
                    if(!pu.document?.url || (url.parse(pu.document?.url).pathname === '/')) continue;
                    results += 1;
                }
            }
        }

        newStates.push({
            id: state.id,
            url: state.url,
            resultCount: results,
            wardCount: wardCount,
            lgaCount: lgaData.data.length,
            puCount: puCount,
            name: state.name,
        })
    }

    console.log(JSON.stringify(newStates, null, 4));
}

exports.downloadDocs = async function(){

    const fileExists = async (filePath) => {
        try {
            await fs.stat(filePath);
            return true;
        } catch (e) {
            return e.code !== 'ENOENT';
        }
    };

    const basePath = '/Volumes/Samsung USB/irev_data';

    const skipStates = [
        'lagos',
        'rivers',

        'katsina',
        'nasarawa',
        'yobe',
        'kaduna',
        'niger'
    ]

    for(const fn of await fs.readdir('./build')){
        if(!fn.startsWith('data_ward_')) continue;

        const data = require(`./build/${fn}`);

        const lgaData = require(`./build/data_lgas_${_.first(data.wards).state_id}.json`);
        const stateName = _.first(lgaData.data).state.name;

        const lgaName = _.first(data.lgas).name;

        if(skipStates.includes(stateName.toLowerCase())) continue;

        const stateDir = `${basePath}/${_.snakeCase(stateName)}`;
        const existState = await fileExists(stateDir);

        if(!existState){
            await fs.mkdir(stateDir);
        }

        const lgaDir = `${stateDir}/${_.snakeCase(lgaName)}`;
        const exists = await fileExists(lgaDir);

        if(!exists){
            await fs.mkdir(lgaDir);
        }

        for (const ward of data.data) {
            if(!ward.document?.url || (url.parse(ward.document?.url).pathname === '/')) continue;
            const ext = path.extname(ward.document.url);
            const filePath = `${lgaDir}/${_.snakeCase(ward.polling_unit.pu_code)}${ext}`;

            const wardExist = await fileExists(filePath);

            if(wardExist) continue;

            try{
                console.log('fetching doc:', ward.document.url);
                const res = await axios({url: ward.document.url, responseType: 'stream',});

                await fs.writeFile(filePath, res.data);
            } catch (e) {
                console.log(`error fetching url: ${ward.document.url}`, e.stack);
            }

        }
    }
}

exports.santizeResults = async function(){

    //const o = require('./google-service-account.json');

    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });

    let lgaNames = [];
    for(const fn of await fs.readdir('./build')){
        if(!fn.startsWith('data_lgas_')) continue;

        const data = require(`./build/${fn}`);

        // let count = 0;
        //
        for (const lga of data.data) {
            lgaNames.push(lga.lga.name);

        //     for (const ward of lga.wards) {
        //
        //         try {
        //             await fetchWardData(ward._id);
        //         } catch (e) {
        //             console.log('error fetching ward:', ward._id, e);
        //             continue
        //         } finally {
        //             count += 1;
        //         }
        //
        //         console.log(`fetching ward #${count}:`, ward._id);
        //     }
        }
    }


    //const idInts = _.map(ids, (x) => _.toInteger(x));
    //const res = await axios.get(`https://localhost:8080/api/polling-data?filterIn=${_.join(ids, ',')}`, {httpsAgent});
    const res = await axios.post(`https://localhost:8080/api/polling-data/badlgas`, {lgaNames}, {httpsAgent});

    console.log('DATA:', res.data.data.length);



    // for (const puData of res.data.data) {
    //     const ward = await fetchWardData(puData.wardId);
    //
    //     const pu = _.find(ward.data, p => p.pu_code === puData.puCode);
    //
    //     puData.lgaId = pu.polling_unit.lga_id;
    //     puData.lgaName = pu.polling_unit.lga.name;
    //
    //     // puData.isResultIllegible = !puData.isResultLegible;
    //     // puData.containsIncorrectPuName = !puData.isPuNameCorrect;
    //     // console.log('Polling Unit:', puData.puCode, puData.id, puData.isResultLegible, puData.isResultIllegible);
    //
    //     const resp = await axios.post('https://localhost:8080/api/polling-data', {pu: null, puData}, {httpsAgent: new https.Agent({
    //             rejectUnauthorized: false//endpoint.indexOf('localhost') > -1,
    //         })});
    //
    //     const {lgaName, lgaId, id, puCode, isResultIllegible, containsIncorrectPuName} = resp.data.result;
    //     console.log(lgaName, lgaId, id, puCode, isResultIllegible, containsIncorrectPuName);
    // }


    // const storage = new Storage(o);
    // const bucket = storage.bucket('joli-app-bucket');
    //
    // const options = {
    //     destination: path.join(process.cwd(), 'downloaded.json'),
    // };
    //
    // const res = await bucket.file('json-data/data_lgas_10.json').download(options);
    // console.log(res);
}

const TOTALS = {};

async function saveResults(array){
    for (const arrayElement of array) {
        TOTALS[arrayElement.id] = arrayElement;
    }

    await fs.writeFile('irev_data.json', JSON.stringify(TOTALS, null, 2));
}

async function getLgas(stateId, page){
    const url = `${BASE_URL}/elections/63f8f25b594e164f8146a213?state=${stateId}`;

    await page.goto(url,{waitUntil: 'networkidle0', timeout: TIMEOUT});

    await waitRefresh(page, {timeout: TIMEOUT});
    const $ = cheerio.load(await page.content());
    const lgas = [];

    // for (const a of $('a[href^="/elections/63f8f25b594e164f8146a213/context/ward/lga/"]')) {
    //     const text = $(a).prop('innerText');
    //     const href = a.attribs.href;
    //     console.log(`WARD=${text}, path=${href}`);
    // }

    for (const a of $('a[href^="/elections/63f8f25b594e164f8146a213/context/ward/lga/"]')) {
        const text = $(a).prop('innerText');
        const href = a.attribs.href;
        const fullUrl = `${BASE_URL}${href}`;

        lgas.push({name: text, url: fullUrl});
    }

    return lgas;
}

async function getStates(page){
    const url = `${BASE_URL}/pres/elections/63f8f25b594e164f8146a213?type=pres`;
    await page.goto(url,{waitUntil: 'networkidle0', timeout: TIMEOUT});

    await waitRefresh(page, {timeout: TIMEOUT});

    const $ = cheerio.load(await page.content());

    const states = [];
    for (const a of $('a[href^="/elections/"]')) {
        const text = $(a).prop('innerText');
        const href = a.attribs.href;
        const fullUrl = `${BASE_URL}${href}`;
        const myURL = new URL(fullUrl);

        states.push({name: text, url: fullUrl, id: _.toInteger(myURL.searchParams.get('state'))});
    }

    return states;
}

async function getWards(url, page){
    const wards = [];
    const currentUrl = await page.evaluate(() => document.location.href);

    if(currentUrl !== url) await page.goto(url,{waitUntil: 'networkidle0', timeout: TIMEOUT});

    await waitRefresh(page, {timeout: TIMEOUT});

    const html = await page.content();

    const $ = cheerio.load(html);

    //console.log(html);

    for (const a of $('a[href^="/elections/63f8f25b594e164f8146a213/context/"]')) {
        const text = $(a).prop('innerText');
        const href = a.attribs.href;
        console.log(`Ward=${text}, path=${href}`);
        wards.push({
            url: `https://www.inecelectionresults.ng${href}`,
            name: text,
        });
    }
    return {puUrls: wards};
}

async function getPuInfos(url, page){
    const currentUrl = await page.evaluate(() => document.location.href);

    if(currentUrl !== url) await page.goto(url,{waitUntil: 'networkidle0', timeout: TIMEOUT});

    await waitRefresh(page, {timeout: TIMEOUT});

    const divs = await page.$$('div.bg-light');
    const infos = [];
    const pollingUnits = {};

    for (const div of divs) {
        const resultTxt = await (await div.getProperty('textContent')).jsonValue();

        let [puName, puIdTxt] = _.split(resultTxt, ' PU Code: ', 2);
        const [puId] = _.split(puIdTxt, ' ', 1);
        const btn = await div.$('button.btn.btn-success');

        puName = _.trim(puName);

        const pu = {
            name: puName,
            id: _.trim(puId),
            element: div,
            docUrl: null,
            resultUrl: null,
            isResultAvailable: btn !== null,
        }

        pollingUnits[puName] = pu;
        infos.push(pu);
    }

    return {
        elements: divs,
        pus: infos,
        puByName: pollingUnits
    }
}

async function _getDocData(url, excludeList, page) {
    const data = await getPuInfos(url, page);

    for (const pu of data.pus) {
        if(_.includes(excludeList, pu.name) || !pu.isResultAvailable) continue;

        await waitRefresh(page,{contains: 'refreshing...', timeout: TIMEOUT});

        const btn = await pu.element.$('button.btn.btn-success');
        let resultBtnTxt = null;

        if (!btn) continue;

        resultBtnTxt = await (await btn.getProperty('textContent')).jsonValue();

        await btn.click();

        await waitRefresh(page,{contains: 'initializing election data...', timeout: TIMEOUT});

        const div = await page.$('div.bg-light');
        const description = await (await div.getProperty('textContent')).jsonValue();

        const resultUrl = await page.evaluate(() => document.location.href);

        const docUrl = await page.evaluate(() => {
            return document.querySelector('iframe').src;
        });

        //console.log('Current Page:', url, docUrl, resultUrl);
        await page.goBack({waitUntil: 'networkidle0'});


        const [rest, createdAt] = _.split(description, 'Date created: ', 2);
        const [restWard, lga] = _.split(rest, 'Lga: ', 2);
        const [_rest, ward] = _.split(restWard, 'Ward: ', 2);

        return {docUrl, resultUrl, description, createdAt, lga, ward};
    }

    return null;
}

function waitRefresh(page, opts={contains: 'refreshing...', timeout: 5000}) {

    const getContent = async () => {
        return new Promise((resolve) => {
            setTimeout(async () => {
                const html = await page.content();
                resolve(html);
            }, 500);
        });
    }

    return new Promise(async (resolve, reject) => {
        let isRefreshed = false;
        const startTime = new Date().getTime();

        while (!isRefreshed){
            const c = await getContent();
            isRefreshed = !_.includes(c, opts.contains || 'refreshing...');

            const now = new Date().getTime();

            if(opts.timeout && (now - startTime) > opts.timeout){
                reject(new Error('Timeout!'))
            }
        }

        resolve(isRefreshed);
    })
}