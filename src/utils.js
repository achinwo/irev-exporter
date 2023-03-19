import _ from "lodash";
import fetch from "node-fetch";
import archiver from "archiver";
import path from "path";
import url from "url";
import axios from "axios";
import https from "https";
import {PuData, User, IrevWard} from "./orm";
import {ElectionType} from "./ref_data";

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

export const CACHE = {};

export const resolveBaseUrl = async (stateName, electionType) => {
    electionType = electionType || ElectionType.PRESIDENTIAL;

    if(electionType === ElectionType.PRESIDENTIAL) return 'https://lv001-g.inecelectionresults.ng/api/v1/elections/63f8f25b594e164f8146a213/pus';

    const baseUrl = 'https://ncka74vel8.execute-api.eu-west-2.amazonaws.com/abuja-prod/elections';
    const elections = require(`./data_elections.json`).data;
    const electionId = _.find(elections, e => e.state.name === stateName)._id;

    return `${baseUrl}/${electionId}/pus`;
}

const DEFAULT_HEADERS = {
    'sec-ch-ua': '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': "macOS",
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
}

export async function fetchWardData(wardId, opts={includePuData: true, electionType: ElectionType.PRESIDENTIAL}) {
    let electionType = opts?.electionType || ElectionType.PRESIDENTIAL;

    const key = `${wardId}-${electionType}`;
    let data = CACHE[key];
    let startTime = new Date().getTime();

    if(!data){
        const wardRec = await IrevWard.query().select('ward_uid', 'name', 'state_name').where('ward_uid', wardId).first();
        const baseUrl = await resolveBaseUrl(wardRec.stateName, electionType);
        const url = `${baseUrl}?ward=${wardId}`;
        console.log('Fetching url:', url);

        const response = await axios.get(url, {timeout: 50000, headers: DEFAULT_HEADERS});
        data = response.data;

        CACHE[key] = data;
    }

    data['polling_data'] = data['polling_data'] || {};

    if(opts?.includePuData && electionType === ElectionType.PRESIDENTIAL){
        try{
            const puData = await PuData.query().where('ward_id', wardId).andWhere('election_type', ElectionType.PRESIDENTIAL);

            const recs = await User.query().select('display_name', 'contributor_id');
            const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));

            for (const ward of puData) {
                const contributor = mapping[_.trim(ward.contributorUsername)];
                if(!contributor) console.error(`Unable to map contributor username "${ward.contributorUsername}"`);
                ward.contributorUsername = contributor || '(unknown)';
            }

            data['polling_data'] = _.transform(puData, (result, item) => {
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