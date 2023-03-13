import {col, DbModel, SchemaType} from "../lib/model";
import _ from 'lodash';
import path from "path";
import {PartialModelObject} from "objection";

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
    @col(SchemaType.integer, {nullable: true}) votesCast: number;

    @col(SchemaType.integer, {nullable: true}) votesLp: number;
    @col(SchemaType.integer, {nullable: true}) votesApc: number;
    @col(SchemaType.integer, {nullable: true}) votesPdp: number;
    @col(SchemaType.integer, {nullable: true}) votesNnpp: number;

    @col(SchemaType.boolean, {nullable: true}) isResultLegible: boolean; // deprecated
    @col(SchemaType.boolean, {nullable: true}) isPuNameCorrect: boolean; // deprecated

    @col(SchemaType.boolean, {nullable: true}) isResultIllegible: boolean;

    @col(SchemaType.boolean, {nullable: true}) containsIncorrectPuName: boolean;
    @col(SchemaType.boolean, {nullable: true}) containsAlterations: boolean;
    @col(SchemaType.boolean, {nullable: true}) isInecStampAbsent: boolean;
    @col(SchemaType.boolean, {nullable: true}) isNoneEceightForm: boolean;

    @col(SchemaType.text, {nullable: true}) contributorUsername: string;

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

            contributorUsername: contributor,

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

            createdById: 7,
            updatedById: 7
        }

        return PuData.query().insertAndFetch(values);
    }

    static async fetchStats(): Promise<{state: any[], ward: any[]}> {
        const res = await PuData.query()
            .select('state_name', 'state_id')
            .count('state_name')
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
            .groupBy('state_name', 'ward_name', 'ward_id');

        return {state: rows, ward: wardRes};
    }

}