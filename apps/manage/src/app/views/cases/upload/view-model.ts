import type { SessionUploadedFile } from './types.ts';

const SUCCESS_ICON_HTML = `
    <svg class="moj-banner__icon" fill="currentColor" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" height="25" width="25">
        <path d="M25,6.2L8.7,23.2L0,14.1l4-4.2l4.7,4.9L21,2L25,6.2z"></path>
    </svg>
`;

export function createUploadedFilesViewModel(files: SessionUploadedFile[]) {
	return files.map((file) => {
		const fileName = file.fileName;
		return {
			originalName: fileName,
			message: {
				html: `<span class="moj-multi-file-upload__success">${SUCCESS_ICON_HTML} ${file.fileName} (${file.formattedSize})</span>`
			},
			deleteButton: {
				text: 'Delete'
			}
		};
	});
}
