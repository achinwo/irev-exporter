import _ from 'lodash';
import {fetchWardData, STATES} from "../../../src/utils";
import {PuData, User} from "../../../src/orm";
import {ElectionType} from "../../../src/ref_data";

export default async function userHandler(req, res) {
    const { query, method, body, headers } = req;

    const electionType = (headers || {})['x-election-type'];
    console.log('HEADERS:', electionType);

    let data;
    switch (method) {
        case 'GET':
            const wardId = query.id;
            data = await fetchWardData(wardId, {electionType, includePuData: true});
            res.status(200).json(data);
            break
        case 'POST':
            body.pu.ward.state_name = _.find(STATES, (s) => s.id === body.pu.ward.state_id)?.name;

            const puCode = body.pu.pu_code;
            const existing = await PuData.query().where('pu_code', puCode).andWhere('election_type', electionType || ElectionType.PRESIDENTIAL).first();

            if(existing){
                res.status(400).json({errorMessage: `Submission exists for "${puCode}" by "${_.trim(existing.contributorDisplayName)}". Refresh the page and try again.`});
                return;
            }

            data = await PuData.createOrUpdate(body);
            res.status(200).json({data});
            break;
        case 'PUT':
            const recordId = _.toInteger(query.id);
            console.log(`[PuData] updating record:`, body);

            // const savedPuData = await PuData.query().where({id: recordId}).first();
            //
            // const preppedData = _.assign({}, body.data, {reviewedByContributorId: body.contributor, contributorUsername: savedPuData.contributorUsername});
            const recData = _.assign({}, body.data);

            delete recData['contributorDisplayName'];
            delete recData['reviewedByDisplayName'];

            const updated = await PuData.query().updateAndFetchById(recordId, recData);
            const ret = await PuData.fetchByPuCode(updated.puCode); // re-fetch for data masking

            res.status(200).json({data: ret});
            break;
        default:
            res.setHeader('Allow', ['GET', 'PUT', 'POST']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}