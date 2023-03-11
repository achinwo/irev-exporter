exports.up = function(knex) {
    return knex.schema
		.createTable('pu_data', (table) => {
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
			table.string('pu_id')
				.notNullable()
			table.string('pu_code')
				.notNullable()
			table.string('ward_id')
				.notNullable()
			table.string('ward_name')
				.notNullable()
			table.string('state_id')
				.notNullable()
			table.string('state_name');
			table.integer('lga_id');
			table.string('lga_name');
			table.text('document_url')
				.notNullable()
			table.string('document_type')
				.notNullable()
			table.integer('document_size')
				.notNullable()
			table.date('document_updated_at')
				.notNullable()
			table.text('document_hash');
			table.integer('number_of_prev_documents');
			table.integer('voters_accredited');
			table.integer('votes_cast');
			table.integer('votes_lp');
			table.integer('votes_apc');
			table.integer('votes_pdp');
			table.integer('votes_nnpp');
			table.boolean('is_result_legible');
			table.boolean('is_pu_name_correct');
			table.boolean('is_result_illegible');
			table.boolean('contains_incorrect_pu_name');
			table.boolean('contains_alterations');
			table.boolean('is_inec_stamp_absent');
			table.boolean('is_none_eceight_form');
			table.text('contributor_username');
		});
}
exports.down = function(knex) {
    return knex.schema
			.dropTableIfExists('pu_data')
}
exports.jsonSchema = {
    "type": "object",
    "title": "PuData",
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
        "puId": {
            "type": "string"
        },
        "puCode": {
            "type": "string"
        },
        "wardId": {
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
        "documentHash": {
            "type": "string"
        },
        "numberOfPrevDocuments": {
            "type": "integer"
        },
        "votersAccredited": {
            "type": "integer"
        },
        "votesCast": {
            "type": "integer"
        },
        "votesLp": {
            "type": "integer"
        },
        "votesApc": {
            "type": "integer"
        },
        "votesPdp": {
            "type": "integer"
        },
        "votesNnpp": {
            "type": "integer"
        },
        "isResultLegible": {
            "type": "boolean"
        },
        "isPuNameCorrect": {
            "type": "boolean"
        },
        "isResultIllegible": {
            "type": "boolean"
        },
        "containsIncorrectPuName": {
            "type": "boolean"
        },
        "containsAlterations": {
            "type": "boolean"
        },
        "isInecStampAbsent": {
            "type": "boolean"
        },
        "isNoneEceightForm": {
            "type": "boolean"
        },
        "contributorUsername": {
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
        "puId",
        "puCode",
        "wardId",
        "wardName",
        "stateId",
        "documentUrl",
        "documentType",
        "documentSize",
        "documentUpdatedAt"
    ]
};
