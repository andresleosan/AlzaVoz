export type LocationPrecision = 'exact' | 'approximate' | 'none';

export interface RecipientInfo {
  id: string;
  name: string;
  detail: string;
  category: 'official' | 'trusted' | 'broadcast' | 'vault';
  selected: boolean;
}

export interface SosSharePreviewConfig {
  precision: LocationPrecision;
  recipients: RecipientInfo[];
  includeAudioRecording?: boolean;
}

export interface ReportSharePreviewConfig {
  locationPrecision: 'full' | 'commune_only' | 'none';
  excludedAttachmentIds: string[];
  excludeRecordingSession: boolean;
}
