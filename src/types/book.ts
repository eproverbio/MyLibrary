export type BookStatus = "In progress" | "Read" | "Not Read";

export type Book = {
  id: string;
  title: string;
  author: string;
  edition: string;
  genre: string;
  notes: string;
  status: BookStatus;
  bookmark?: number;
  aiSummary?: string;
  createdAt?: number;
};

export type BookDraft = {
  title: string;
  author: string;
  edition: string;
  genre: string;
  notes: string;
  status: BookStatus;
  bookmark?: number;
  aiSummary?: string;
};
