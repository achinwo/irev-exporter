const gulp = require('gulp');
const cheerio = require('cheerio');
const axios = require('axios');
const _ = require('lodash');
const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');
const path = require('path');

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