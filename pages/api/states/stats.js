import _ from 'lodash';
import axios from "axios";
import {BASE_URL_KVDB, fetchWardData, STATES} from "../../../src/utils";
import https from "https";

export default async function userHandler(req, res) {
    const { query, method, body } = req;

    switch (method) {
        case 'GET':
            const endpoint = `${BASE_URL_KVDB}/api/polling-data/stats`;
            const resp = await axios.get(endpoint, {httpsAgent: new https.Agent({
                    rejectUnauthorized: false//endpoint.indexOf('localhost') > -1,
                })});
            res.status(200).json(resp.data);
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}