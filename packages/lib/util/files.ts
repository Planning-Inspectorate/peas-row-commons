/**
 * Generates a unique name, storing them in a set to check for future files
 *
 * Follows the format:
 * document (1).docx
 */
export function generateUniqueFilename(fileName: string, seenFileNames: Set<string>) {
	if (!seenFileNames.has(fileName)) {
		seenFileNames.add(fileName);
		return fileName;
	}

	const [baseName, extension] = isolateFileNameFromExtension(fileName);

	let counter = 1;
	let newName = `${baseName} (${counter})${extension}`;

	while (seenFileNames.has(newName)) {
		counter++;
		newName = `${baseName} (${counter})${extension}`;
	}

	seenFileNames.add(newName);
	return newName;
}

/**
 * Takes a file name and breaks it down into base name + extension (or '') if none
 */
export function isolateFileNameFromExtension(fileName: string) {
	const dotIndex = fileName.lastIndexOf('.');

	if (dotIndex === -1) return [fileName, ''];

	const baseName = fileName.substring(0, dotIndex);
	const extension = fileName.substring(dotIndex);

	return [baseName, extension];
}
