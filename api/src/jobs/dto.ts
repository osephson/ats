export type BulkUploadDto = {
  urlsText: string;
  tags: string[]; // preset + custom strings
};

export type BulkUploadResponseDto = {
  created: { id: string; url: string; tags: string[] }[];
  duplicatesInPaste: string[];
  duplicatesExisting: string[];
  invalidOrEmpty: string[];
};
