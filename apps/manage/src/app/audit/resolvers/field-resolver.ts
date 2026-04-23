import { ACT_SECTIONS } from '@pins/peas-row-commons-database/src/seed/static_data/act-sections.ts';
import {
	CASE_STATUSES,
	PRIORITIES,
	ADVERTISED_MODIFICATIONS,
	INSPECTOR_BANDS
} from '@pins/peas-row-commons-database/src/seed/static_data/index.ts';
import { loadEnvironmentConfig, ENVIRONMENT_NAME } from '../../config.ts';
import { AUTHORITIES as AUTHORITIES_PROD } from '@pins/peas-row-commons-database/src/seed/data-authorities-prod.ts';
import { AUTHORITIES as AUTHORITIES_DEV } from '@pins/peas-row-commons-database/src/seed/data-authorities-dev.ts';
import {
	formatAddress,
	formatDate,
	formatMonetaryValue,
	formatValue
} from '@pins/peas-row-commons-lib/util/audit-formatters.ts';

interface ResolverContext {
	userDisplayNameMap?: Map<string, string>;
}

/**
 * A field resolver takes the previous case row and the new form answer
 * and returns human-readable old/new values for the audit trail.
 */
interface FieldResolver {
	resolve(
		previousCase: Record<string, unknown>,
		newAnswer: unknown,
		context?: ResolverContext
	): { oldValue: string; newValue: string };
}

/**
 * Default resolver for simple scalar fields where the form field name
 * matches the DB column name (e.g. externalReference, name, location).
 */
function defaultResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: formatValue(previousCase[fieldName]),
				newValue: formatValue(newAnswer)
			};
		}
	};
}

/**
 * Creates a resolver for fields that store a reference data ID and need
 * to be resolved to a display name from a static array.
 *
 * Handles the common pattern where the form field name matches the DB
 * column name, and the value is an ID in a lookup table.
 */
function staticLookupResolver(fieldName: string, lookupTable: { id: string; displayName: string }[]): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			const oldEntry = lookupTable.find((entry) => entry.id === previousCase[fieldName]);
			const newEntry = lookupTable.find((entry) => entry.id === newAnswer);

			return {
				oldValue: oldEntry?.displayName ?? '-',
				newValue: newEntry?.displayName ?? '-'
			};
		}
	};
}

/**
 * Returns the authority lookup table based on the current environment.
 */
function getAuthorities() {
	try {
		const env = loadEnvironmentConfig();
		return env === ENVIRONMENT_NAME.PROD ? AUTHORITIES_PROD : AUTHORITIES_DEV;
	} catch {
		return AUTHORITIES_DEV;
	}
}

/**
 * Registry of field-specific resolvers.
 *
 * Add an entry here whenever a field needs special handling — e.g. the
 * form value is a composite ID, the DB column has a different name, or
 * the value needs to be looked up from a reference table.
 *
 * Fields not in this map fall through to the default resolver, which
 * simply stringifies the raw values.
 */
const FIELD_RESOLVERS: Record<string, FieldResolver> = {
	/**
	 * Act is a composite field — the form submits a single ID that maps to
	 * both an actId and sectionId via the ACT_SECTIONS lookup table.
	 */
	act: {
		resolve(previousCase, newAnswer) {
			const newActSection = ACT_SECTIONS.find((a) => a.id === newAnswer);
			const oldActSection = ACT_SECTIONS.find(
				(a) => a.actId === previousCase.actId && a.sectionId === (previousCase.sectionId ?? undefined)
			);

			return {
				oldValue: oldActSection?.displayName ?? '-',
				newValue: newActSection?.displayName ?? '-'
			};
		}
	},

	/**
	 * Status ID → display name from CASE_STATUSES.
	 */
	statusId: staticLookupResolver('statusId', CASE_STATUSES),

	/**
	 * Priority ID → display name from PRIORITIES.
	 */
	priorityId: staticLookupResolver('priorityId', PRIORITIES),

	/**
	 * Advertised modification ID → display name from ADVERTISED_MODIFICATIONS.
	 */
	advertisedModificationId: staticLookupResolver('advertisedModificationId', ADVERTISED_MODIFICATIONS),

	/**
	 * Inspector band ID → display name from INSPECTOR_BANDS.
	 */
	inspectorBandId: staticLookupResolver('inspectorBandId', INSPECTOR_BANDS),

	/**
	 * Authority — the form field is `authorityName` but the DB column is `authorityId`.
	 * Resolves to the authority's name from the environment-specific authority list.
	 */
	authorityId: {
		resolve(previousCase, newAnswer) {
			const authorities = getAuthorities();
			const oldAuthority = authorities.find((a) => a.id === previousCase.authorityId);
			const newAuthority = authorities.find((a) => a.id === newAnswer);

			return {
				oldValue: oldAuthority?.name ?? '-',
				newValue: newAuthority?.name ?? '-'
			};
		}
	},

	/**
	 * Site address — the form submits an address object, the DB stores it
	 * as a relation. Formats both as a comma-separated address string.
	 */
	siteAddress: {
		resolve(previousCase, newAnswer) {
			const oldAddress = previousCase.SiteAddress as Record<string, unknown> | null;
			const newAddress = newAnswer as Record<string, unknown> | null;

			return {
				oldValue: formatAddress(oldAddress),
				newValue: formatAddress(newAddress)
			};
		}
	},

	/**
	 * Abeyance period — the form submits a composite object { start, end }
	 * and the DB stores it as a relation with { abeyanceStartDate, abeyanceEndDate }.
	 * Formats both as "10 January 2026 to 10 February 2026" for the audit trail.
	 */
	abeyancePeriod: {
		resolve(previousCase, newAnswer) {
			const oldPeriod = previousCase.Abeyance as {
				abeyanceStartDate: Date | null;
				abeyanceEndDate: Date | null;
			} | null;
			const newPeriod = newAnswer as { start: string | null; end: string | null } | null;

			const oldDisplay = oldPeriod
				? `${formatDate(oldPeriod.abeyanceStartDate)} - ${formatDate(oldPeriod.abeyanceEndDate)}`
				: '-';

			const newDisplay = newPeriod ? `${formatDate(newPeriod.start)} - ${formatDate(newPeriod.end)}` : '-';

			return { oldValue: oldDisplay, newValue: newDisplay };
		}
	},

	// Case officer, gets parsed in entra user map
	caseOfficerId: {
		resolve(previousCase, newAnswer, context) {
			const nameMap = context?.userDisplayNameMap;
			const caseOfficer = previousCase.CaseOfficer as { idpUserId: string } | null;
			const oldId = caseOfficer?.idpUserId ?? null;
			const newId = newAnswer as string | null;

			return {
				oldValue: (oldId && nameMap?.get(oldId)) ?? '-',
				newValue: (newId && nameMap?.get(newId)) ?? '-'
			};
		}
	},

	/**
	 * Final cost is a monetary value so needs to be formatted with
	 * a pound sign (£)
	 */
	finalCost: {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: formatMonetaryValue(previousCase.finalCost),
				newValue: formatMonetaryValue(newAnswer)
			};
		}
	}
};

/**
 * Resolves human-readable old and new values for a given field.
 *
 * Looks up a field-specific resolver first; falls back to the default
 * scalar resolver if none is registered.
 */
export function resolveFieldValues(
	fieldName: string,
	previousCase: Record<string, unknown>,
	newAnswer: unknown,
	context?: ResolverContext
): { oldValue: string; newValue: string } {
	const resolver = FIELD_RESOLVERS[fieldName] ?? defaultResolver(fieldName);
	return resolver.resolve(previousCase, newAnswer, context);
}
