exports.up = function(knex) {
    return knex.schema
		.alterTable('users', (table) => {
			table.integer('role');
		});
}
exports.down = function(knex) {
    return knex.schema
		.alterTable('users', (table) => {
			table.dropColumn('role');
		});
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
        "role": {
            "type": "integer"
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
