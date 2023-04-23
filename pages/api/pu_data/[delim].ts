import {PuData} from '../../../src/orm';
import { ElectionType } from '../../../src/ref_data';

export default async function userHandler(req, res) {
    const {query, method, body, headers} = req;

    switch (method) {
        case 'GET':
            const puCode = query.delim.replaceAll('-', '/');
            const puData = await PuData.query().where('pu_code', puCode).andWhere('election_type', ElectionType.PRESIDENTIAL).andWhere('source', 'irev').first();
            res.status(200).json({data: puData});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}