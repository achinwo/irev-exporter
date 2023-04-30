require('ts-node').register();
require('dotenv').config();

const models = require('./src/orm');
const gulp = require('gulp');
const cheerio = require('cheerio');
const axios = require('axios');
const _ = require('lodash');
const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');
const path = require('path');
const {Bucket, Storage} = require('@google-cloud/storage');
const https = require("https");
const {knex, destKnex} = require('./src/lib/model');
const url = require('url');
const {STATES, ElectionType, DataSource} = require('./src/ref_data');
const moment = require('moment');

const Csv = require('csvtojson');
const writeXlsxFile = require("write-excel-file/node");

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
    const filePath = `./build/wards/data_ward_${wardId}.json`
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

gulp.task('fetch:wards:presidential', async () => {
    try{
        const wards = await models.IrevWard.query();

        for (const ward of wards) {
            await fetchWardData(ward.wardUid);
        }

    }finally {
        await models.IrevWard.knex().destroy();
    }
})

const Knex = require('knex');
const {migrations, seeds, pool} = require('./knexfile')[process.env.NODE_ENV || 'development'];

const SRC_DB_CONFIG = {
    client: 'pg',
    connection: {
        port: process.env.SRC_DB_PORT,
        host: process.env.SRC_DB_HOST,
        database: process.env.SRC_DB_NAME,
        user: process.env.SRC_DB_USER,
        password: process.env.SRC_DB_PASSWORD,
        pool: {min: 0, max: 7}
    },
    migrations,
    seeds,
    pool
};

exports.importDataToDatabase = async function(){
    const {knex: destKnex} = require('./src/lib/model');
    const srcKnex = Knex(SRC_DB_CONFIG);

    try {
        const srcData = await srcKnex(models.PuData.tableName);
        const chunked = _.chunk(srcData, 999);

        let batchIdx = 1;
        for (const chunk of chunked) {
            await destKnex(models.PuData.tableName).insert(chunk.map(o => _.omit(o, ['id'])));
            console.log(`Inserted chunked data into "${models.PuData.tableName}": ${batchIdx} of ${chunked.length}`);
            batchIdx += 1;
        }

    } finally {
        await srcKnex.destroy();
        await destKnex.destroy();
    }
}

exports.renameUserDp = async function(){
    try {
        const users = await models.User.query().where('display_name', 'like', 'Contributor%');
        const changed = [];
        for (const user of users) {
            const u = await models.User.query().updateAndFetchById(user.id, {displayName: `Elluu P! #${user.id}`});
            changed.push(u);
        }
        console.log(changed);
    } finally {
        await models.User.knex().destroy()
    }
}

async function importUsersFromPuData(){
    try {
        const adminContribId = 'okeyability';
        let adminUser = await models.User.query().where('contributor_id', adminContribId).first();

        if(!adminUser) {
            adminUser = await models.User.query().insertAndFetch({
                contributorId: adminContribId,
                displayName: 'Tech Support Guy',
                createdById: 1,
                updatedById: 1,
            });
        }

        const recs = await User.query().select('display_name', 'contributor_id');
        const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));
        const existingContribs = _.keys(mapping);

        const pus = await models.PuData.query()
            .select('contributor_username')
            .count('pu_code', {as: 'entriesCount'})
            .min('created_at as firstDataEnteredAt')
            .where('source', DataSource.IREV)
            .groupBy('contributor_username');

        // const grvPus = await models.PuData.query()
        //     .select('contributor_username')
        //     .whereNot('source', 'irev')
        //     .groupBy('contributor_username');
        //
        // const grvUsers = grvPus.map(p => _.trim(p.contributorUsername));
        //
        // console.log(grvUsers);
        //
        // if(grvUsers){
        //     console.log(`Deleting ${grvUsers.length} users...`);
        //     await models.User.query()
        //         .whereIn('contributor_id', grvUsers)
        //         .delete();
        // }

        let newUsers = [];
        let idx = existingContribs.length + 1;

        for (const puData of pus) {

            if(_.includes(existingContribs, _.trim(puData.contributorUsername))){
                continue;
            }

            if(puData.contributorUsername === adminContribId){
                await models.User.query().updateAndFetchById(adminUser.id, {firstContributedAt: puData.firstDataEnteredAt});
                continue;
            }

            const existing = _.find(newUsers, u => u.contributorId === _.trim(puData.contributorUsername));

            if(existing){
                console.log(`Duplicate detected for id "${_.trim(puData.contributorUsername)}":`, existing, puData);
                existing.firstContributedAt = _.min([existing.firstContributedAt, puData.firstDataEnteredAt]);
                continue
            }

            const newUser = {
                contributorId: _.trim(puData.contributorUsername),
                displayName: `Eluu P! #${idx}`,
                firstContributedAt: puData.firstDataEnteredAt,
                createdById: adminUser.id,
                updatedById: adminUser.id,
            }

            newUsers.push(newUser);
            idx += 1;
        }

        if(!_.isEmpty(newUsers)){
            await models.User.query().insert(newUsers);
            console.log('Created new users:', newUsers.length);
        }else {
            console.log('No new users to import!');
        }
    } finally {
        await models.PuData.knex().destroy();
    }
}

async function fetchAccreditationData(){
    let results = {};
    const baseDir = './build/cvr_data_states';
    try {
        for (const state of STATES) {
            const stateDir = `${baseDir}/cvr_state_${state.id}`;
            for (const lgaDirName of await fs.readdir(stateDir)) {
                if(lgaDirName.startsWith('.') || lgaDirName === 'results.json') continue;

                const lgaDirPath = `${stateDir}/${lgaDirName}`;

                for (const resultFileName of await fs.readdir(lgaDirPath)) {
                    if(!resultFileName.endsWith('.json')) continue;

                    const data = require(`${stateDir}/${lgaDirName}/${resultFileName}`);
                    //console.log(data);
                    results[data.result.pu.delim.replaceAll('-', '/')] = {
                        votersRegistered: _.toInteger(data.result.pu.registered_voters),
                        syncedAccreditations: _.toInteger(data.result.synced_accreditations),
                        resultUrl: data.result.result,
                    }
                }
            }
        }
    } finally {
        await models.PuData.knex().destroy();
    }

    return results;
}

