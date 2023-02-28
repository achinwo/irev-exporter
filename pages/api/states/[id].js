import {STATES} from "../states";
import _ from 'lodash';

export default function userHandler(req, res) {
    const { query, method } = req;
    const id = parseInt(query.id, 10);
    const name = query.name;

    switch (method) {
        case 'GET':
            res.status(200).json(_.find(STATES, (s) => s.id === id));
            break
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}