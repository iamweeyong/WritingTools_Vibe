export type Project = {
  id: number;
  type: 'screenplay';
  title: string;
  created_at: string;
  updated_at: string;
};

export type Scene = {
  id: number;
  project_id: number;
  order_key: string;
  slugline: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: number;
  title: string;
  body_md: string;
  is_moc: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type OutputDoc = {
  id: number;
  moc_note_id: number;
  title: string;
  body_md: string;
  created_at: string;
};

export type ResearchTopic = {
  id: number;
  project_id: number;
  title: string;
  query_md: string;
  created_at: string;
};

export type ResearchBrief = {
  id: number;
  topic_id: number;
  title: string;
  summary: string;
  ideas_json: string;
  source_urls_json: string;
  created_at: string;
  status: string;
};
