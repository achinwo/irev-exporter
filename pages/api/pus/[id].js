import axios from "axios";
const https = require('https');
import {STATES} from "../states";
import _ from 'lodash';
import {BASE_URL_KVDB, fetchWardData} from "../../../src/utils";
import {KEY_CONTRIBUTOR} from "../../index";

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