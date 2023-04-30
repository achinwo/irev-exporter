import {PuData} from '../../../src/orm';
import { ElectionType } from '../../../src/ref_data';
import * as models from "../../../src/orm";

export default async function userHandler(req, res) {
    const {query, method, body, headers} = req;

    switch (method) {
        case 'GET':
            const puCode = query.delim.replaceAll('-', '/');
            const puData = await models.PuData.fetchByPuCode(puCode);
            res.status(200).json({data: puData});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}