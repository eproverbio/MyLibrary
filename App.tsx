import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BookCard } from "./src/components/BookCard";
import { createBook, fetchBooks, removeBook } from "./src/services/books";
import type { Book } from "./src/types/book";

const emptyDraft = {
  title: "",
  author: "",
  notes: "",
};

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  async function refreshBooks() {
    try {
      setLoading(true);
      const nextBooks = await fetchBooks();
      setBooks(nextBooks);
    } catch (error) {
      Alert.alert("Database error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshBooks();
  }, []);

  async function handleAddBook() {
    if (!draft.title.trim() || !draft.author.trim()) {
      Alert.alert("Missing data", "Please add at least a title and an author.");
      return;
    }

    try {
      setSaving(true);
      await createBook({
        title: draft.title.trim(),
        author: draft.author.trim(),
        notes: draft.notes.trim(),
      });
      setDraft(emptyDraft);
      await refreshBooks();
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBook(id: string) {
    try {
      await removeBook(id);
      await refreshBooks();
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>MyLibrary</Text>
          <Text style={styles.title}>A small mobile book vault backed by local SQLite.</Text>
          <Text style={styles.subtitle}>
            Your books are stored on the device in a local SQLite database, so you can add and
            manage them without Firebase or any external backend.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Add a book</Text>
          <TextInput
            placeholder="Title"
            placeholderTextColor="#7C8AA0"
            value={draft.title}
            onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
            style={styles.input}
          />
          <TextInput
            placeholder="Author"
            placeholderTextColor="#7C8AA0"
            value={draft.author}
            onChangeText={(value) => setDraft((current) => ({ ...current, author: value }))}
            style={styles.input}
          />
          <TextInput
            placeholder="Notes"
            placeholderTextColor="#7C8AA0"
            value={draft.notes}
            onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
          <Pressable onPress={handleAddBook} style={styles.primaryButton} disabled={saving}>
            <Text style={styles.primaryButtonLabel}>{saving ? "Saving..." : "Save locally"}</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Saved books</Text>
            <Pressable onPress={refreshBooks} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Refresh</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading from SQLite...</Text>
            </View>
          ) : books.length === 0 ? (
            <Text style={styles.emptyState}>No books yet. Add one above.</Text>
          ) : (
            <View style={styles.bookList}>
              {books.map((book) => (
                <BookCard key={book.id} book={book} onDelete={handleDeleteBook} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#081120",
  },
  container: {
    padding: 20,
    gap: 18,
  },
  hero: {
    paddingVertical: 8,
    gap: 10,
  },
  kicker: {
    color: "#8B5CF6",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
  },
  subtitle: {
    color: "#B6C2D2",
    fontSize: 15,
    lineHeight: 22,
  },
  code: {
    color: "#E9D5FF",
    fontFamily: "Courier",
  },
  panel: {
    backgroundColor: "#0F1B2D",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#16263D",
    color: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonLabel: {
    color: "white",
    fontWeight: "700",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  secondaryButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#16263D",
  },
  secondaryButtonLabel: {
    color: "#D9E2EC",
    fontWeight: "600",
  },
  loadingBox: {
    gap: 10,
    alignItems: "center",
    paddingVertical: 18,
  },
  loadingText: {
    color: "#9FB3C8",
  },
  emptyState: {
    color: "#9FB3C8",
  },
  bookList: {
    gap: 12,
  },
});