exports.fetchDocumentsByDate = async function fetchDocumentsByDate(){

    function dateCheck(from, to, check) {

        let fDate, lDate, cDate;
        fDate = Date.parse(from);
        lDate = Date.parse(to);
        cDate = Date.parse(check);

        return cDate <= lDate && cDate >= fDate;
    }

    let result = {};
    //"updated_at": "2023-02-28T21:40:39.948Z"
    for (const fileName of await fs.readdir('./build')) {
        if(!fileName.startsWith('data_ward_')) continue;

        const data = require(`./build/${fileName}`);
        const stateId = _.toInteger(_.first(data.lgas).state_id);
        let dates = result[stateId] || {feb25: 0, feb28: 0, mar10: 0, total: 0}

        for (const pu of data.data) {
            if(!pu.document?.url || (url.parse(pu.document?.url).pathname === '/')) continue;

            if(dateCheck("2023-02-25T00:00:00Z", "2023-02-25T23:59:59Z", pu.document.updated_at)){
                dates.feb25 += 1;
            }else if(dateCheck("2023-02-28T00:00:00Z", "2023-02-28T23:59:59Z", pu.document.updated_at)){
                dates.feb28 += 1;
            }else if(dateCheck("2023-03-10T00:00:00Z", "2023-03-20T23:59:59Z", pu.document.updated_at)){
                dates.mar10 += 1;
            }

            dates.total += 1;
        }

        result[stateId] = dates;
    }
    //console.log(result);
    return result;
}

gulp.task('export:report', async () => {
    const results = require('./inputs/data_accreditation.json'); //await fetchAccreditationData();
    const docsByDate = await exports.fetchDocumentsByDate();
    //await fs.writeFile('./data_accreditation.json', JSON.stringify(results, null, 4));
    //console.log('saved accreditation');

    const report = {};
    try {
        for (const state of STATES) {
            const res = await models.IrevPu.query().count('*', {as: 'puCount'}).where('state_name', state.name).first();
            const puDataRes = await models.PuData.query().count('*', {as: 'submittedCount'})
                .where('state_name', state.name).andWhere('election_type', ElectionType.PRESIDENTIAL).first();

            const puDataResVotes = await models.PuData.query()
                .select('votes_apc', 'votes_pdp', 'votes_lp', 'votes_nnpp', 'votes_cast')
                .where('state_name', state.name).andWhere('election_type', ElectionType.PRESIDENTIAL);
            const puCodeRes = await models.IrevPu.query().select('pu_code').where('state_name', state.name);

            //console.log(res);
            //return
            const data = {
                stateName: state.name,
                puCount: _.toInteger(res.puCount),
                transcribedCount: _.toInteger(puDataRes.submittedCount),
                pctTranscribed: (((_.toInteger(puDataRes.submittedCount) || 0) / state.resultCount) * 100),
                resultsCount: state.resultCount,
                pctUploadedFeb25: ((docsByDate[state.id].feb25 / state.resultCount) * 100),
                pctUploadedFeb28: ((docsByDate[state.id].feb28 / state.resultCount) * 100),
                pctUploadedMar10: ((docsByDate[state.id].mar10 / state.resultCount) * 100),
                votersRegistered: _.sum(puCodeRes.map(r => results[r.puCode]?.votersRegistered || 0)),
                votersAccredited: _.sum(puCodeRes.map(r => results[r.puCode]?.syncedAccreditations || 0)),
                ballotPapersCount: null,
                totalVotesCast: _.sum(puDataResVotes.map(r => r.votesCast || 0)),
                totalVotesInvalid: null,
                totalVotesApc: _.sum(puDataResVotes.map(r => r.votesApc || 0)),
                totalVotesPdp: _.sum(puDataResVotes.map(r => r.votesPdp || 0)),
                totalVotesLp: _.sum(puDataResVotes.map(r => r.votesLp || 0)),
                totalVotesNnpp: _.sum(puDataResVotes.map(r => r.votesNnpp || 0)),
            }

            report[state.name] = data;

            //console.log(report);
            //return
        }

        let rows = [];
        for (const [stateName, data] of _.sortBy(_.toPairs(report), ([k, ]) => k)) {
            rows.push({label: stateName, value: null});

            for (const [key, value] of _.toPairs(data)) {
                if(key === 'stateName') continue;
                rows.push({label: _.startCase(key), value: value });
            }

            if(stateName !== 'ZAMFARA') rows.push({label: '', value: null });
        }

        const stream = await writeXlsxFile(rows, {schema: SCHEMA2});

        const buffers = [];

        for await (const data of stream) {
            buffers.push(data);
        }

        const finalBuffer = Buffer.concat(buffers);
        await fs.writeFile('./election_irev_stats.xlsx', finalBuffer);
        console.log('Done');

    } finally {
        await models.IrevPu.knex().destroy();
    }

    console.log(report);
})

const SCHEMA2 = [
    {column: 'Label', type: String, value: data => data.label},
    {column: 'Value', type: Number, value: data => data.value},
    // {column: 'Label', type: String, value: data => data.stateId ? _.toString(data.stateId) : null},
    // {column: 'Value', type: String, value: data => data.stateName},
    // {column: 'Label', type: String, value: data => data.stateId ? _.toString(data.stateId) : null},
    // {column: 'Value', type: String, value: data => data.stateName},
]

const AwsClientS3 = require("aws-client-s3");
const {User} = require("./src/orm");

let AWS_CLIENT = null;

function getAwsClient(){
    if(!AWS_CLIENT){
        const config = {
            region: process.env.S3_REGION,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            }
        };

        AWS_CLIENT = new AwsClientS3(config);
    }

    return AWS_CLIENT;
}

