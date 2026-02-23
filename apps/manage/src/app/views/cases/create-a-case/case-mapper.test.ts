import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapAnswersToCaseInput, resolveCaseTypeIds } from './case-mapper.ts';
import { CASE_STATUS_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/status.ts';
import { CONTACT_TYPE_ID } from '@pins/peas-row-commons-database/src/seed/static_data/ids/contact-type.ts';

const getBaseAnswers = (): Record<string, unknown> => ({
	name: 'Test Case',
	receivedDate: new Date('2026-01-01'),
	externalReference: 'EXT-123',
	caseOfficerId: 'officer-xyz',
	location: 'London',
	caseworkArea: 'rights-of-way',
	rightsOfWay: 'public-path',
	publicPath: 'direction',
	applicantDetails: []
});

describe('Case Mapper', () => {
	describe('resolveCaseTypeIds', () => {
		it('should successfully resolve type and subtype based on casework area keys', () => {
			const answers = getBaseAnswers();
			const result = resolveCaseTypeIds(answers);

			assert.strictEqual(result.typeId, 'public-path');
			assert.strictEqual(result.subtypeId, 'direction');
		});

		it('should return null for subtype if no subtype field exists for the given type', () => {
			const answers = getBaseAnswers();
			delete answers.publicPath;

			const result = resolveCaseTypeIds(answers);

			assert.strictEqual(result.typeId, 'public-path');
			assert.strictEqual(result.subtypeId, null);
		});
	});

	describe('mapAnswersToCaseInput', () => {
		it('should map base case details correctly', () => {
			const answers = getBaseAnswers();
			const result = mapAnswersToCaseInput(answers, 'REF-001');

			assert.strictEqual(result.reference, 'REF-001');
			assert.strictEqual(result.name, 'Test Case');
			assert.strictEqual(result.externalReference, 'EXT-123');
			assert.strictEqual(result.location, 'London');
			assert.deepStrictEqual(result.receivedDate, new Date('2026-01-01'));

			assert.deepStrictEqual(result.Status?.connect, { id: CASE_STATUS_ID.NEW_CASE });
			assert.deepStrictEqual(result.Type?.connect, { id: 'public-path' });
			assert.deepStrictEqual(result.SubType?.connect, { id: 'direction' });
			assert.deepStrictEqual(result.CaseOfficer?.connectOrCreate, {
				where: { idpUserId: 'officer-xyz' },
				create: { idpUserId: 'officer-xyz' }
			});
		});

		it('should prioritize creating a new subtype if otherSosCasework_text is provided', () => {
			const answers = {
				...getBaseAnswers(),
				otherSosCasework_text: 'My Custom Case Type'
			};

			const result = mapAnswersToCaseInput(answers, 'REF-002');

			assert.ok(result.SubType?.create);
			assert.strictEqual(result.SubType.create.displayName, 'My Custom Case Type');
			assert.strictEqual(result.SubType.create.id, 'my-custom-case-type');

			assert.deepStrictEqual(result.SubType.create.ParentType?.connect, { id: 'public-path' });
		});

		it('should correctly format complex strings for new subtypes (kebab-case)', () => {
			const answers = {
				...getBaseAnswers(),
				otherSosCasework_text: 'Some Weird_Name With CamelCase'
			};

			const result = mapAnswersToCaseInput(answers, 'REF-003');

			assert.strictEqual(result.SubType?.create?.id, 'some-weird-name-with-camel-case');
		});

		it('should map the site address if at least one field is provided', () => {
			const answers = {
				...getBaseAnswers(),
				siteAddress: {
					addressLine1: '123 Fake St',
					townCity: 'London'
				}
			};

			const result = mapAnswersToCaseInput(answers, 'REF-004');

			assert.ok(result.SiteAddress?.create);
			assert.strictEqual(result.SiteAddress.create.line1, '123 Fake St');
			assert.strictEqual(result.SiteAddress.create.townCity, 'London');
			assert.strictEqual(result.SiteAddress.create.county, undefined);
		});

		it('should ignore site address entirely if the object is empty', () => {
			const answers = {
				...getBaseAnswers(),
				siteAddress: {
					addressLine1: '',
					townCity: null
				}
			};

			const result = mapAnswersToCaseInput(answers, 'REF-005');

			assert.strictEqual(result.SiteAddress, undefined);
		});

		it('should map applicant details to contacts correctly', () => {
			const answers = {
				...getBaseAnswers(),
				applicantDetails: [
					{
						applicantFirstName: 'John',
						applicantLastName: 'Doe',
						applicantEmail: 'john@example.com',
						applicantAddress: {
							addressLine1: '456 Applicant Rd',
							postcode: 'AB1 2CD'
						}
					},
					{
						applicantOrgName: 'Big Corp Ltd',
						applicantTelephoneNumber: '0123456789'
					}
				]
			};

			const result = mapAnswersToCaseInput(answers, 'REF-006');

			assert.ok(result.Contacts?.create);
			assert.strictEqual(Array.isArray(result.Contacts.create), true);

			const applicants = result.Contacts.create as any[];
			assert.strictEqual(applicants.length, 2);

			assert.strictEqual(applicants[0].firstName, 'John');
			assert.strictEqual(applicants[0].email, 'john@example.com');
			assert.deepStrictEqual(applicants[0].ContactType?.connect, { id: CONTACT_TYPE_ID.APPLICANT_APPELLANT });

			assert.ok(applicants[0].Address?.create);

			assert.strictEqual(applicants[1].orgName, 'Big Corp Ltd');
			assert.strictEqual(applicants[1].telephoneNumber, '0123456789');
			assert.strictEqual(applicants[1].Address, undefined);
		});

		it('should map the authority correctly if provided', () => {
			const answers = {
				...getBaseAnswers(),
				authority: 'Local Council'
			};

			const result = mapAnswersToCaseInput(answers, 'REF-007');

			assert.deepStrictEqual(result.Authority?.create, { name: 'Local Council' });
		});
	});
});
