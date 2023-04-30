import {AppPuView, DataQualityIssue} from "../../src/review_view";
import * as models from '../../src/orm';
import { ElectionType } from '../../src/ref_data';
import _ from 'lodash';
import {User} from "../../src/orm";
import moment from "moment";


export async function getServerSideProps({params, query, resolvedUrl}) {
    const {delim} = params;
    let {pu, createdAfter, displayName} = query;

    let contributorId = null;
    if(displayName){
        const userRes = await models.User.query().select('contributor_id').where('display_name', _.trim(displayName)).first();
        contributorId = userRes.contributorId;
    }

    createdAfter = createdAfter ? moment.utc(createdAfter).toDate() : null;
    console.log('[getServerSideProps]', query, params, {createdAfter, contributorId});

    const issueNames = DataQualityIssue.values().map(i => i.toLowerCase());
    let puCode = pu ? pu.replaceAll('-', '/') : null;
    let puData, puCodes;

    //

    if(delim.toLowerCase() === DataQualityIssue.OVER_VOTING.toLowerCase()) {
        puCodes = await models.PuData.fetchOvervoting({limit: 100, contributorId, createdAfter});
    } else if(delim.toLowerCase() === DataQualityIssue.UNENTERED_VOTES.toLowerCase()){
        puCodes = await models.PuData.fetchUnenteredVotes({limit: 100, contributorId, createdAfter});
    } else if(delim.toLowerCase() === DataQualityIssue.VOTES_GT_TTL_VOTES.toLowerCase()){
        puCodes = await models.PuData.fetchInconsistentVotes({limit: 100, contributorId, createdAfter});
    } else if(delim.toLowerCase() === DataQualityIssue.FALSE_ILLEGIBLE.toLowerCase()){
        puCodes = await models.PuData.fetchFalseIllegibles({limit: 100, contributorId, createdAfter});
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

    puCodes = _.sortBy(puCodes, (o) => o.puCode);

    if(puCode && !_.find(puCodes, (p) => p.puCode)){
        puCode = null;
    }

    puCode = puCode || _.first(puCodes)?.puCode;

    const statsRaw = await models.PuData.fetchDataQualityStats({contributorId, createdAfter});
    let stats = {};

    for (const [key, count] of _.toPairs(statsRaw)) {
        stats[key] = {label: DataQualityIssue.labelFor(key), count};
    }

    if(!puCode){
        return {
            props: {...params, stats, puCode: puCode || null, puCodesSerialized: JSON.stringify(puCodes),
                puSerialized: JSON.stringify(null), puDataSerialized: JSON.stringify(null),
                query, resolvedUrl},
        }
    }

    const puObj = await models.IrevPu.query().where('pu_code', puCode).first();

    puData = puData || (await models.PuData.query()
        .where('pu_code', puCode)
        .andWhere('election_type', ElectionType.PRESIDENTIAL)
        .andWhere('source', 'irev').first());

    const recs = await User.query().select('display_name', 'contributor_id');
    const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));

    puData.contributorUsername = mapping[_.trim(puData.contributorUsername)] || '(unknown)';
    puData.reviewedByContributorId = mapping[_.trim(puData.reviewedByContributorId)] || '(unknown reviewer)';

    console.log('[getServerSideProps] puCode:', puCode, stats);
    return {
        props: {...params, stats, puCode, puCodesSerialized: JSON.stringify(puCodes),
            puSerialized: JSON.stringify(puObj.toJson()), puDataSerialized: JSON.stringify(puData.toJson()),
            query, resolvedUrl},
    }
}


export default AppPuView;