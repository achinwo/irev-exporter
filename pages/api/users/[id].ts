import {User} from '../../../src/orm';
import _ from "lodash";

export default async function handler(req, res) {
    const {method, query} = req;

    switch (method) {
        case 'GET':
            const user = await User.query().where({contributor_id: _.trim(decodeURIComponent(query.id))}).first();
            res.json({data: user});
            break;
        case 'PUT':
            const updatedUser = await User.query().updateAndFetchById(query.id, req.body);
            res.json({data: updatedUser});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}