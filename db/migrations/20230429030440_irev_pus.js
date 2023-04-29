exports.up = function(knex) {
    return knex.schema
		.alterTable('irev_pus', (table) => {
			table.integer('voters_accredited');
			table.integer('voters_registered');
			table.text('document_cvr_url');
		});
}
exports.down = function(knex) {
    return knex.schema
		.alterTable('irev_pus', (table) => {
			table.dropColumn('voters_accredited');
			table.dropColumn('voters_registered');
			table.dropColumn('document_cvr_url');
		});
}
exports.jsonSchema = {
    "type": "object",
    "title": "IrevPu",
    "properties": {
        "id": {
            "type": "integer"
        },
        "createdById": {
            "type": "integer"
        },
        "deletedById": {
            "type": "integer"
        },
        "updatedById": {
            "type": "integer"
        },
        "createdAt": {
            "type": "string",
            "format": "date-time"
        },
        "deletedAt": {
            "type": "string",
            "format": "date-time"
        },
        "updatedAt": {
            "type": "string",
            "format": "date-time"
        },
        "name": {
            "type": "string"
        },
        "oldName": {
            "type": "string"
        },
        "puId": {
            "type": "string"
        },
        "puCode": {
            "type": "string"
        },
        "code": {
            "type": "string"
        },
        "wardId": {
            "type": "string"
        },
        "wardUid": {
            "type": "string"
        },
        "wardName": {
            "type": "string"
        },
        "stateId": {
            "type": "string"
        },
        "stateName": {
            "type": "string"
        },
        "lgaId": {
            "type": "integer"
        },
        "lgaName": {
            "type": "string"
        },
        "isAccredited": {
            "type": "boolean"
        },
        "documentUrl": {
            "type": "string"
        },
        "documentType": {
            "type": "string"
        },
        "documentSize": {
            "type": "integer"
        },
        "documentUpdatedAt": {
            "type": "string",
            "format": "date"
        },
        "oldDocumentUrl": {
            "type": "string"
        },
        "oldDocumentType": {
            "type": "string"
        },
        "oldDocumentSize": {
            "type": "integer"
        },
        "oldDocumentUpdatedAt": {
            "type": "string",
            "format": "date"
        },
        "numberOfPrevDocuments": {
            "type": "integer"
        },
        "votersAccredited": {
            "type": "integer"
        },
        "votersRegistered": {
            "type": "integer"
        },
        "documentCvrUrl": {
            "type": "string"
        }
    },
    "required": [
        "createdById",
        "updatedById",
        "id",
        "createdById",
        "updatedById",
        "createdAt",
        "updatedAt",
        "name",
        "oldName",
        "puId",
        "puCode",
        "code",
        "wardId",
        "wardUid",
        "wardName",
        "stateId",
        "stateName",
        "lgaId",
        "lgaName",
        "isAccredited",
        "numberOfPrevDocuments"
    ]
};
