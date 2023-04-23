import {AppPuView, DataQualityIssue} from "../../src/review_view";
import * as models from '../../src/orm';
import {ReviewStatus} from '../../src/orm/pu_data';
import { ElectionType } from '../../src/ref_data';
import _ from 'lodash';


export async function getServerSideProps({params, query, resolvedUrl}) {
    const {delim} = params;
    let puCode, puData, puCodes;

    const issueNames = Object.values(DataQualityIssue).map(i => i.toLowerCase());

    if(issueNames.includes(delim.toLowerCase())){
        puCodes = await models.PuData.query()
            .select('pu_code', 'name', 'reviewed_at', 'review_status')
            .whereRaw('votes_cast > voters_accredited')
            .andWhereRaw(`(review_status is null OR review_status != '${ReviewStatus.VALIDATED}')`)
            .andWhere('election_type', ElectionType.PRESIDENTIAL)
            .andWhere('source', 'irev')
            .limit(100);

        puCode = _.first(puCodes).puCode;

        puData = await models.PuData.query()
            .where('pu_code', puCode)
            .andWhere('election_type', ElectionType.PRESIDENTIAL)
            .andWhere('source', 'irev').first();
    } else {
        puCode = delim.replaceAll('-', '/');

        puData = await models.PuData.query()
            .where('pu_code', puCode)
            .andWhere('election_type', ElectionType.PRESIDENTIAL)
            .andWhere('source', 'irev').first();

        puCodes = await models.PuData.query()
            .select('pu_code', 'name', 'reviewed_at', 'review_status')
            .where('ward_id', puData.wardId)
            .andWhere('election_type', ElectionType.PRESIDENTIAL)
            .andWhere('source', 'irev');
    }

    const pu = await models.IrevPu.query().where('pu_code', puCode).first();
    puCodes = _.sortBy(puCodes, (o) => o.puCode);

    console.log('[getServerSideProps] puCode:', puCode);
    return {
        props: {...params, puCode, puCodesSerialized: JSON.stringify(puCodes), puSerialized: JSON.stringify(pu.toJson()), puDataSerialized: JSON.stringify(puData.toJson()), query, resolvedUrl},
    }
}


export default AppPuView;