exports.fetchS3 = async function(){
    const client = getAwsClient();
    // const res = await client.uploadFile(await fs.readFile('./build/data_lgas_15.json'), {
    //     bucket: process.env.S3_BUCKET_NAME,
    //     key: 'irev-exporter/refdata/irev_lgas_15.json'}
    // );
    //
    // // const res = await client.deleteFile({
    // //     bucket: process.env.S3_BUCKET_NAME,
    // //     key: 'irev-exporter/refdata/irev_lga_15.json'})
    // console.log('RESULT:', res);

    const objs = await client.listBucketObjects(process.env.S3_BUCKET_NAME, 'irev-exporter/results/irev_guber');
    //console.log(objs);

    const lgaKeys = objs.Contents.map(o => o.Key);
    console.log(lgaKeys);

    // for (const obj of objs.Contents) {
    //     console.log(obj);
    // }

    const fileStream = await client.readFile({
        bucket: process.env.S3_BUCKET_NAME,
        key: 'irev-exporter/results/irev_guber/abia/bende/01_04_03_004.pdf',
    });

    await fs.writeFile('./delta_result.pdf', fileStream);
}

async function fetchStats(){
    const client = getAwsClient();
    const newStates = [];

    for (const state of STATES) {
        const lgaData = require(`./build/data_lgas_${state.id}`);

        const wardCount = _.sum(lgaData.data.map(l => l.wards.length));

        let puCount = 0;
        let results = 0;
        let resultsGuber = 0;

        for (const lga of lgaData.data) {
            for (const ward of lga.wards) {
                let wardData = require(`./build/wards/data_ward_${ward._id}.json`);

                puCount += wardData.data.length;

                for (const pu of wardData.data) {
                    if(!pu.document?.url || (url.parse(pu.document?.url).pathname === '/')) continue;
                    results += 1;
                }

                const fileName = `data_ward_${ward._id}.json`;
                const stateName = _.snakeCase(lga.state.name);
                const lgaName = _.snakeCase(lga.lga.name);
                const key = `irev-exporter/refdata/irev_guber/${stateName}/${lgaName}/${fileName}`;

                let wardDataGuber;

                try {
                    const fileStream = await client.readFile({bucket: process.env.S3_BUCKET_NAME, key});

                    let buf = [];
                    for await (const chunk of fileStream) {
                        buf.push(chunk);
                    }

                    wardDataGuber = JSON.parse(Buffer.concat(buf).toString());
                } catch (e) {
                    console.error(`[fetchStats] error fetching ward key "${key}"`, e);
                    continue;
                }

                for (const puG of wardDataGuber.data) {
                    if(!puG.document?.url || (url.parse(puG.document?.url).pathname === '/')) continue;
                    resultsGuber += 1;
                }
            }
        }

        const newState = {
            id: state.id,
            url: state.url,
            resultCount: results,
            resultGuberCount: resultsGuber,
            wardCount: wardCount,
            lgaCount: lgaData.data.length,
            puCount: puCount,
            name: state.name,
        };
        newStates.push(newState);

        console.log(`[fetchStats] completed state "${newState.name}": presidential=${newState.resultCount}, gubernatorial=${newState.resultGuberCount}`);
    }

    await fs.writeFile('outputs/data_stats_state.json', JSON.stringify(newStates, null, 4));
    console.log('done!');
}

gulp.task('export:stats', fetchStats);

exports.downloadCvrData = async function(){
    const baseUrl = 'https://cvr.inecnigeria.org';
    const statesPath = '/election_results/listResults/';
    const localDir = './build';

    const arg = _.toInteger(_.last(process.argv)) || null;

    console.log('Selected state:', arg);

    for (const idx of [...Array(37).keys()]) {
        const stateId = idx + 1;
        //const fullUrl = path.join(baseUrl, statesPath, `${stateId}.json`);

        if(_.isInteger(arg) && stateId !== arg) continue;

        //const response = await axios.get(fullUrl);
        const stateDir = path.join(localDir, `cvr_state_${stateId}`);

        //await fs.mkdir(stateDir);

        const filePath = path.join(stateDir, 'results.json');
        //await fs.writeFile(filePath, JSON.stringify(response.data, null, 4));
        //console.log('saved result:', filePath);

        const data = require(`./${filePath}`);

        for (const result of data.stateResults.results) {
            const wardId = _.snakeCase(result.ward);

            const wardDir = path.join(stateDir, wardId);
            const wardExists = await fileExists(wardDir);
            if(!wardExists){
                await fs.mkdir(wardDir);
            }

            const resultFilePath = path.join(wardDir, `${result.delim}.json`);
            const resultExists = await fileExists(resultFilePath);

            if(resultExists){
                continue;
            }

            const response = await axios.get(result.link);

            await fs.writeFile(resultFilePath, JSON.stringify(response.data, null, 4));
            console.log('saved result:', resultFilePath);
        }
    }
}

async function exportWardResults(){
    const client = getAwsClient();
    const wardData = {};

    for(const fn of await fs.readdir('./build')) {
        if (!fn.startsWith('data_ward_')) continue;

        const savedData = require(`./build/${fn}`);

        const data = await fetchWardData(_.first(savedData.wards)._id);

        const numResults = _.sum(data.data.map((pu) => !pu.document?.url || (url.parse(pu.document?.url).pathname === '/') ? 0 : 1) || [0]);

        const lga = _.first(data.lgas);
        const state = _.find(STATES, (s) => s.id === lga.state_id);

        const fileName = `data_ward_${_.first(data.wards)._id}.json`;
        const stateName = _.snakeCase(state.name);
        const lgaName = _.snakeCase(lga.name);
        const key = `irev-exporter/refdata/irev_guber/${stateName}/${lgaName}/${fileName}`;

        let numResultsGuber = 0;

        try {
            const fileStream = await client.readFile({bucket: process.env.S3_BUCKET_NAME, key});

            let buf = [];
            for await (const chunk of fileStream) {
                buf.push(chunk);
            }

            const dataGuber = JSON.parse(Buffer.concat(buf).toString());
            numResultsGuber = _.sum(dataGuber.data.map((pu) => !pu.document?.url || (url.parse(pu.document?.url).pathname === '/') ? 0 : 1) || [0]);
        } catch (e) {
            console.error(`[fetchStats] error fetching ward key "${key}": ${e}`);
        }

        const ward = _.first(data.wards);
        const wardId = ward.ward_id;
        wardData[wardId] = {
            id: wardId,
            uid: ward._id,
            name: ward.name,
            code: ward.code,
            stateId: ward.state_id,
            lgaId: ward.lga_id,
            resultCount: numResults,
            resultGuberCount: numResultsGuber,
        };
    }

    await fs.writeFile('./outputs/data_stats_ward_v3.json', JSON.stringify(wardData, null, 4));
}

