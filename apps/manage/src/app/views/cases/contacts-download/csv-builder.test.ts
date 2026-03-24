import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildContactsCsv } from './csv-builder.ts';
import type { PdfContact } from '../case-download/index.ts';

describe('csv-builder', () => {
	describe('buildContactsCsv', () => {
		it('should include UTF-8 BOM at the start', () => {
			const csv = buildContactsCsv([]);

			assert.strictEqual(csv.charCodeAt(0), 0xfeff);
		});

		it('should include header row', () => {
			const csv = buildContactsCsv([]);
			const lines = csv.split('\r\n');

			// First line after BOM is the header
			assert.strictEqual(
				lines[0].replace('\uFEFF', ''),
				'Contact type,First Name,Last Name,Joint party / company name,Address,Email address,Phone number,Objector status'
			);
		});

		it('should format a complete contact as a CSV row', () => {
			const contacts: PdfContact[] = [
				{
					contactType: 'Objector',
					firstName: 'Jane',
					lastName: 'Smith',
					orgName: 'Smith Ltd',
					email: 'jane@smith.com',
					telephoneNumber: '07700900000',
					status: 'Admissible'
				}
			];

			const csv = buildContactsCsv(contacts);
			const lines = csv.split('\r\n');

			assert.strictEqual(lines[1], 'Objector,Jane,Smith,Smith Ltd,,jane@smith.com,07700900000,Admissible');
		});

		it('should handle missing fields with empty cells', () => {
			const contacts: PdfContact[] = [
				{
					contactType: 'Agent',
					firstName: 'Bob'
				}
			];

			const csv = buildContactsCsv(contacts);
			const lines = csv.split('\r\n');

			assert.strictEqual(lines[1], 'Agent,Bob,,,,,,');
		});

		it('should format address in a single cell with line breaks', () => {
			const contacts: PdfContact[] = [
				{
					contactType: 'Applicant / Appellant',
					firstName: 'Test',
					lastName: 'User',
					address: {
						addressLine1: '10 High Street',
						addressLine2: 'Floor 2',
						townCity: 'London',
						county: 'Greater London',
						postcode: 'SW1A 1AA'
					}
				}
			];

			const csv = buildContactsCsv(contacts);
			const dataRow = csv.split('\r\n')[1];

			// Address should be wrapped in quotes because it contains newlines
			assert.ok(dataRow.includes('"10 High Street\nFloor 2\nLondon\nGreater London\nSW1A 1AA"'));
		});

		it('should skip null address fields in the address cell', () => {
			const contacts: PdfContact[] = [
				{
					contactType: 'Objector',
					firstName: 'Test',
					address: {
						addressLine1: '1 Main St',
						townCity: 'Bristol',
						postcode: 'BS1 1AA'
					}
				}
			];

			const csv = buildContactsCsv(contacts);
			const dataRow = csv.split('\r\n')[1];

			// Should only have the non-null parts
			assert.ok(dataRow.includes('"1 Main St\nBristol\nBS1 1AA"'));
		});

		it('should escape commas in cell values', () => {
			const contacts: PdfContact[] = [
				{
					contactType: 'Agent',
					orgName: 'Smith, Jones & Partners'
				}
			];

			const csv = buildContactsCsv(contacts);
			const dataRow = csv.split('\r\n')[1];

			assert.ok(dataRow.includes('"Smith, Jones & Partners"'));
		});

		it('should escape double quotes in cell values', () => {
			const contacts: PdfContact[] = [
				{
					contactType: 'Agent',
					orgName: 'The "Best" Company'
				}
			];

			const csv = buildContactsCsv(contacts);
			const dataRow = csv.split('\r\n')[1];

			assert.ok(dataRow.includes('"The ""Best"" Company"'));
		});

		it('should handle multiple contacts', () => {
			const contacts: PdfContact[] = [
				{ contactType: 'Objector', firstName: 'Alice', lastName: 'One' },
				{ contactType: 'Objector', firstName: 'Bob', lastName: 'Two' },
				{ contactType: 'Agent', firstName: 'Charlie', lastName: 'Three' }
			];

			const csv = buildContactsCsv(contacts);
			const lines = csv.split('\r\n');

			// Header + 3 data rows
			assert.strictEqual(lines.length, 4);
		});

		it('should return only header when contacts array is empty', () => {
			const csv = buildContactsCsv([]);
			const lines = csv.split('\r\n');

			assert.strictEqual(lines.length, 1);
		});
	});
});
