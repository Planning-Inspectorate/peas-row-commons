export interface CountHeadingConfig {
	zeroFiles?: string;
	oneFile: string;
	multipleFiles: (count: number) => string;
}

/**
 * For page headings regarding files journey such as move and delete that change based on a count, e.g. "1 file", "2 files"
 */
export function getCountHeading(count: number, config: CountHeadingConfig): string {
	if (count === 1) return config.oneFile;
	return count === 0 && config.zeroFiles ? config.zeroFiles : config.multipleFiles(count);
}