gulp.task('export:stats:ward', exportWardResults);

const fileExists = async (filePath) => {
    try {
        await fs.stat(filePath);
        return true;
    } catch (e) {
        return e.code !== 'ENOENT' || e.code === 'EEXIST';
    }
};

async function importIrevRefdata(){

    const processPus = async (ward, lga) => {
        let pus = [];
        const res = await models.IrevPu.query().select('pu_code').where('ward_uid', ward.wards[0]._id);
        let puIds = res.map(r => r.puCode);

        for (const pu of ward.data) {
            const puData = models.IrevPu.extractFromJsonData(pu);

            if(puIds.includes(puData.puCode)) continue;

            puData.stateName = lga.stateName;
            puData.updatedById = 1;
            puData.createdById = 1;

            pus.push(puData);
        }

        if(!_.isEmpty(pus)) {
            await models.IrevPu.query().insert(pus);
            console.log(`saved PUs for "${ward.wards[0]._id}": ${pus.length}`);
        }
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    const client = getAwsClient();
    //const c = new AwsClientS3();

    const lgaO = await client.listBucketObjects(process.env.S3_BUCKET_NAME, 'irev-exporter/refdata/irev_lgas_');
    const lgaKeys = lgaO.Contents?.map(o => o.Key) || [];

    const wardO = await client.listBucketObjects(process.env.S3_BUCKET_NAME, 'irev-exporter/refdata/irev_wards_');
    const wardKeys = wardO.Contents?.map(o => o.Key) || [];

    try {

        for (const fn of await fs.readdir('./build')) {
            const prefix = 'data_lgas_';

            if (!fn.startsWith(prefix)) continue;

            const fullPath = `./build/${fn}`;
            const stateData = require(fullPath);
            const stateId = fn.slice(prefix.length).replaceAll('.json', '');
            const key = `irev-exporter/refdata/irev_lgas_${stateId}.json`;

            if(!lgaKeys.includes(key)){
                await client.uploadFile(Buffer.from(JSON.stringify(stateData, null, 4)), {
                    bucket: process.env.S3_BUCKET_NAME,
                    key: key,
                });
            }

            const res = await models.IrevLga.query().select('lga_id');
            const existingLgaIds = res.map(r => r.lgaId);

            let lgas = [];

            for (const lgaData of stateData.data) {
                let lgaObj = await models.IrevLga.extractFromJsonData(lgaData);
                let wards = [];

                for (const ward of lgaData.wards) {
                    const wardData = require(`./build/data_ward_${ward._id}.json`);
                    let wardObj = await models.IrevWard.extractFromJsonData(wardData);

                    const wardDocKey = `irev-exporter/refdata/irev_wards_${wardObj.wardUid}.json`;

                    if(!wardKeys.includes(wardDocKey)){
                        //wardKeys
                        await client.uploadFile(Buffer.from(JSON.stringify(wardData, null, 4)), {
                            bucket: process.env.S3_BUCKET_NAME,
                            key: wardDocKey,
                        });
                    }

                    const resWard = await models.IrevWard.query().select('ward_uid');
                    const wardUids = resWard.map(w => w.wardUid);

                    await processPus(wardData, lgaObj);

                    if(_.includes(wardUids, wardObj.wardUid)) continue;

                    wardObj.stateName = lgaObj.stateName;
                    wardObj.documentKey = `${bucketName}:${wardDocKey}`;
                    wardObj.createdById = 1;
                    wardObj.updatedById = 1;

                    wards.push(wardObj);
                    console.log(`saved Ward for "${lgaObj.name}": ${wardObj.name}`);
                }

                if(!_.isEmpty(wards)){
                    await models.IrevWard.query().insert(wards);
                }

                if(_.includes(existingLgaIds, lgaObj.lgaId)) continue;

                lgaObj.documentKey = `${bucketName}:${key}`;
                lgaObj.createdById = 1;
                lgaObj.updatedById = 1;
                lgas.push(lgaObj);

                console.log(`saved LGA for "${lgaObj.stateName}": ${lgaObj.name}`);
            }

            if(!_.isEmpty(lgas)){
                await models.IrevLga.query().insert(lgas);
            }

        }
    }finally {
        await models.IrevLga.knex();
    }

}

const HEADERS = {
    'sec-ch-ua': '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': "macOS",
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
}

async function * downloadWardJson(stateNames){
    const baseUrl = 'https://ncka74vel8.execute-api.eu-west-2.amazonaws.com/abuja-prod/elections';
    const electionUrl = 'https://ncka74vel8.execute-api.eu-west-2.amazonaws.com/abuja-prod/elections?election_type=5f129a04df41d910dcdc1d51';

    let wardRecs;
    if(!_.isEmpty(stateNames)){
        wardRecs = await models.IrevWard.query().select('ward_uid', 'name', 'state_name').where('state_name', 'in', stateNames);
    } else {
        wardRecs = await models.IrevWard.query().select('ward_uid', 'name', 'state_name');
    }

    let elections = (await axios.get(electionUrl, {headers: HEADERS})).data;

    for (const wardRec of wardRecs) {

        const electionId = _.find(elections.data, e => e.state.name === wardRec.stateName)?._id; //fetched for "AMOKWE" ward in "ENUGU"

        if(!electionId){
            console.log(`Unable to resolve election id for ward state "${wardRec?.stateName}", skipping...`, wardRec);
            continue;
        }

        const downloadUrl = `${baseUrl}/${electionId}/pus?ward=${wardRec.wardUid}`;
        console.log('fetching:', downloadUrl);

        const res = await axios.get(downloadUrl, {headers: HEADERS});
        const fileName = `data_ward_${wardRec.wardUid}.json`;

        if(_.isEmpty(res.data.data)) continue;

        yield {fileName, data: res.data};
        console.log(`fetched for "${wardRec.name}" ward in "${wardRec.stateName}"`);
    }
}

async function uploadToS3({fileName, data}) {
    const client = getAwsClient();

    const destPrefix = 'irev-exporter/results/irev_guber'
    const refdataDestPrefix = 'irev-exporter/refdata/irev_guber'

    const lgaObj = _.first(data.lgas);
    const lgaDirName = _.snakeCase(lgaObj.name);
    const wardObj = _.first(data.wards);
    const stateRes = await models.IrevWard.query().select('state_name', 'state_id').where('ward_uid', wardObj._id);
    const stateMap = _.fromPairs(stateRes.map(r => [_.toInteger(r.stateId), r.stateName]));
    const stateDirName = _.snakeCase(stateMap[wardObj.state_id]);

    const refdataKey = path.join(refdataDestPrefix, stateDirName, lgaDirName, fileName);
    const refdataRes = await client.uploadFile(Buffer.from(JSON.stringify(data, null, 4)), {bucket: process.env.S3_BUCKET_NAME, key: refdataKey});
    console.log(`Uploaded "${fileName}" to "${refdataKey}" (${refdataRes.ETag})`);

    const lgaKeyPrefix = path.join(destPrefix, stateDirName, lgaDirName, '/');
    const objs = await client.listBucketObjects(process.env.S3_BUCKET_NAME, lgaKeyPrefix);
    const existingLgaResults = objs.Contents?.map(o => o.Key) || [];

    const startTime = new Date().getTime();
    let resultCount = 0;

    for (const ward of data.data) {
        if (!ward.document?.url || (url.parse(ward.document?.url).pathname === '/')) continue;

        const ext = path.extname(ward.document.url);
        const resultFileName = `${_.snakeCase(ward.polling_unit.pu_code)}${ext}`;

        const docRes = await axios(ward.document.url, {responseType: 'arraybuffer'});

        const resultKey = path.join(destPrefix, stateDirName, lgaDirName, resultFileName);

        if(existingLgaResults.includes(resultKey)){
            console.log(`Result "${resultFileName}" previously uploaded, skipping...`);
            continue;
        }

        const res = await client.uploadFile(Buffer.from(docRes.data), {bucket: process.env.S3_BUCKET_NAME, key: resultKey});

        console.log(`Uploaded "${resultFileName}" to "${resultKey}" (${res.ETag})`);
        resultCount += 1;
    }

    const endTime = new Date().getTime();
    const duration = endTime - startTime;

    console.log(`Uploading ${resultCount} results for "${lgaDirName}" LGA took ${moment.duration(duration).humanize()}`);
}

gulp.task('upload:irev-guber:s3', async () => {
    for await (const data of downloadWardJson()) {
        await uploadToS3(data);
    }
});

gulp.task('enrich:pus:cvr', async () => {
    const baseDir = '/Users/anthony/Downloads/cvr_data_states';

    try {
        for (const stateDirName of await fs.readdir(baseDir)) {
            if (stateDirName.startsWith('.')) continue;

            const [_cvr, _state, stateIdStr] = stateDirName.split('_', 4);

            if(_.toInteger(stateIdStr) < 19){
                console.log('skipping state:', stateDirName);
                continue;
            }

            for (const wardDirName of await fs.readdir(path.join(baseDir, stateDirName))) {
                if (wardDirName === 'results.json' || wardDirName.startsWith('.')) continue;

                const resultsDirPath = path.join(baseDir, stateDirName, wardDirName);

                for (const resultFileName of await fs.readdir(resultsDirPath)) {
                    if (resultFileName.startsWith('.')) continue;

                    const resultFilePath = path.join(resultsDirPath, resultFileName);
                    const data = require(resultFilePath);
                    const {pu, synced_accreditations, result} = data.result;
                    const {registered_voters, delim} = pu;

                    const puCode = delim.replaceAll('-', '/');

                    const res = await models.IrevPu.query().update({
                        votersAccredited: synced_accreditations,
                        votersRegistered: registered_voters,
                        documentCvrUrl: result
                    }).where('pu_code', puCode);

                    const res2 = await models.PuData.query().update({
                        votersAccreditedBvas: synced_accreditations,
                        votersRegisteredCvr: registered_voters,
                        documentCvrUrl: result
                    }).where('pu_code', puCode).andWhere('election_type', ElectionType.PRESIDENTIAL);

                    console.log('updated:', stateDirName, wardDirName, puCode, res, res2);
                }
            }
        }

    }finally {
        await models.IrevPu.knex().destroy();
    }
})

gulp.task('upload:irev-results:s3', async () => {
    const client = getAwsClient();
    const destPrefix = 'irev-exporter/results/irev_guber'

    const basePath = `/Volumes/T7/irev_data_guber`;

    for (const stateDirName of await fs.readdir(basePath)) {
        const stateDirPath = path.join(basePath, stateDirName);
        console.log('State path:', stateDirPath);

        if(stateDirName === 'delta') continue;

        for (const lgaDirName of await fs.readdir(stateDirPath)) {
            const lgaDirPath = path.join(stateDirPath, lgaDirName);
            console.log('LGA path:', lgaDirPath);

            const lgaKeyPrefix = path.join(destPrefix, stateDirName, lgaDirName, '/');
            const objs = await client.listBucketObjects(process.env.S3_BUCKET_NAME, lgaKeyPrefix);
            const existingLgaResults = objs.Contents?.map(o => o.Key) || [];

            const startTime = new Date().getTime();
            let resultCount = 0;

            for (const resultFileName of await fs.readdir(lgaDirPath)) {

                const resultPath = path.join(lgaDirPath, resultFileName);
                const resultKey = path.join(destPrefix, stateDirName, lgaDirName, resultFileName);

                if(existingLgaResults.includes(resultKey)){
                    console.log(`Result "${resultFileName}" previously uploaded, skipping...`);
                    continue;
                }

                const res = await client.uploadFile(await fs.readFile(resultPath), {
                        bucket: process.env.S3_BUCKET_NAME,
                        key: resultKey}
                    );

                console.log(`Uploaded "${resultFileName}" to "${resultKey}" (${res.ETag})`);
                resultCount += 1;
            }

            const endTime = new Date().getTime();
            const duration = endTime - startTime;

            console.log(`Uploading ${resultCount} results for "${lgaDirName}" LGA took ${moment.duration(duration).humanize()}`);
        }
    }
});


const TEST = {
    'Void Votes': '0',
    'Accredited Voters': '102',
    PDP: '3',
    APC: '57',
    NNPP: '',
    SDP: '',
    LP: '38',
    ADC: '2',
    Notes: '',
    result: "{'url':'0bfc6d679e86aa90147d98f2d14dbcfa9cca9d6f800eb8a06ac5633d313267b1.jpeg','size':2953499,'width':4032,'height':3024,'filename':'29E0041D-8AD3-4B3E-92A1-778938DB7739.jpeg'}",
    'PU identifier': '24-03-05-013',
    Final: '',
    'PU identifier2': '',
    Name: 'Martins Adeolu',
    'Phone Number': '70',
    Created: '2023-03-19T09:47:02.681Z',
    Updated: '2023-03-19T09:47:02.681Z'
}

const toInt = (value) => {
    const v = parseInt(value);
    return isNaN(v) ? null : v;
}

gulp.task('import:enugu-situation-room:csv', async () => {
    const rows = await Csv().fromFile('./inputs/enugu_east.csv');

    console.log(rows[0]);
    const puRes = await models.IrevPu.query()
        .where('state_name', 'ENUGU')
        .andWhere('lga_name', 'ENUGU EAST')
        .orderBy([
            {column: 'ward_id', order: 'asc'},
            {column: 'name', order: 'asc'}
        ]);

    let puDataList = [];
    const mapping = _.fromPairs(rows.map(r => [r['PU'], r]));
    let unmapped = [];
    let idx = 0;

    const client = getAwsClient();
    let wardData = {};

    try {

        for (const pu of puRes) {
            const puName = pu.name.replaceAll('  ', ' ');
            const row = mapping[puName];

            delete mapping[puName];

            if (!row) {
                unmapped.push(pu.name);
                continue;
            }

            const fileName = `data_ward_${pu.wardUid}.json`;
            const stateName = _.snakeCase(pu.stateName);
            const lgaName = _.snakeCase(pu.lgaName);
            const key = `irev-exporter/refdata/irev_guber/${stateName}/${lgaName}/${fileName}`;

            let data = wardData[key];

            if (!data) {
                const fileStream = await client.readFile({bucket: process.env.S3_BUCKET_NAME, key});

                let buf = [];
                for await (const chunk of fileStream) {
                    buf.push(chunk);
                }

                data = wardData[key] = JSON.parse(Buffer.concat(buf).toString());
            }

            if (!data) continue;

            const puG = _.find(data.data, (p) => p.pu_code === pu.puCode);

            //console.log(data);

            if (!puG.document?.url || (url.parse(puG.document?.url).pathname === '/')) continue;
            //console.log(`wardName=${pu.wardName}, wardId=${pu.puId}, PU=${pu.name}, exPU=${row?.['PU']}`);

            const puData = {
                name: pu.name,

                puId: pu.puId,
                puCode: pu.puCode,
                wardId: pu.wardUid,
                wardName: pu.wardName,

                stateId: pu.stateId,
                stateName: pu.stateName || null,

                lgaId: pu.lgaId,
                lgaName: pu.lgaName,

                contributorUsername: 'enugu-situation-room',

                documentUrl: puG.document.url,
                documentSize: puG.document.size,
                documentType: path.extname(puG.document.url).slice(1),
                documentUpdatedAt: new Date(puG.document.updated_at),
                numberOfPrevDocuments: (puG.old_documents || []).length,

                votesLp: toInt(row['LP']),
                votesApc: toInt(row['APC']),
                votesPdp: toInt(row['PDP']),
                votesApga: toInt(row['APGA']),

                votesCast: toInt(row['VALID VOTES']),
                votersAccredited: toInt(row['IReV ACCRED VOTERS']),
                votersAccreditedBvas: toInt(row['BVAS ACCRED  DATA']),
                votersRegistered: toInt(row['REG VOTERS']),

                electionType: ElectionType.GOVERNORSHIP,
                comment: _.trim(row['REMARKS']),

                source: DataSource.IREV,

                createdById: 1,
                updatedById: 1
            }

            puDataList.push(puData);
            idx += 1;
        }

        await models.PuData.query().insert(puDataList);
        console.log(`saved ${puDataList.length} records`, puDataList[0]);
    } finally {
        await models.PuData.knex().destroy();
    }

});

gulp.task('import:grv-situation-room:csv', async () => {

    const rows = await Csv().fromFile('./election_results_2023_lagos.csv');
    const baseUrl = 'https://proton-uploads-production.s3.amazonaws.com/';
    let puDataList = [];

    const puRes = await models.IrevPu.query().where('state_name', 'LAGOS');
    const puMap = _.fromPairs(puRes.map(r => [r.puCode, r]));

    let rowNum = 1;
    for (const row of rows) {
        const puCode = _.trim(row['PU identifier']).replaceAll('-', '/');
        const pu = puMap[puCode];
        const docInfo = _.trim(row.result) ? JSON.parse(row.result.replaceAll('\'', '"')) : null;

        rowNum += 1;

        if(!docInfo || toInt(row['APC']) > 100000){
            console.error(`Invalid entry detected row #${rowNum}:`, row);
            continue;
        }

        const puData = {
            name: pu.name,

            puId: pu.puId,
            puCode,
            wardId: pu.wardId,
            wardName: pu.wardName,

            stateId: pu.stateId,
            stateName: pu.stateName || null,

            lgaId: pu.lgaId,
            lgaName: pu.lgaName,

            contributorUsername: _.trim(row['Name']),

            documentUrl: `${baseUrl}${docInfo.url}`,
            documentSize: docInfo.size,
            documentType: path.extname(docInfo.url).slice(1),
            documentUpdatedAt: new Date(row['Created']),

            votesLp: toInt(row['LP']),
            votesApc: toInt(row['APC']),
            votesPdp: toInt(row['PDP']),
            votesNnpp: toInt(row['NNPP']),
            votesAdc: toInt(row['ADC']),
            votesSdp: toInt(row['SDP']),

            votesVoided: toInt(row['Void Votes']),
            votersAccredited: toInt(row['Accredited Voters']),

            electionType: ElectionType.GOVERNORSHIP,
            comment: _.trim(row['Notes']),

            agentPhoneNumber: _.trim(row['Phone Number']),
            source: 'grv-situation-room',

            createdById: 1,
            updatedById: 1
        }

        puDataList.push(puData);
    }

    try{
        const chunked = _.chunk(puDataList, 999);

        let batchIdx = 1;
        for (const chunk of chunked) {
            await models.PuData.query().insert(chunk);
            console.log(`Inserted chunked data into "${models.PuData.tableName}": ${batchIdx} of ${chunked.length}`);
            batchIdx += 1;
        }

    }finally {
        await models.PuData.knex().destroy();
    }
});

const SCHEMA = [
    {column: 'Created At', type: Date, value: data => data.createdAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Updated At', type: Date, value: data => data.updatedAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Name', type: String, value: data => data.name},
    {column: 'Pu Id', type: String, value: data => data.puId},
    {column: 'Pu Code', type: String, value: data => data.puCode},
    {column: 'Ward Id', type: String, value: data => data.wardId},
    {column: 'Ward Name', type: String, value: data => data.wardName},
    {column: 'State Id', type: String, value: data => data.stateId ? _.toString(data.stateId) : null},
    {column: 'State Name', type: String, value: data => data.stateName},
    {column: 'Document Url', type: String, value: data => data.documentUrl},
    {column: 'Document Type', type: String, value: data => data.documentType},
    {column: 'Document Size', type: Number, value: data => data.documentSize},
    {column: 'Document Updated At', type: Date, value: data => data.documentUpdatedAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Document Hash', type: String, value: data => data.documentHash},
    {column: 'Votes Lp', type: Number, value: data => data.votesLp},
    {column: 'Votes APC', type: Number, value: data => data.votesApc},
    {column: 'Votes PDP', type: Number, value: data => data.votesPdp},
    {column: 'Votes NNPP', type: Number, value: data => data.votesNnpp},
    {column: 'Votes SDP', type: Number, value: data => data.votesSdp},
    {column: 'Votes ADC', type: Number, value: data => data.votesAdc},
    {column: 'Votes Voided', type: Number, value: data => data.votesCast},
    {column: 'Voters Accredited', type: Number, value: data => data.votersAccredited},
    {column: 'Contributor Display Name', type: String, value: data => data.contributorUsername},
    {column: 'Lga Id', type: Number, value: data => data.lgaId},
    {column: 'Lga Name', type: String, value: data => data.lgaName},

    {column: 'Phone Number', type: String, value: data => data.agentPhoneNumber},
    {column: 'Notes', type: String, value: data => data.comment},
]


gulp.task('export:excel:grv-data', async () => {
    try{
        const data = await models.PuData.query().where('source', 'grv-situation-room');
        const stream = await writeXlsxFile(data, {schema: SCHEMA});

        const buffers = [];

        for await (const data of stream) {
            buffers.push(data);
        }

        const finalBuffer = Buffer.concat(buffers);
        await fs.writeFile('election_data_grv_CLEANED.xlsx', finalBuffer);
        console.log('Done');
    }finally {
        await models.PuData.knex().destroy();
    }
})

async function downloadDocs(election='presidential'){
    const isPresidential = election === 'presidential';
    const basePath = `/Volumes/T7/${isPresidential ? 'irev_data' : 'irev_data_guber'}`;
    const baseSrcDir = isPresidential ? './build' : './build/guber';

    for(const fn of await fs.readdir(baseSrcDir)){
        if(!fn.startsWith('data_ward_')) continue;

        const data = require(`${baseSrcDir}/${fn}`);

        const lgaData = require(`./build/data_lgas_${_.first(data.wards).state_id}.json`);
        const stateName = _.first(lgaData.data).state.name;

        const lgaName = _.first(data.lgas).name;

        //if(stateName.toLowerCase() !== 'ogun') continue;

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

gulp.task('download:results:presidential', async () => {
    await downloadDocs();
});

gulp.task('download:results:guber', async () => {
    await downloadDocs('guber');
});

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
            return document.querySelector('iframe')?.src;
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

function padDate(segment) {
    segment = segment.toString();
    return segment[1] ? segment : `0${segment}`;
}

function yyyymmddhhmmss(offsetSecs=0) {
    const d = new Date();
    return (
        d.getFullYear().toString() +
        padDate(d.getMonth() + 1) +
        padDate(d.getDate()) +
        padDate(d.getHours()) +
        padDate(d.getMinutes()) +
        padDate(d.getSeconds() + offsetSecs)
    );
}

const migrationTemplate2 = `
exports.up = function(knex) {
    return knex.schema
<%= modelDef.renderUp() %>}

exports.down = function(knex) {
    return knex.schema
<%= modelDef.renderDown() %>}

exports.jsonSchema = <%= JSON.stringify(modelDef.schema || {}, null, 4) %>;
`

async function dbMigrationFilesGenerate(){
    const compiled = _.template(migrationTemplate2);
    // const modelDefs = [{tableName: 'users', columnDefs: [
    //         {name: 'id', typeFunc: 'increments', isPrimary: true, nullable: false, default: 'knex.fn.now()'}
    //     ]}];
    const typeFuncMap = {
        string: 'string',
        integer: 'integer',
        date: 'date',
        datetime: 'dateTime',
        text: 'text',
        boolean: 'boolean',
        uuid: 'uuid',
    }
    const auditCols = ['createdAt', 'updatedAt'];

    const modelsFilered = _.filter(models, (mCls) => mCls && mCls.tableName);

    const modelDefs = _.map(modelsFilered, (cls) => {

        const modelDef = {
            tableName: cls.tableName,
            schema: cls.jsonSchema,
            //dropCols: `'${_.join(['createdAt', 'deletedAt'], '\', \'')}'`,
        };

        modelDef.columnDefs = _.map(cls.columns(), (col) => {
            let typeFunc, typeFuncArgs = null;

            if(!_.isEmpty(col.enum)){
                typeFunc = 'enum';
                typeFuncArgs = `, ['${_.join(col.enum, '\', \'')}']`; //, {useNative: true, enumName: '${_.snakeCase(col.name)}_type'}
            }else{
                typeFunc = col.name === 'id' ? 'increments' : typeFuncMap[col.type] || null;
            }


            let defaultVal = null;
            if(col.type === 'datetime' && _.includes(auditCols, col.name)){
                defaultVal = 'knex.fn.now()';

            } else if(col.type === 'uuid') {
                defaultVal = 'knex.raw(\'uuid_generate_v4()\')';
            }

            return {
                name: col.name,
                colName: col.colName,
                typeFunc, typeFuncArgs,
                isPrimary: col.name === 'id',
                isUnique: col.unique,
                nullable: col.nullable,
                default:  defaultVal,
            }
        });
        return modelDef;
    });

    const [migratedFiles, rest] = await knex.migrate.list();
    const allFiles = _.concat([], migratedFiles, rest.map(obj => obj.file));
    const migrationDir = require('./knexfile').development.migrations.directory;

    //console.log('[MIGRATIONS]', allFiles);


    const schemaDiff2 = (oldSchema, newSchema, columnDefs) => {
        if (oldSchema == null) {

            return {
                up: {changeType: 'create', properties: newSchema.properties, required: newSchema.required},
                down: {changeType: 'drop'},
            };
        }

        const prevAttrs = _.keys(oldSchema.properties);
        const currentAttrs = _.keys(newSchema.properties);

        let newAttributes = _.difference(currentAttrs, prevAttrs);
        let columnNames = _.map(columnDefs, (c) => c.name);

        let properties = {};
        for(let [key, val] of _.toPairs(newSchema.properties)){
            if(!(_.includes(prevAttrs, key) || _.includes(columnNames, key))) continue;
            if(!_.includes(newAttributes, key)) continue;
            properties[key] = val;
        }

        if(_.isEmpty(properties)) return {
            up: null,
            down: null
        }

        return {
            up: {changeType: 'alter', properties, required: newSchema.required},
            down: {changeType: 'drop', attrNames: _.keys(properties)}
        };
    }

    let tsIncrement = 0;

    for(let modelDef of modelDefs){

        const lastFile = _.findLast(allFiles, (fl) => {
            const [tsString] = _.split(fl.name, '_', 1);
            return fl.name.substring(tsString.length) === `_${modelDef.tableName}.js`;
        });

        const migName = path.join(migrationDir, `${yyyymmddhhmmss(tsIncrement)}_${(modelDef.tableName)}.js`);
        tsIncrement += 1;

        const lastFilePath = lastFile ? path.join(migrationDir, lastFile.name) : null;
        let changesOrig;

        if(lastFilePath && await fileExists(lastFilePath)){
            const {jsonSchema: schema} = require(lastFilePath);
            changesOrig = schemaDiff2(schema, modelDef.schema, modelDef.columnDefs);
        }else{
            changesOrig = schemaDiff2(null, modelDef.schema, modelDef.columnDefs);
        }

        const down = changesOrig.down;
        const up = changesOrig.up;

        if(_.isEmpty(up) && _.isEmpty(down)) {
            console.log(`[dbMigrationFilesGenerate] skipping "${migName}"`);
            continue
        }

        modelDef.renderUp = () => {
            let lines = [];

            const colMap = _.fromPairs(_.map(modelDef.columnDefs, (c) => { return [c.name, c] }));

            lines.push(`\t\t.${up.changeType}Table('${modelDef.tableName}', (table) => {`);

            const {properties, required} = up;

            for (const [attrName, props] of _.toPairs(properties)) {
                const col = colMap[attrName];

                if(!col){
                    console.log(`[renderUp] '${modelDef.tableName}' skipping ${attrName}...`);
                    continue;
                }

                const indent = '\t\t\t';

                let txt = `${indent}table.${col.typeFunc}('${col.colName}'${ col.typeFuncArgs ? col.typeFuncArgs : ''})`
                const markedLen = lines.length;

                if(col.isPrimary) lines.push(`${indent}\t.primary()`);
                if(col.isUnique) lines.push(`${indent}\t.unique()`);
                if(!col.nullable) lines.push(`${indent}\t.notNullable()`);
                if(col.default) lines.push(`${indent}\t.defaultTo(${col.default});`);

                if(lines.length === markedLen){
                    lines.splice(markedLen, 0, `${txt};`);
                } else {
                    lines.splice(markedLen, 0, `${txt}`);
                }
            }

            lines.push(`\t\t});\n`);

            return _.join(lines, '\n');
        }

        modelDef.renderDown = () => {
            let lines = [];
            if(down.attrNames) {
                lines.push(`\t\t.alterTable('${modelDef.tableName}', (table) => {`);
                for (const attrName of down.attrNames) {
                    const colName = _.find(modelDef.columnDefs, (c) => c.name === attrName).colName;
                    const txt = `\t\t\ttable.dropColumn('${colName}');`;
                    lines.push(txt);
                }
                lines.push(`\t\t});\n`);
            } else {
                lines.push(`\t\t\t.dropTableIfExists('${modelDef.tableName}')\n`);
            }
            return _.join(lines, '\n');
        }

        const text = compiled({modelDef});


        console.log(`name: ${migName}\n${modelDef.renderUp()}`);

        await fs.writeFile(migName, text.replace(/^\s*[\r\n]/gm, ''));
    }
}

gulp.task('import:refdata:irev', importIrevRefdata);

gulp.task('db:migration:generate', async function (done) {
    await dbMigrationFilesGenerate()
    done();
});


gulp.task('import:users:pudata', importUsersFromPuData);