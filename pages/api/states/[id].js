import {STATES} from "../states";
import _ from 'lodash';
import axios from "axios";

export default async function userHandler(req, res) {
    const { query, method } = req;
    const id = parseInt(query.id, 10);
    const state = _.find(STATES, (s) => s.id === id);

    const response = await axios.get(`https://storage.googleapis.com/joli-app-bucket/json-data/data_lgas_${id}.json`);
    state.lgas = response.data;

    switch (method) {
        case 'GET':
            res.status(200).json(state);
            break
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}