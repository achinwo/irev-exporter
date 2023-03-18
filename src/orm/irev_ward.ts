import {col, DbModel, SchemaType} from "../lib/model";
import _ from 'lodash';
import path from "path";
import {PartialModelObject} from "objection";

export class IrevWard extends DbModel {
    static tableName = 'irev_wards';

    @col(SchemaType.string, {jsonPath: 'lgas[0].name', nullable: false}) lgaName: string;
    @col(SchemaType.integer, {jsonPath: 'lgas[0].lga_id', nullable: false}) lgaId: number;

    @col(SchemaType.string, {jsonPath: 'wards[0].name', nullable: false}) name: string;
    @col(SchemaType.string, {jsonPath: 'wards[0].old_name', nullable: false}) oldName: string;
    @col(SchemaType.integer, {jsonPath: 'wards[0].ward_id', nullable: false, unique: true}) wardId: number;
    @col(SchemaType.string, {jsonPath: 'wards[0]._id', nullable: false, unique: true}) wardUid: string;

    @col(SchemaType.string, {nullable: false}) stateName: string;
    @col(SchemaType.integer, {jsonPath: 'wards[0].state_id', nullable: false}) stateId: number;

    @col(SchemaType.string, {jsonPath: 'wards[0].code', nullable: false}) code: string;

    @col(SchemaType.integer, {nullable: false}) puCount: number;
    @col(SchemaType.text, {nullable: false}) documentKey: string;

    static extractFromJsonData(data: any): PartialModelObject<IrevWard> {
        let res = IrevWard.extractFromData(data, IrevWard.columns());
        res.puCount = data.data.length;
        return res;
    }

}