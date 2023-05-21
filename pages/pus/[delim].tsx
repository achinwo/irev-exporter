import {AppPuView, DataQualityIssue} from "../../src/review_view";
import * as models from '../../src/orm';
import {ElectionType, ReviewStatus} from '../../src/ref_data';
import _ from 'lodash';
import moment from "moment";


export async function getServerSideProps({params, query, resolvedUrl}) {
    const {delim} = params;
    let {pu, createdAfter, displayName, docType, stateName} = query;

    let contributorId = null;
    if(displayName){
        const userRes = await models.User.query().select('contributor_id').where('display_name', _.trim(displayName)).first();
        contributorId = userRes.contributorId;
    }

    const excludePdfs: boolean = _.trim(_.toString(docType)) === 'imagesOnly' ? true : null;
    stateName = _.trim(_.toString(stateName)) ? stateName : null;
    createdAfter = createdAfter ? moment.utc(createdAfter).toDate() : null;
    console.log('[getServerSideProps]', query, params, {createdAfter, contributorId, excludePdfs, stateName});

    const issueNames = DataQualityIssue.values().map(i => i.toLowerCase());
    let puCode = pu ? pu.replaceAll('-', '/') : null;
    let puData, puCodes;

    if(delim.toLowerCase() === DataQualityIssue.OVER_VOTING.toLowerCase()) {
        puCodes = await models.PuData.fetchOvervoting({limit: 100, contributorId, createdAfter, excludePdfs, stateName});
    } else if(delim.toLowerCase() === DataQualityIssue.UNENTERED_VOTES.toLowerCase()){
        puCodes = await models.PuData.fetchUnenteredVotes({limit: 100, contributorId, createdAfter, excludePdfs, stateName});
    } else if(delim.toLowerCase() === DataQualityIssue.VOTES_GT_TTL_VOTES.toLowerCase()){
        puCodes = await models.PuData.fetchInconsistentVotes({limit: 100, contributorId, createdAfter, excludePdfs, stateName});
    } else if(delim.toLowerCase() === DataQualityIssue.FALSE_ILLEGIBLE.toLowerCase()){
        puCodes = await models.PuData.fetchFalseIllegibles({limit: 100, contributorId, createdAfter, excludePdfs, stateName});
    } else if([ReviewStatus.RETURNED.toLowerCase(), ReviewStatus.VALIDATED.toLowerCase()].includes(delim.toLowerCase())){
        const status = ReviewStatus.RETURNED.toLowerCase() === delim.toLowerCase() ? ReviewStatus.RETURNED : ReviewStatus.VALIDATED;
        puCodes = await models.PuData.fetchByReviewStatus(status, {limit: 100, contributorId, createdAfter, excludePdfs, stateName});
    } else {
        puCode = delim.replaceAll('-', '/');

        puData = await models.PuData.fetchByPuCode(puCode);

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

    const statsRaw = await models.PuData.fetchDataQualityStats({contributorId, createdAfter, excludePdfs, stateName});
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

    puData = puData || (await models.PuData.fetchByPuCode(puCode));

    console.log('[getServerSideProps] puCode:', puCode, stats);
    return {
        props: {...params, stats, puCode, puCodesSerialized: JSON.stringify(puCodes),
            puSerialized: JSON.stringify(puObj.toJson()), puDataSerialized: JSON.stringify(puData.toJson()),
            query, resolvedUrl},
    }
}


export default AppPuView;