import stream from 'stream';
import {promisify} from 'util';
import writeXlsxFile from 'write-excel-file/node'
import axios from "axios";
import {BASE_URL_KVDB} from "../../src/utils";
import https from "https";
import _ from 'lodash';
import {User} from "../../src/orm";

const pipeline = promisify(stream.pipeline);

export default async function handler(req, res) {

    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    };

    const endpoint = `${BASE_URL_KVDB}/api/polling-data`;
    const response = await axios.get(endpoint, {httpsAgent: new https.Agent({
            rejectUnauthorized: false,//endpoint.indexOf('localhost') > -1
        })});

    const fileName = `irev_export_${_.snakeCase(new Date().toLocaleDateString("en-GB", options))}.xlsx`;
    console.log('export file name:', fileName);

    res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${fileName}`
    });

    const recs = await User.query().select('display_name', 'contributor_id');
    const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));

    try {
        for (const row of response.data.data) {
            const contribId = _.trim(row.contributorUsername);
            delete row['contributorUsername'];

            row.contributorDisplayname = mapping[contribId] || '(unmapped contributor)';
        }

        const fileStream = await writeXlsxFile(response.data.data, {schema: SCHEMA});
        await pipeline(fileStream, res);
    } catch (e) {
        console.error(e);
        res.status(500).end(`An internal server error occurred while exporting the data`);
    }
}

const SCHEMA = [
    {column: 'Created At', type: String, value: data => data.createdAt},
    {column: 'Updated At', type: String, value: data => data.updatedAt},
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
    {column: 'Document Updated At', type: String, value: data => data.documentUpdatedAt},
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
]