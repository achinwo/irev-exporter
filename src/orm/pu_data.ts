import {col, DbModel, SchemaType} from "../lib/model";
import _ from 'lodash';
import path from "path";
import {PartialModelObject} from "objection";
import {User} from "./user";
import {DataSource, ElectionType } from "../ref_data";

export class PuData extends DbModel {
    static tableName = 'pu_data';

    @col(SchemaType.string, {nullable: false}) name: string;

    @col(SchemaType.string, {nullable: false}) puId: string;
    @col(SchemaType.string, {nullable: false}) puCode: string;

    @col(SchemaType.string, {nullable: false}) wardId: string;
    @col(SchemaType.string, {nullable: false}) wardName: string;

    @col(SchemaType.string, {nullable: false}) stateId: string;
    @col(SchemaType.string, {nullable: true}) stateName: string;

    @col(SchemaType.integer, {nullable: true}) lgaId: number;
    @col(SchemaType.string, {nullable: true}) lgaName: string;

    @col(SchemaType.text, {nullable: false}) documentUrl: string;
    @col(SchemaType.string, {nullable: false}) documentType: string;
    @col(SchemaType.integer, {nullable: false}) documentSize: number;
    @col(SchemaType.date, {nullable: false}) documentUpdatedAt: Date;
    @col(SchemaType.text, {nullable: true}) documentHash: string;
    @col(SchemaType.integer, {nullable: true}) numberOfPrevDocuments: number;

    @col(SchemaType.integer, {nullable: true}) votersAccredited: number;
    @col(SchemaType.integer, {nullable: true}) votersAccreditedBvas: number;
    @col(SchemaType.integer, {nullable: true}) votersRegistered: number;
    @col(SchemaType.integer, {nullable: true}) votesCast: number;

    @col(SchemaType.integer, {nullable: true}) votesLp: number;
    @col(SchemaType.integer, {nullable: true}) votesApc: number;
    @col(SchemaType.integer, {nullable: true}) votesPdp: number;
    @col(SchemaType.integer, {nullable: true}) votesNnpp: number;

    @col(SchemaType.integer, {nullable: true}) votesSdp: number;
    @col(SchemaType.integer, {nullable: true}) votesAdc: number;
    @col(SchemaType.integer, {nullable: true}) votesApga: number;

    @col(SchemaType.integer, {nullable: true}) votesVoided: number;

    @col(SchemaType.boolean, {nullable: true}) isResultLegible: boolean; // deprecated
    @col(SchemaType.boolean, {nullable: true}) isPuNameCorrect: boolean; // deprecated

    @col(SchemaType.boolean, {nullable: true}) isResultIllegible: boolean;

    @col(SchemaType.boolean, {nullable: true}) containsIncorrectPuName: boolean;
    @col(SchemaType.boolean, {nullable: true}) containsAlterations: boolean;
    @col(SchemaType.boolean, {nullable: true}) isInecStampAbsent: boolean;
    @col(SchemaType.boolean, {nullable: true}) isNoneEceightForm: boolean;

    @col(SchemaType.text, {nullable: true}) contributorUsername: string;

    @col(SchemaType.text, {nullable: true}) comment: string;
    @col(SchemaType.string, {nullable: true}) agentPhoneNumber: string;
    @col(SchemaType.string, {nullable: true}) source: string;

    @col(SchemaType.string, {nullable: true}) electionType: string;

    @col(SchemaType.string, {nullable: true}) reviewedByContributorId: string;
    @col(SchemaType.datetime, {nullable: true}) reviewedAt: Date;
    @col(SchemaType.string, {nullable: true, enum: ['RETURNED', 'VALIDATED']}) reviewedStatus: string;

    static async createOrUpdate({pu, puData, contributor}: {pu: any, puData: any, contributor: string}): Promise<PuData>{
        if(puData.id){
            return PuData.query().updateAndFetchById(puData.id, puData);
        }

        const toInt = (value) => {
            const v = parseInt(value);
            return isNaN(v) ? null : v;
        }

        const toBool = (value) => {
            return ['on', true, 1].includes(value);
        }

        const values: PartialModelObject<PuData> = {
            name: pu.polling_unit.name,

            puId: pu.polling_unit._id,
            puCode: pu.polling_unit.pu_code,
            wardId: pu.ward._id,
            wardName: pu.ward.name,

            stateId: pu.ward.state_id,
            stateName: pu.ward.state_name || null,

            lgaId: pu.polling_unit.lga.lga_id,
            lgaName: pu.polling_unit.lga.name,

            isResultIllegible: toBool(puData.isResultIllegible),
            containsAlterations: toBool(puData.containsAlterations),
            containsIncorrectPuName: toBool(puData.containsIncorrectPuName),

            isInecStampAbsent: toBool(puData.isInecStampAbsent),
            isNoneEceightForm: toBool(puData.isNoneEceightForm),

            contributorUsername: _.trim(contributor),

            documentUrl: pu.document.url,
            documentSize: pu.document.size,
            documentType: path.extname(pu.document.url).slice(1),
            documentUpdatedAt: new Date(pu.document.updated_at),
            numberOfPrevDocuments: (pu.old_documents || []).length,
            documentHash: null,

            votesLp: toInt(puData.votesLp),
            votesApc: toInt(puData.votesApc),
            votesPdp: toInt(puData.votesPdp),
            votesNnpp: toInt(puData.votesNnpp),

            votersAccredited: toInt(puData.votersAccredited),
            votesCast: toInt(puData.votesCast),

            isResultLegible: toBool(puData.isResultLegible),
            isPuNameCorrect: toBool(puData.isPuNameCorrect),

            electionType: puData.electionType ? puData.electionType : ElectionType.PRESIDENTIAL,
            source: puData.source ? puData.source : DataSource.IREV,

            createdById: 1,
            updatedById: 1
        }

        return PuData.query().insertAndFetch(values);
    }

    static async fetchStats(electionType=ElectionType.PRESIDENTIAL): Promise<{state: any[], ward: any[]}> {


        const res = await PuData.query()
            .select('state_name', 'state_id')
            .count('state_name')
            .where('election_type', electionType ? electionType : ElectionType.PRESIDENTIAL)
            .andWhere('source', DataSource.IREV)
            .groupBy('state_name', 'state_id');

        let rows = [];

        for (const stateRow of (res as any[])) {
            const row = {
                id: _.toInteger(stateRow.stateId),
                progress: null,
                submittedCount: stateRow.count,
                resultCount: null,
                wardCount: null,
                lgaCount: null,
                puCount: null,
                name: stateRow.stateName,
            }
            rows.push(row);
        }

        const wardRes = await PuData.query()
            .select('state_name', 'ward_name', 'ward_id')
            .count('ward_name', {as: 'wardCount'})
            .max('contributor_username as lastContributorUsername')
            .where('election_type', electionType ? electionType : ElectionType.PRESIDENTIAL)
            .andWhere('source', DataSource.IREV)
            .groupBy('state_name', 'ward_name', 'ward_id') as unknown as {stateName: string, wardName: string, wardCount: string, lastContributorUsername: string}[];

        const recs = await User.query().select('display_name', 'contributor_id');
        const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));

        //console.log('[fetchStats] electionType:', electionType, wardRes);

        for (const ward of wardRes) {
            const contributor = mapping[_.trim(ward.lastContributorUsername)];
            if(!contributor) console.error(`Unable to map contributor username "${ward.lastContributorUsername}"`);
            ward.lastContributorUsername = contributor || '(unknown)';
        }

        return {state: rows, ward: wardRes};
    }

}