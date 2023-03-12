exports.up = function(knex) {
    return knex.schema
		.createTable('users', (table) => {
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
			table.string('display_name')
				.notNullable()
			table.string('contributor_id')
				.unique()
				.notNullable()
			table.string('password_hash');
			table.string('email');
			table.dateTime('activated_at');
			table.dateTime('first_contributed_at');
			table.text('image_small');
			table.text('image_medium');
			table.text('image_large');
		});
}
exports.down = function(knex) {
    return knex.schema
			.dropTableIfExists('users')
}
exports.jsonSchema = {
    "type": "object",
    "title": "User",
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
        "displayName": {
            "type": "string"
        },
        "contributorId": {
            "type": "string"
        },
        "passwordHash": {
            "type": "string"
        },
        "email": {
            "type": "string"
        },
        "activatedAt": {
            "type": "string",
            "format": "date-time"
        },
        "firstContributedAt": {
            "type": "string",
            "format": "date-time"
        },
        "imageSmall": {
            "type": "string"
        },
        "imageMedium": {
            "type": "string"
        },
        "imageLarge": {
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
        "displayName",
        "contributorId"
    ]
};
