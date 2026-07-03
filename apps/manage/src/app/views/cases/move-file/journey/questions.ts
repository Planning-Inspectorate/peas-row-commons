import { createQuestions, questionClasses } from '@planning-inspectorate/dynamic-forms';
import NestedRequiredValidator from '@pins/peas-row-commons-lib/forms/custom-components/nested-folder-radio/validator.ts';
import {
	CUSTOM_COMPONENT_CLASSES,
	CUSTOM_COMPONENTS
} from '@pins/peas-row-commons-lib/forms/custom-components/index.ts';

export function getQuestions(folderStructure: Record<string, any>) {
	const questions = {
		moveFolder: {
			type: CUSTOM_COMPONENTS.NESTED_FOLDERS,
			title: 'File location',
			question: 'File location',
			fieldName: 'fileLocation',
			url: 'file-location',
			folderStructure,
			validators: [new NestedRequiredValidator()]
		}
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};

	return createQuestions(questions, classes, {});
}
