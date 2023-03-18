import {col, DbModel, SchemaType} from "../lib/model";
import {PartialModelObject} from "objection";

export class IrevLga extends DbModel {
    static tableName = 'irev_lgas';

    @col(SchemaType.string, {jsonPath: 'lga.name', nullable: false}) name: string;
    @col(SchemaType.integer, {jsonPath: 'lga.lga_id', nullable: false, unique: true}) lgaId: number;

    @col(SchemaType.string, {jsonPath: 'state.name', nullable: false}) stateName: string;
    @col(SchemaType.integer, {jsonPath: 'state.state_id', nullable: false}) stateId: number;

    @col(SchemaType.integer, {nullable: false}) wardCount: number;

    @col(SchemaType.string, {jsonPath: 'lga.code', nullable: false}) code: string;
    @col(SchemaType.text, {nullable: false}) documentKey: string;

    static extractFromJsonData(data: any): PartialModelObject<IrevLga> {
        let res = IrevLga.extractFromData(data, IrevLga.columns());
        res.wardCount = data.wards.length;
        return res;
    }
}