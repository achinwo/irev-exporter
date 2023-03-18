exports.up = function(knex) {
    return knex.schema
		.createTable('irev_pus', (table) => {
			table.increments('id')
				.primary()
				.notNullable()
			table.integer('created_by_id')
				.notNullable()
			table.integer('deleted_by_id');
			table.integer('updated_by_id')
				.notNullable()
			table.dateTime('created_at')
				.notNullable()
				.defaultTo(knex.fn.now());
			table.dateTime('deleted_at');
			table.dateTime('updated_at')
				.notNullable()
				.defaultTo(knex.fn.now());
			table.string('name')
				.notNullable()
			table.string('old_name')
				.notNullable()
			table.string('pu_id')
				.notNullable()
			table.string('pu_code')
				.notNullable()
			table.string('code')
				.notNullable()
			table.string('ward_id')
				.notNullable()
			table.string('ward_uid')
				.notNullable()
			table.string('ward_name')
				.notNullable()
			table.string('state_id')
				.notNullable()
			table.string('state_name')
				.notNullable()
			table.integer('lga_id')
				.notNullable()
			table.string('lga_name')
				.notNullable()
			table.boolean('is_accredited')
				.notNullable()
			table.text('document_url');
			table.string('document_type');
			table.integer('document_size');
			table.date('document_updated_at');
			table.text('old_document_url');
			table.string('old_document_type');
			table.integer('old_document_size');
			table.date('old_document_updated_at');
			table.integer('number_of_prev_documents')
				.notNullable()
		});
}
exports.down = function(knex) {
    return knex.schema
			.dropTableIfExists('irev_pus')
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
