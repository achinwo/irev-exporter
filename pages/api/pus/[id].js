import axios from "axios";
const https = require('https');

const BASE_URL_KVDB = process.env.BASE_URL_KVDB;

export const CACHE = {};

export async function fetchWardData(wardId, opts={includePuData: true}) {
    let data = CACHE[wardId];
    let startTime = new Date().getTime();

    if(!data){
        const url = `https://lv001-g.inecelectionresults.ng/api/v1/elections/63f8f25b594e164f8146a213/pus?ward=${wardId}`;
        console.log('Fetching url:', url);

        const response = await axios.get(url);
        data = response.data;

        CACHE[wardId] = data;
    }

    if(opts?.includePuData){
        const endpoint = `${BASE_URL_KVDB}/api/polling-data`;
        try{
            data['polling_data'] = await axios.get(`${endpoint}/${wardId}`);
        }catch (e) {
            console.log('Unable to fetch polling data:', e.stack);
        }
    }

    let endTime = new Date().getTime();
    data['request_duration'] = endTime - startTime;

    return data;
}

export default async function userHandler(req, res) {
    const { query, method, body } = req;

    const agent = new https.Agent({
        rejectUnauthorized: false
    });

    switch (method) {
        case 'GET':
            const wardId = query.id;
            const data = await fetchWardData(wardId);
            res.status(200).json(data);
            break
        case 'POST':
            const endpoint = `${BASE_URL_KVDB}/api/polling-data`;
            console.log('body', body);
            const resp = await axios.post(endpoint, body, { httpsAgent: agent });
            res.status(200).json(resp.data);
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}