/**
 * Utility class to assess footer
 */
class DownloadsUtility {
	/**
	 * Validates downloaded case export files.
	 *
	 * - Case downloads:
	 *   Verifies the ZIP exists and contains the expected PDFs.
	 *
	 * - Contact downloads:
	 *   Verifies the contacts CSV file exists.
	 */
	validateDownloadedFile(type: 'case' | 'contacts', caseReference: string): void {
		if (type === 'case') {
			const zipName = `${caseReference.replace(/\//g, '_')}_Download.zip`;

			const expectedZipContents = ['Contact list.pdf', 'Objector list.pdf', 'Case details.pdf'];

			cy.task('getZipContents', `cypress/downloads/${zipName}`).then((entries) => {
				const names = (entries as { name: string }[]).map((entry) => entry.name);

				expectedZipContents.forEach((file) => {
					expect(names).to.include(file);
				});
			});

			return;
		}

		const csvName = `${caseReference.toLowerCase().replace(/\//g, '-')}-contact.csv`;

		cy.readFile(`cypress/downloads/${csvName}`, {
			timeout: 15_000
		}).should('exist');
	}
}

export default new DownloadsUtility();
