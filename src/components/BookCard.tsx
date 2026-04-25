import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Book } from "../types/book";

type Props = {
  book: Book;
  onDelete: (id: string) => void;
};

export function BookCard({ book, onDelete }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
        </View>
        <Pressable onPress={() => onDelete(book.id)} style={styles.deleteButton}>
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </View>
      <Text style={styles.notes}>{book.notes}</Text>
      {book.aiSummary ? <Text style={styles.aiSummary}>AI: {book.aiSummary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#132238",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: "#F7FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  author: {
    color: "#9FB3C8",
    marginTop: 4,
  },
  notes: {
    color: "#D9E2EC",
    lineHeight: 20,
  },
  aiSummary: {
    color: "#A7F3D0",
    lineHeight: 20,
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#7F1D1D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  deleteLabel: {
    color: "#FEE2E2",
    fontWeight: "600",
  },
});
