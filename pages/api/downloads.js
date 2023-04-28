import stream from 'stream';
import {promisify} from 'util';
import writeXlsxFile from 'write-excel-file/node'
import _ from 'lodash';
import {PuData, User} from "../../src/orm";
import {DataSource, ElectionType, STATES} from "../../src/ref_data";

const pipeline = promisify(stream.pipeline);

export default async function handler(req, res) {
    const {method, query} = req;
    const stateId = _.toInteger(query.stateId);

    if(method !== 'GET') return res.status(400).json({errorMessage: 'Bad Request', method, stateId});

    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    };

    let data, fileName;
    if(stateId){
        data = await PuData.query().where('state_id', stateId)
            .andWhere('election_type', query.electionType ? query.electionType : ElectionType.PRESIDENTIAL)
            .andWhere('source', DataSource.IREV);
        const state = _.find(STATES, (s) => s.id === stateId);

        fileName = `irev_export_${_.snakeCase(state.name)}_${_.snakeCase(new Date().toLocaleDateString("en-GB", options))}.xlsx`;
    } else {
        data = await PuData.query().where('election_type', ElectionType.PRESIDENTIAL);
        fileName = `irev_export_${_.snakeCase(new Date().toLocaleDateString("en-GB", options))}.xlsx`;
    }

    console.log('export file name:', fileName);

    res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${fileName}`
    });

    const recs = await User.query().select('display_name', 'contributor_id');
    const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));

    try {
        for (const row of data) {
            const contribId = _.trim(row.contributorUsername);
            const contribIdRev = row.reviewedByContributorId ? _.trim(row.reviewedByContributorId) : null;
            delete row['contributorUsername'];
            delete row['reviewedByContributorId'];

            row.contributorDisplayname = mapping[contribId] || '(unmapped contributor)';
            row.reviewedByContributorId = contribIdRev ? mapping[contribIdRev] || '(unmapped reviewer)' : null;
        }

        const fileStream = await writeXlsxFile(data, {schema: SCHEMA});
        await pipeline(fileStream, res);
    } catch (e) {
        console.error(e);
        res.status(500).end(`An internal server error occurred while exporting the data`);
    }
}

const SCHEMA = [
    {column: 'Created At', type: Date, value: data => data.createdAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Updated At', type: Date, value: data => data.updatedAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Name', type: String, value: data => data.name},
    {column: 'Pu Id', type: String, value: data => data.puId},
    {column: 'Pu Code', type: String, value: data => data.puCode},
    {column: 'Ward Id', type: String, value: data => data.wardId},
    {column: 'Ward Name', type: String, value: data => data.wardName},
    {column: 'State Id', type: String, value: data => data.stateId ? _.toString(data.stateId) : null},
    {column: 'State Name', type: String, value: data => data.stateName},
    {column: 'Document Url', type: String, value: data => data.documentUrl},
    {column: 'Document Type', type: String, value: data => data.documentType},
    {column: 'Document Size', type: Number, value: data => data.documentSize},
    {column: 'Document Updated At', type: Date, value: data => data.documentUpdatedAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Document Hash', type: String, value: data => data.documentHash},
    {column: 'Number Of Prev Documents', type: Number, value: data => data.numberOfPrevDocuments},
    {column: 'Votes Lp', type: Number, value: data => data.votesLp},
    {column: 'Votes Apc', type: Number, value: data => data.votesApc},
    {column: 'Votes Pdp', type: Number, value: data => data.votesPdp},
    {column: 'Votes Nnpp', type: Number, value: data => data.votesNnpp},
    {column: 'Contributor Display Name', type: String, value: data => data.contributorDisplayname},
    {column: 'Lga Id', type: Number, value: data => data.lgaId},
    {column: 'Lga Name', type: String, value: data => data.lgaName},
    {column: 'Voters Accredited', type: Number, value: data => data.votersAccredited},
    {column: 'Votes Cast', type: Number, value: data => data.votesCast},
    {column: 'Is Result Illegible', type: Boolean, value: data => data.isResultIllegible},
    {column: 'Contains Incorrect Pu Name', type: Boolean, value: data => data.containsIncorrectPuName},
    {column: 'Contains Alterations', type: Boolean, value: data => data.containsAlterations},
    {column: 'Is Inec Stamp Absent', type: Boolean, value: data => data.isInecStampAbsent},
    {column: 'Is Non-EC8 Form', type: Boolean, value: data => data.isNoneEceightForm},

    {column: 'Review Status', type: String, value: data => data.reviewStatus},
    {column: 'Reviewed At', type: Date, value: data => data.reviewedAt, format: 'dd/mm/yyyy hh:mm AM/PM'},
    {column: 'Reviewer Display Name', type: String, value: data => data.reviewedByContributorId},

    {column: 'Election', type: String, value: data => data.electionType},
    {column: 'Data Source', type: String, value: data => data.source},
]