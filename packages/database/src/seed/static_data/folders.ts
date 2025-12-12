export const PEAS_FOLDERS = [
	{
		displayName: 'Initial documentation',
		displayOrder: 100
	},
	{
		displayName: 'Procedure',
		displayOrder: 200
	},
	{
		displayName: 'Internal correspondence',
		displayOrder: 300
	},
	{
		displayName: 'Statements of case',
		displayOrder: 400
	},
	{
		displayName: 'Proofs of evidence, Rebuttals and Statement of Common Ground (if inquiry)',
		displayOrder: 500
	},
	{
		displayName: 'Start Date Letters',
		displayOrder: 600
	},
	{
		displayName: 'Events information and notifications',
		displayOrder: 700,
		childFolders: {
			create: [
				{
					displayName: 'Pre-enquiry meeting or Case management conference',
					displayOrder: 100
				},
				{
					displayName: 'Site Visit information (if written reps)',
					displayOrder: 200
				},
				{
					displayName: 'Final comments',
					displayOrder: 300
				},
				{
					displayName: 'Inquiry notice',
					displayOrder: 400
				}
			]
		}
	},
	{
		displayName: 'Decision / report',
		displayOrder: 800
	},
	{
		displayName: 'Invoice',
		displayOrder: 900
	},
	{
		displayName: 'Costs',
		displayOrder: 1000
	},
	{
		displayName: 'Other',
		displayOrder: 1100
	}
];

export const ROW_FOLDERS = [
	{
		displayName: 'Letters',
		displayOrder: 100
	},
	{
		displayName: 'Internal correspondence',
		displayOrder: 200
	},
	{
		displayName: 'Submissions',
		displayOrder: 300
	},
	{
		displayName: 'Notices and order documents',
		displayOrder: 400
	},
	{
		displayName: 'Decision',
		displayOrder: 500
	},
	{
		displayName: 'Advertised modifications',
		displayOrder: 600,
		childFolders: {
			create: [
				{
					displayName: 'Communications',
					displayOrder: 100
				},
				{
					displayName: 'Representations',
					displayOrder: 200
				},
				{
					displayName: 'New decision',
					displayOrder: 300
				}
			]
		}
	},
	{
		displayName: 'Other',
		displayOrder: 700
	}
];

export const COMMON_LAND_FOLDERS = [
	{
		displayName: 'Application documents',
		displayOrder: 100
	},
	{
		displayName: 'Public representations',
		displayOrder: 200
	},
	{
		displayName: 'Applicant response to representation',
		displayOrder: 300
	},
	{
		displayName:
			'Correspondence with applicant, representations parties, other parties, registration authority & internal/inspector',
		displayOrder: 400
	},
	{
		displayName: 'Hearing documents',
		displayOrder: 500
	},
	{
		displayName: 'Decision',
		displayOrder: 600
	},
	{
		displayName: 'Other',
		displayOrder: 700
	}
];
