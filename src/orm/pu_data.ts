import {col, DbModel, SchemaType} from "../lib/model";

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

}