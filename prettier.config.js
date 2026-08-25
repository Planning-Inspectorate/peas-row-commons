import { prettierConfig } from '@planning-inspectorate/coding-standards';

export default {
	...prettierConfig,
	// disable 'prettier-plugin-organize-imports' for now
	plugins: ['prettier-plugin-prisma']
};
