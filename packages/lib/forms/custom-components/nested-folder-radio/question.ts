import { Question, type QuestionViewModel } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import type { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import type { Request } from 'express';

export interface FlatFolder {
	id: string;
	parentFolderId?: string | null;
	displayName: string;
	[key: string]: any;
}

export interface FolderNode extends FlatFolder {
	children: FolderNode[];
}

export default class NestedFolderQuestion extends Question {
	folderStructure: FolderNode[];

	constructor(params: any) {
		super({
			...params,
			viewFolder: 'custom-components/nested-folder-radio'
		});

		this.folderStructure = params.folderStructure;
	}

	/**
	 * Recursive helper to find path of some key (e.g. id or displayName), used when you return to the page and it has your answer saved from session
	 * and for rendering the final answer.
	 */
	private findPath(
		nodes: FolderNode[] | undefined,
		targetId: string,
		key: string = 'id',
		currentPath: string[] = []
	): string[] | null {
		if (!nodes || !Array.isArray(nodes)) return null;

		for (const node of nodes) {
			// node[key] so that we can return either an array of ids, or an array of something else.
			const path = [...currentPath, node[key]];

			if (node.id === targetId) {
				return path;
			}

			if (node.children && node.children.length > 0) {
				const childPath = this.findPath(node.children, targetId, key, path);
				if (childPath) return childPath;
			}
		}
		return null;
	}

	/**
	 * Appends the folder structure to the view model
	 * and also finds the currently selected folder.
	 */
	override prepQuestionForRendering(
		section: Section,
		journey: Journey,
		customViewData: Record<string, unknown>,
		payload?: Record<string, any>
	): QuestionViewModel {
		const answer = payload ? payload[this.fieldName] : journey.response.answers[this.fieldName];

		const selectedPath = this.findPath(this.folderStructure, answer);

		const viewModel = super.prepQuestionForRendering(section, journey, customViewData, payload);

		viewModel.question.folderList = this.folderStructure || [];
		viewModel.question.selectedPath = selectedPath;

		return viewModel;
	}

	/**
	 * Finds the lowest selected folder to save.
	 */
	override async getDataToSave(req: Request): Promise<{ answers: Record<string, unknown> }> {
		const { body } = req;

		let currentDepth = 0;
		let parentId = 'root';
		let finalValue = null;

		while (true) {
			const inputName = `${this.fieldName}_level_${currentDepth}_${parentId}`;
			const selectedValue = body[inputName];

			if (selectedValue) {
				finalValue = selectedValue;
				parentId = selectedValue;
				currentDepth++;
			} else {
				break;
			}
		}

		return {
			answers: {
				[this.fieldName]: finalValue
			}
		};
	}

	/**
	 * Recursive helper to find a folder by ID in the tree
	 */
	private getFolderById(folders: any[], id: string): any | null {
		for (const folder of folders) {
			if (folder.id === id) return folder;

			if (folder.children) {
				const found = this.getFolderById(folder.children, id);
				if (found) return found;
			}
		}
		return null;
	}

	/**
	 * Overrides the summary formatter to return the Folder Name instead of ID
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: string | null) {
		if (answer && this.folderStructure && this.folderStructure.length > 0) {
			const pathNames = this.findPath(this.folderStructure, answer, 'displayName');

			if (pathNames) {
				const displayText = pathNames.join('\n/ ');
				return super.formatAnswerForSummary(sectionSegment, journey, displayText, false);
			}
		}

		return super.formatAnswerForSummary(sectionSegment, journey, answer);
	}
}
