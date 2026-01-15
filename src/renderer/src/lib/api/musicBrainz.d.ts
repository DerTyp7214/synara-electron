export interface Listen {
  inserted_at: number;
  listened_at: number;
  recording_msid: string;
  track_metadata: TrackMetadata;
  user_name: string;
}

export interface TrackMetadata {
  additional_info: AdditionalInfo;
  artist_name: string;
  release_name: string;
  track_name: string;
  mbid_mapping?: MbidMapping;
}

export interface AdditionalInfo {
  duration_ms: number;
  media_player: string;
  recording_msid: string;
  submission_client: string;
  submission_client_version: string;
  tags: string[];
  artist_mbids?: string[];
  recording_mbid?: string;
  release_mbid?: string;
}

export interface MbidMapping {
  artist_mbids: string[];
  artists: Artist[];
  caa_id?: number;
  caa_release_mbid?: string;
  recording_mbid: string;
  recording_name: string;
  release_mbid?: string;
}

export interface Artist {
  artist_credit_name: string;
  artist_mbid: string;
  join_phrase: string;
}
