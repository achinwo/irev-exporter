import {col, DbModel, SchemaType} from "../lib/model";
import _ from 'lodash';
import path from "path";
import {PartialModelObject} from "objection";
import moment from "moment";

export class IrevPu extends DbModel {

    static tableName = 'irev_pus';

    @col(SchemaType.string, {jsonPath: 'polling_unit.name', nullable: false}) name: string;
    @col(SchemaType.string, {jsonPath: 'polling_unit.old_name', nullable: false}) oldName: string;

    @col(SchemaType.string, {jsonPath: 'polling_unit.polling_unit_id', nullable: false}) puId: string;
    @col(SchemaType.string, {jsonPath: 'polling_unit.pu_code', nullable: false}) puCode: string;

    @col(SchemaType.string, {jsonPath: 'polling_unit.code', nullable: false}) code: string;

    @col(SchemaType.string, {jsonPath: 'polling_unit.ward.ward_id', nullable: false}) wardId: string;
    @col(SchemaType.string, {jsonPath: 'polling_unit.ward._id', nullable: false}) wardUid: string;
    @col(SchemaType.string, {jsonPath: 'polling_unit.ward.name', nullable: false}) wardName: string;

    @col(SchemaType.string, {jsonPath: 'polling_unit.state_id', nullable: false}) stateId: string;
    @col(SchemaType.string, {nullable: false}) stateName: string;

    @col(SchemaType.integer, {jsonPath: 'polling_unit.lga.lga_id', nullable: false}) lgaId: number;
    @col(SchemaType.string, {jsonPath: 'polling_unit.lga.name', nullable: false}) lgaName: string;

    @col(SchemaType.boolean, {jsonPath: 'polling_unit.is_accredited', nullable: false}) isAccredited: boolean;

    @col(SchemaType.text, {jsonPath: 'document.url', nullable: true}) documentUrl: string;
    @col(SchemaType.string, {nullable: true}) documentType: string;
    @col(SchemaType.integer, {jsonPath: 'document.size', nullable: true}) documentSize: number;
    @col(SchemaType.date, {jsonPath: 'document.updated_at', nullable: true}) documentUpdatedAt: Date;

    @col(SchemaType.text, {nullable: true}) oldDocumentUrl: string;
    @col(SchemaType.string, {nullable: true}) oldDocumentType: string;
    @col(SchemaType.integer, {nullable: true}) oldDocumentSize: number;
    @col(SchemaType.date, {nullable: true}) oldDocumentUpdatedAt: Date;

    @col(SchemaType.integer, {nullable: false}) numberOfPrevDocuments: number;

    static extractFromJsonData(data: any): PartialModelObject<IrevPu> {
        let res = IrevPu.extractFromData(data, IrevPu.columns());
        res.documentType = res?.documentUrl ? path.extname(res.documentUrl).slice(1) : null;

        const docs = data.old_documents;
        const oldDoc = _.find(docs || [], (d) => res.documentUrl !== d.url) || data.old_document;

        res.numberOfPrevDocuments = docs?.length || 0;

        res.oldDocumentUrl = oldDoc?.url;
        res.oldDocumentType = oldDoc?.url ? path.extname(oldDoc.url).slice(1) : null;
        res.oldDocumentSize = oldDoc?.size;
        res.oldDocumentUpdatedAt = oldDoc?.updated_at ? moment.utc(oldDoc.updated_at).toDate() : null;

        return res;
    }

}