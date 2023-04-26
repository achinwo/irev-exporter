
import _ from 'lodash';
import axios from "axios";
import {STATES} from "../../../src/utils";
import {ElectionType} from "../../../src/ref_data";

let WARD_DATA = null;

async function fetchWardData() {
    if(!WARD_DATA){
        const resp = await axios.get('https://storage.googleapis.com/joli-app-bucket/json-data/data_stats_ward_v3.json');
        WARD_DATA = resp.data;
    }

    return WARD_DATA;
}

export default async function userHandler(req, res) {
    const { query, method } = req;

    switch (method) {
        case 'GET':
            const electionType = query.electionType || ElectionType.PRESIDENTIAL;
            const id = parseInt(query.id, 10);
            const state = _.find(STATES, (s) => s.id === id);

            const response = await axios.get(`https://storage.googleapis.com/joli-app-bucket/json-data/data_lgas_${id}.json`);
            state.lgas = response.data;

            const wardData = await fetchWardData();

            for (const lga of state.lgas.data) {
                for (const ward of lga.wards) {
                    ward['stats'] = wardData[ward.ward_id];
                }
            }

            res.status(200).json(state);
            break
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}