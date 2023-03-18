exports.up = function(knex) {
    return knex.schema
		.createTable('irev_lgas', (table) => {
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
			table.integer('lga_id')
				.unique()
				.notNullable()
			table.string('state_name')
				.notNullable()
			table.integer('state_id')
				.notNullable()
			table.integer('ward_count')
				.notNullable()
			table.string('code')
				.notNullable()
			table.text('document_key')
				.notNullable()
		});
}
exports.down = function(knex) {
    return knex.schema
			.dropTableIfExists('irev_lgas')
}
exports.jsonSchema = {
    "type": "object",
    "title": "IrevLga",
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
        "lgaId": {
            "type": "integer"
        },
        "stateName": {
            "type": "string"
        },
        "stateId": {
            "type": "integer"
        },
        "wardCount": {
            "type": "integer"
        },
        "code": {
            "type": "string"
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
        "name",
        "lgaId",
        "stateName",
        "stateId",
        "wardCount",
        "code",
        "documentKey"
    ]
};
