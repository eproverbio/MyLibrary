import type { Book } from "../../types/book";
import type { OcrCandidate, OcrVaultMatch } from "./types";

function normalizeOcrValue(value: string) {
  return value.trim().toLowerCase();
}

export function resolveOcrVaultMatch(
  candidate: Pick<OcrCandidate, "title" | "author" | "edition">,
  books: Book[]
): OcrVaultMatch {
  const normalizedTitle = normalizeOcrValue(candidate.title);
  const normalizedAuthor = normalizeOcrValue(candidate.author);
  const normalizedEdition = normalizeOcrValue(candidate.edition);

  if (!normalizedTitle || !normalizedAuthor) {
    return {
      matchType: "none",
      matchedBook: null,
    };
  }

  const exactMatch = books.find((book) => {
    return (
      normalizeOcrValue(book.title) === normalizedTitle &&
      normalizeOcrValue(book.author) === normalizedAuthor &&
      normalizeOcrValue(book.edition) === normalizedEdition
    );
  });

  if (exactMatch) {
    return {
      matchType: "exact",
      matchedBook: exactMatch,
    };
  }

  const titleAuthorMatch = books.find((book) => {
    return (
      normalizeOcrValue(book.title) === normalizedTitle &&
      normalizeOcrValue(book.author) === normalizedAuthor
    );
  });

  if (titleAuthorMatch) {
    return {
      matchType: "title-author",
      matchedBook: titleAuthorMatch,
    };
  }

  return {
    matchType: "none",
    matchedBook: null,
  };
}
