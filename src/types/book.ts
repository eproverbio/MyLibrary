export type Book = {
  id: string;
  title: string;
  author: string;
  notes: string;
  aiSummary?: string;
  createdAt?: number;
};

export type BookDraft = {
  title: string;
  author: string;
  notes: string;
  aiSummary?: string;
};
