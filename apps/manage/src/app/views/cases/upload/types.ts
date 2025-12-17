// Defines what we actually store in the session rather than full multer object
export type SessionUploadedFile = {
	fileName: string;
	size: number;
	formattedSize: string;
	blobName: string;
	blobNameBase64Encoded: string;
};
