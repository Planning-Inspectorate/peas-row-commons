export const RELATION_MAP: Record<string, string[]> = {
	Dates: [
		'startDate',
		'objectionPeriodEndsDate',
		'expectedSubmissionDate',
		'expiryDate',
		'partiesDecisionNotificationDeadlineDate',
		'targetDecisionDate',
		'proposedModificationsDate'
	],
	Costs: ['rechargeable', 'finalCost', 'feeReceived', 'invoiceSent'],
	Outcome: ['partiesNotifiedDate', 'orderDecisionDispatchDate', 'sealedOrderReturnedDate', 'decisionPublishedDate']
};

const FIELD_TO_RELATION_LOOKUP: Record<string, string> = {};

Object.entries(RELATION_MAP).forEach(([relationName, fields]) => {
	fields.forEach((field) => {
		FIELD_TO_RELATION_LOOKUP[field] = relationName;
	});
});

/**
 * Returns the relation name for a given field, or null if it belongs to the main table.
 */
export function getRelationForField(fieldName: string): string | null {
	return FIELD_TO_RELATION_LOOKUP[fieldName] || null;
}
