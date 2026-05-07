import prompts from 'prompts';
import { spawnSync } from 'child_process';

(async () => {
	const response = await prompts({
		type: 'select',
		name: 'tag',
		message: 'What Cypress suite do you want to run?',
		choices: [
			{ title: 'Smoke', value: 'smoke' },
			{ title: 'Regression', value: 'regression' }
		]
	});

	if (!response.tag) {
		console.log('No suite selected.');
		process.exit(0);
	}

	const result = spawnSync('npx', ['cypress', 'run', '--env', `journeyTags=${response.tag}`], {
		stdio: 'inherit',
		shell: true
	});

	process.exit(result.status ?? 0);
})();
