exports.up = function(knex) {
    return knex.schema
		.alterTable('pu_data', (table) => {
			table.text('document_cvr_url');
			table.integer('voters_registered_cvr');
		});
}
exports.down = function(knex) {
    return knex.schema
		.alterTable('pu_data', (table) => {
			table.dropColumn('document_cvr_url');
			table.dropColumn('voters_registered_cvr');
		});
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
        "documentCvrUrl": {
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
        "votersAccreditedBvas": {
            "type": "integer"
        },
        "votersRegisteredCvr": {
            "type": "integer"
        },
        "votersRegistered": {
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
        "votesSdp": {
            "type": "integer"
        },
        "votesAdc": {
            "type": "integer"
        },
        "votesApga": {
            "type": "integer"
        },
        "votesVoided": {
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
        },
        "comment": {
            "type": "string"
        },
        "agentPhoneNumber": {
            "type": "string"
        },
        "source": {
            "type": "string"
        },
        "electionType": {
            "type": "string"
        },
        "reviewedByContributorId": {
            "type": "string"
        },
        "reviewedAt": {
            "type": "string",
            "format": "date-time"
        },
        "reviewStatus": {
            "type": "string",
            "enum": [
                "RETURNED",
                "VALIDATED"
            ]
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
