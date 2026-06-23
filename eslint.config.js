import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import tseslint from 'typescript-eslint';

export default defineConfig([
	eslint.configs.recommended,
	tseslint.configs.recommended,
	globalIgnores([
		'.husky',
		'dist/**',
		'node_modules/**',
		'**/*.test.ts',
		'**/.static/**',
		'packages/database/src/client/**'
	]),
	eslintConfigPrettier,
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	{
		files: ['**/*.{js,ts}'],
		ignores: ['tmp/**/*.*', 'node_modules/**/*.*'],
		plugins: {
			'check-file': checkFile
		},
		rules: {
			'check-file/filename-naming-convention': [
				'error',
				{
					'**/*.{js,ts}': 'KEBAB_CASE'
				},
				{
					ignoreMiddleExtensions: true
				}
			],
			'check-file/folder-naming-convention': [
				'error',
				{
					'**/*': 'KEBAB_CASE'
				}
			]
		}
	}
]);
