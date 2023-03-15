import _ from 'lodash';
import {fetchWardData, STATES} from "../../../src/utils";
import {PuData} from "../../../src/orm";

export default async function userHandler(req, res) {
    const { query, method, body } = req;
    let data;
    switch (method) {
        case 'GET':
            const wardId = query.id;
            data = await fetchWardData(wardId);
            res.status(200).json(data);
            break
        case 'POST':
            body.pu.ward.state_name = _.find(STATES, (s) => s.id === body.pu.ward.state_id)?.name;

            const puCode = body.pu.pu_code;
            const existing = await PuData.query().where('pu_code', puCode).first();

            if(existing){
                res.status(400).json({errorMessage: `Submission exists for "${puCode}" by "${_.trim(existing.contributorUsername)}". Refresh the page and try again.`});
                return;
            }

            data = await PuData.createOrUpdate(body);
            res.status(200).json({data});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}