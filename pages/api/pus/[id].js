import axios from "axios";
const https = require('https');
import {STATES} from "../states";
import _ from 'lodash';

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
            const resp = await axios.get(`${endpoint}/${wardId}`, {httpsAgent: new https.Agent({
                    rejectUnauthorized: false,//endpoint.indexOf('localhost') > -1
                })});
            data['polling_data'] = resp.data;
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

    switch (method) {
        case 'GET':
            const wardId = query.id;
            const data = await fetchWardData(wardId);
            res.status(200).json(data);
            break
        case 'POST':
            const endpoint = `${BASE_URL_KVDB}/api/polling-data`;
            body.pu.ward.state_name = _.find(STATES, (s) => s.id === body.pu.ward.state_id)?.name;
            console.log('body', body);
            const resp = await axios.post(endpoint, body, {httpsAgent: new https.Agent({
                        rejectUnauthorized: false//endpoint.indexOf('localhost') > -1,
                    })});
            res.status(200).json(resp.data);
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}