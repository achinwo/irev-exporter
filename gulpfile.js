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
const {STATES} = require('./src/ref_data');

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

exports.importUsersFromPuData = async function(){
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
            //.where('contributor_username', '!=', adminContribId)
            .groupBy('contributor_username');

        //console.log(pus);
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
                displayName: `Contributor #${idx}`,
                firstContributedAt: puData.firstDataEnteredAt,
                createdById: adminUser.id,
                updatedById: adminUser.id,
            }

            newUsers.push(newUser);
            idx += 1;
        }

        await models.User.query().insert(newUsers);
        console.log('Created new users:', newUsers.length);
    } finally {
        await models.PuData.knex().destroy()
    }
}

const AwsClientS3 = require("aws-client-s3");
const {User} = require("./src/orm");

exports.fetchS3 = async function(){
    const config = {
        region: process.env.S3_REGION,
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
        }
    };

    const client = new AwsClientS3(config);

    const objs = await client.listBucketObjects(process.env.S3_BUCKET_NAME, 'all');

    for (const obj of objs.Contents) {
        console.log(obj);
    }

    // const fileStream = await client.readFile({
    //     bucket: "citizens-bucket",
    //     key: "Test.txt",
    // });
    //
    // await fs.writeFile('./s3-file.txt', fileStream);
}

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

exports.exportWardResults = async function(){
    const wardData = {};
    for(const fn of await fs.readdir('./build')) {
        if (!fn.startsWith('data_ward_')) continue;

        const data = require(`./build/${fn}`);
        const numResults = _.sum(data.data.map((pu) => !pu.document?.url || (url.parse(pu.document?.url).pathname === '/') ? 0 : 1) || [0]);

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
        };
    }

    await fs.writeFile('./build/data_stats_ward.json', JSON.stringify(wardData, null, 4));
}

const fileExists = async (filePath) => {
    try {
        await fs.stat(filePath);
        return true;
    } catch (e) {
        return e.code !== 'ENOENT';
    }
};

exports.downloadDocs = async function(){
    const basePath = '/Volumes/T7/irev_data';

    for(const fn of await fs.readdir('./build')){
        if(!fn.startsWith('data_ward_')) continue;

        const data = require(`./build/${fn}`);

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

exports.santizeResults = async function(){

    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });

    let lgaNames = [];
    for(const fn of await fs.readdir('./build')){
        if(!fn.startsWith('data_lgas_')) continue;

        const data = require(`./build/${fn}`);

        for (const lga of data.data) {
            lgaNames.push(lga.lga.name);
        }
    }

    const res = await axios.post(`https://localhost:8080/api/polling-data/badlgas`, {lgaNames}, {httpsAgent});

    console.log('DATA:', res.data.data.length);
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

        let newAttributes = _.difference(currentAttrs,??prevAttrs);
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

gulp.task('db:migration:generate', async function (done) {
    await dbMigrationFilesGenerate()
    done();
});