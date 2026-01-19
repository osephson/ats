export type AuthResponse = { token: string };

export type BulkUploadResponse = {
  created: { id: string; url: string; tags: string[] }[];
  duplicatesInPaste: string[];
  duplicatesExisting: string[];
  invalidOrEmpty: string[];
};

export type Job = {
  id: string;
  url: string;
  createdAt: string;
  createdByUserId: string | null;
  tags: string[];
  lastOpenedAt: string | null; // in our MVP this will be filled via /opens/last
};

export type Tag = { id: string; name: string };

export type LastOpened = { jobUrlId: string; lastOpenedAt: string | null };
