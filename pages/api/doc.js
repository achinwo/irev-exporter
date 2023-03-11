import url from 'url';
import axios from "axios";
import path from 'path';
import {BASE_URL_KVDB} from "../../src/utils";
import https from "https";

export default async function handler(req, res) {
    const {method, query} = req;

    switch (method) {
        case 'GET':
            const endpoint = `${BASE_URL_KVDB}/api/polling-data/doc`;
            const response = await axios.post(endpoint, {url: query.url},{
                responseType: 'arraybuffer',
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false,
                })});

            res.setHeader('Content-Type', 'image/png')
            res.end(response.data);

            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}

export const config = {
    api: {
        responseLimit: '12mb',
    },
}