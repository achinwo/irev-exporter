exports.up = function(knex) {
    return knex.schema
		.createTable('irev_wards', (table) => {
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
			table.string('lga_name')
				.notNullable()
			table.integer('lga_id')
				.notNullable()
			table.string('name')
				.notNullable()
			table.string('old_name')
				.notNullable()
			table.integer('ward_id')
				.unique()
				.notNullable()
			table.string('ward_uid')
				.unique()
				.notNullable()
			table.string('state_name')
				.notNullable()
			table.integer('state_id')
				.notNullable()
			table.string('code')
				.notNullable()
			table.integer('pu_count')
				.notNullable()
			table.text('document_key')
				.notNullable()
		});
}
exports.down = function(knex) {
    return knex.schema
			.dropTableIfExists('irev_wards')
}
exports.jsonSchema = {
    "type": "object",
    "title": "IrevWard",
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
        "lgaName": {
            "type": "string"
        },
        "lgaId": {
            "type": "integer"
        },
        "name": {
            "type": "string"
        },
        "oldName": {
            "type": "string"
        },
        "wardId": {
            "type": "integer"
        },
        "wardUid": {
            "type": "string"
        },
        "stateName": {
            "type": "string"
        },
        "stateId": {
            "type": "integer"
        },
        "code": {
            "type": "string"
        },
        "puCount": {
            "type": "integer"
        },
        "documentKey": {
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
        "lgaName",
        "lgaId",
        "name",
        "oldName",
        "wardId",
        "wardUid",
        "stateName",
        "stateId",
        "code",
        "puCount",
        "documentKey"
    ]
};
