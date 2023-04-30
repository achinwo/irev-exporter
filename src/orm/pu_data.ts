import {col, DbModel, SchemaType} from "../lib/model";
import _ from 'lodash';
import path from "path";
import {PartialModelObject} from "objection";
import {User} from "./user";
import {DataSource, ElectionType, ReviewStatus} from "../ref_data";
import {DataQualityIssue} from "../review_view";

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

    @col(SchemaType.text, {nullable: true}) documentCvrUrl: string;

    @col(SchemaType.text, {nullable: false}) documentUrl: string;
    @col(SchemaType.string, {nullable: false}) documentType: string;
    @col(SchemaType.integer, {nullable: false}) documentSize: number;
    @col(SchemaType.date, {nullable: false}) documentUpdatedAt: Date;
    @col(SchemaType.text, {nullable: true}) documentHash: string;
    @col(SchemaType.integer, {nullable: true}) numberOfPrevDocuments: number;

    @col(SchemaType.integer, {nullable: true}) votersAccredited: number;
    @col(SchemaType.integer, {nullable: true}) votersAccreditedBvas: number;
    @col(SchemaType.integer, {nullable: true}) votersRegisteredCvr: number;
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

    @col(SchemaType.string, {nullable: true, enum: [ReviewStatus.RETURNED, ReviewStatus.VALIDATED]})
    reviewStatus: string;

    contributorDisplayName: string;
    reviewedByDisplayName: string;

    static async fetchByPuCode(puCode) {
        let puData = (await PuData.query()
            .where('pu_code', puCode)
            .andWhere('election_type', ElectionType.PRESIDENTIAL)
            .andWhere('source', 'irev').first());

        if(!puData) return null;

        const recs = await User.query().select('display_name', 'contributor_id');
        const mapping = _.fromPairs(recs.map(r => [r.contributorId, r.displayName]));

        puData.contributorDisplayName = mapping[_.trim(puData.contributorUsername)] || '(unknown)';
        puData.reviewedByDisplayName = mapping[_.trim(puData.reviewedByContributorId)] || '(unknown reviewer)';

        return puData;
    }

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

    static async fetchStats(electionType=ElectionType.PRESIDENTIAL): Promise<{state: any[], ward: any[], validationReturned: {wardId: string, stateId: string}[]}> {

        const validationReturned = await PuData.query()
            .select('ward_id', 'state_id')
            .where('election_type', electionType ? electionType : ElectionType.PRESIDENTIAL)
            .andWhere('source', DataSource.IREV)
            .andWhere('review_status', ReviewStatus.RETURNED)
            .groupBy('ward_id', 'state_id');

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

        return {state: rows, ward: wardRes, validationReturned};
    }

    static async fetchOvervoting(opts: DqQueryOptions){
        return PuData.query()
            .select('pu_code', 'name', 'reviewed_at', 'review_status')
            .whereRaw('votes_cast > voters_accredited')
            .andWhereRaw(`(review_status is null)`)
            .andWhere(applyCommonFilters(opts, {limit: 100}));
    }

    static async fetchInconsistentVotes(opts:DqQueryOptions){
        return PuData.query()
            .select('id', 'pu_code', 'name', 'reviewed_at', 'review_status')
            .from(
                PuData.query()
                    .select('id', 'pu_code', 'name', 'reviewed_at', 'review_status', PuData.knex().raw('SUM(COALESCE(votes_lp, 0) + COALESCE(votes_apc, 0) + COALESCE(votes_pdp, 0) + COALESCE(votes_nnpp, 0))'))
                    .andWhereRaw(`review_status is null`)
                    .andWhere(applyCommonFilters(opts, {limit: 100}))
                    .groupBy('id', 'pu_code', 'name', 'votes_cast', 'reviewed_at', 'review_status')
                    .havingRaw('SUM(COALESCE(votes_lp, 0) + COALESCE(votes_apc, 0) + COALESCE(votes_pdp, 0) + COALESCE(votes_nnpp, 0)) > votes_cast')
                    .as('tbl')
            )
    }

    static async fetchUnenteredVotes(opts: DqQueryOptions){
        return PuData.query()
            .select('pu_code', 'name', 'reviewed_at', 'review_status')
            .whereRaw('(votes_cast is null OR voters_accredited is null)')
            .andWhere('is_result_illegible', false)
            .andWhereRaw(`(review_status is null)`)
            .andWhere(applyCommonFilters(opts, {limit: 100}));
    }

    static async fetchFalseIllegibles(opts: DqQueryOptions){
        return PuData.query()
            .select('pu_code', 'name', 'reviewed_at', 'review_status')
            .where('is_result_illegible', true)
            .andWhere('voters_accredited_bvas', '>', 100)
            .andWhere(applyCommonFilters(opts, {limit: 100}));
    }

    static async fetchDataQualityStats(opts?: DqQueryOptions){

        const overvotingRes = await PuData.query()
            .count('*', {as: 'overvotingCount'})
            .whereRaw('votes_cast > voters_accredited')
            .andWhereRaw(`(review_status is null OR review_status != '${ReviewStatus.VALIDATED}')`)
            .andWhere(applyCommonFilters(opts))
            .first();

        const unRes = await PuData.query()
            .count('*', {as: 'unenteredCount'})
            .whereRaw('(votes_cast is null OR voters_accredited is null)')
            .andWhere('is_result_illegible', false)
            .andWhereRaw(`(review_status is null OR review_status != '${ReviewStatus.VALIDATED}')`)
            .andWhere(applyCommonFilters(opts))
            .first();

        const gtRes = await PuData.query()
                .count('*', {as: 'gtCount'})
                .from(
                    PuData.query()
                        .select('pu_code', 'id', PuData.knex().raw('SUM(COALESCE(votes_lp, 0) + COALESCE(votes_apc, 0) + COALESCE(votes_pdp, 0) + COALESCE(votes_nnpp, 0))'))
                        .where(applyCommonFilters(opts))
                        .andWhereRaw(`(review_status is null OR review_status != '${ReviewStatus.VALIDATED}')`)
                        .groupBy('id', 'pu_code', 'votes_cast')
                        .havingRaw('SUM(COALESCE(votes_lp, 0) + COALESCE(votes_apc, 0) + COALESCE(votes_pdp, 0) + COALESCE(votes_nnpp, 0)) > votes_cast')
                        .as('tbl')
                ).first();

        const illegRes = await PuData.query()
            .count('*', {as: 'illegCount'})
            .where('is_result_illegible', true)
            .andWhere('voters_accredited_bvas', '>', 100)
            .andWhereRaw(`(review_status is null OR review_status != '${ReviewStatus.VALIDATED}')`)
            .andWhere(applyCommonFilters(opts))
            .first();

        //console.log('VALUE:', gtRes);
        return {
            [DataQualityIssue.OVER_VOTING]: _.toInteger((overvotingRes as unknown as {overvotingCount: number}).overvotingCount),
            [DataQualityIssue.UNENTERED_VOTES]: _.toInteger((unRes as unknown as {unenteredCount: number}).unenteredCount),
            [DataQualityIssue.VOTES_GT_TTL_VOTES]: _.toInteger((gtRes as unknown as {gtCount: number}).gtCount),
            [DataQualityIssue.FALSE_ILLEGIBLE]: _.toInteger((illegRes as unknown as {illegCount: number}).illegCount),
        }
    }

}

type DqQueryOptions = {contributorId?: string, createdAfter?: Date, limit?: number};

const applyCommonFilters = (opts: DqQueryOptions, defaultOpts?: DqQueryOptions) => {
    return function() {
        this.andWhere('election_type', ElectionType.PRESIDENTIAL);
        this.andWhere('source', 'irev');
        if (opts?.contributorId ?? defaultOpts?.contributorId) this.andWhere('contributor_username', opts.contributorId ?? defaultOpts?.contributorId);
        if (opts?.createdAfter ?? defaultOpts?.createdAfter) this.andWhere('created_at', '>', opts.createdAfter ?? defaultOpts?.createdAfter);
        if (opts?.limit ?? defaultOpts?.limit) this.limit(opts.limit ?? defaultOpts?.limit);
    }
}