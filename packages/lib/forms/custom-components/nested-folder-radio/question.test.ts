import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import NestedFolderQuestion, { type FolderNode } from './question.ts';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

describe('NestedFolderQuestion', () => {
	let nestedQuestion: NestedFolderQuestion;
	let mockSection: Section;
	let mockJourney: Journey;

	const sampleFolderStructure: FolderNode[] = [
		{
			id: 'folder-root-1',
			displayName: 'Root Folder 1',
			children: [
				{
					id: 'folder-child-1-a',
					displayName: 'Child 1.A',
					children: []
				},
				{
					id: 'folder-child-1-b',
					displayName: 'Child 1.B',
					children: [
						{
							id: 'folder-grandchild-1-b-i',
							displayName: 'Grandchild 1.B.i',
							children: []
						}
					]
				}
			]
		},
		{
			id: 'folder-root-2',
			displayName: 'Root Folder 2',
			children: []
		}
	];

	beforeEach(() => {
		nestedQuestion = new NestedFolderQuestion({
			title: 'Move Files',
			question: 'Where do you want to move these files?',
			fieldName: 'destinationFolder',
			folderStructure: sampleFolderStructure
		} as any);

		mockSection = {
			name: 'mock-section',
			segment: 'mock-segment'
		} as unknown as Section;

		mockJourney = {
			response: {
				answers: {}
			},
			getCurrentQuestionUrl: () => '/mock-current-url',
			getQuestionUrl: () => '/mock-question-url'
		} as unknown as Journey;
	});

	describe('Constructor', () => {
		it('should set the custom view folder and folder structure', () => {
			assert.strictEqual(nestedQuestion.viewFolder, 'custom-components/nested-folder-radio');
			assert.deepStrictEqual(nestedQuestion.folderStructure, sampleFolderStructure);
		});
	});

	describe('prepQuestionForRendering()', () => {
		it('should set selectedPath to null when there is no answer', () => {
			const viewModel = nestedQuestion.prepQuestionForRendering(mockSection, mockJourney, {});
			assert.strictEqual(viewModel.question.selectedPath, null);
		});

		it('should calculate the correct path of IDs for a deep nested answer', () => {
			mockJourney.response.answers = { destinationFolder: 'folder-grandchild-1-b-i' };
			const viewModel = nestedQuestion.prepQuestionForRendering(mockSection, mockJourney, {});
			assert.deepStrictEqual(viewModel.question.selectedPath, [
				'folder-root-1',
				'folder-child-1-b',
				'folder-grandchild-1-b-i'
			]);
		});

		it('should prioritize payload over session answer', () => {
			mockJourney.response.answers = { destinationFolder: 'folder-root-2' };
			const payload = { destinationFolder: 'folder-child-1-a' };
			const viewModel = nestedQuestion.prepQuestionForRendering(mockSection, mockJourney, {}, payload);
			assert.deepStrictEqual(viewModel.question.selectedPath, ['folder-root-1', 'folder-child-1-a']);
		});
	});

	describe('getDataToSave()', () => {
		it('should traverse downwards and return the deepest selected ID', async () => {
			const req = {
				body: {
					destinationFolder_level_0_root: 'folder-root-1',
					'destinationFolder_level_1_folder-root-1': 'folder-child-1-b',
					'destinationFolder_level_2_folder-child-1-b': 'folder-grandchild-1-b-i'
				}
			} as any;
			const result = await nestedQuestion.getDataToSave(req);
			assert.deepStrictEqual(result.answers, { destinationFolder: 'folder-grandchild-1-b-i' });
		});

		it('should return null if nothing is selected', async () => {
			const req = { body: {} } as any;
			const result = await nestedQuestion.getDataToSave(req);
			assert.deepStrictEqual(result.answers, { destinationFolder: null });
		});
	});

	describe('formatAnswerForSummary()', () => {
		const getValue = (result: any) => {
			if (Array.isArray(result) && result.length > 0) {
				return result[0].value;
			}
			return null;
		};

		it('should format a deep ID into a readable path string with HTML breaks', () => {
			const answer = 'folder-grandchild-1-b-i';
			const result = nestedQuestion.formatAnswerForSummary('segment', mockJourney, answer);

			const expectedString = 'Root Folder 1<br>/ Child 1.B<br>/ Grandchild 1.B.i';

			assert.strictEqual(getValue(result), expectedString);
		});

		it('should format a top level ID into a single display name', () => {
			const answer = 'folder-root-2';
			const result = nestedQuestion.formatAnswerForSummary('segment', mockJourney, answer);

			assert.strictEqual(getValue(result), 'Root Folder 2');
		});

		it('should fallback to the raw ID (Capitalized by base class) if not found', () => {
			const answer = 'unknown-id';
			const result = nestedQuestion.formatAnswerForSummary('segment', mockJourney, answer);

			assert.strictEqual(getValue(result), 'Unknown-id');
		});

		it('should return a valid summary array structure even for null answers', () => {
			const result = nestedQuestion.formatAnswerForSummary('segment', mockJourney, null);

			assert.ok(Array.isArray(result));
			assert.strictEqual(result.length, 1);
			assert.ok(result[0].key === 'Move Files');
		});
	});
});
