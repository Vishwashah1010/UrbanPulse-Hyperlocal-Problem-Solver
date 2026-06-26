export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
}

export interface CsvDataRow {
  [key: string]: string | number;
}

export interface CsvParsedData {
  headers: string[];
  rows: CsvDataRow[];
}
