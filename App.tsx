import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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

type Screen = "home" | "vault" | "manual" | "look";

const emptyDraft = {
  title: "",
  author: "",
  notes: "",
};

const futureAssets = {
  homeBackground: "assets/ui/home-background.png",
  vaultButton: "assets/ui/button-vault.png",
  manualButton: "assets/ui/button-manual.png",
  lookButton: "assets/ui/button-look.png",
};

type MenuButtonProps = {
  isExpanded: boolean;
  label: string;
  onPress: () => void;
  tint: string;
};

function MenuButton({ isExpanded, label, onPress, tint }: MenuButtonProps) {
  const animation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isExpanded ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animation, isExpanded]);

  return (
    <View style={styles.menuRow}>
      <Pressable onPress={onPress} style={[styles.menuButton, { borderColor: tint }]}>
        <View style={[styles.menuButtonGlow, { backgroundColor: tint }]} />
        <View style={styles.menuButtonOverlay} />
      </Pressable>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.menuFloatingLabelWrap,
          {
            opacity: animation,
            transform: [
              {
                translateX: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-18, 0],
                }),
              },
            ],
          },
          !isExpanded && styles.menuFloatingLabelHidden,
        ]}
      >
        <View style={styles.menuFloatingLabel}>
          <Text style={styles.menuLabel}>{label}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

type SecondaryScreenProps = {
  title: string;
  onBack: () => void;
  backPosition?: "top" | "bottom";
  children: React.ReactNode;
};

function SecondaryScreen({
  title,
  onBack,
  backPosition = "top",
  children,
}: SecondaryScreenProps) {
  const isBottomBackButton = backPosition === "bottom";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.screenShell}>
        {!isBottomBackButton ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>{"<"}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.screenTitle}>{title}</Text>
        <ScrollView contentContainerStyle={styles.screenContent}>{children}</ScrollView>
        {isBottomBackButton ? (
          <Pressable onPress={onBack} style={[styles.backButton, styles.bottomBackButton]}>
            <Text style={styles.backButtonLabel}>{"<"}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [expandedButtons, setExpandedButtons] = useState({
    vault: false,
    manual: false,
    look: false,
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  function collapseHomeButtons() {
    setExpandedButtons((current) => {
      if (!current.vault && !current.manual && !current.look) {
        return current;
      }

      return {
        vault: false,
        manual: false,
        look: false,
      };
    });
  }

  function handleHomeButtonPress(target: "vault" | "manual" | "look") {
    if (expandedButtons[target]) {
      setScreen(target);
      return;
    }

    setExpandedButtons((current) => ({
      ...current,
      [target]: true,
    }));
  }

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

  useEffect(() => {
    if (screen !== "home") {
      collapseHomeButtons();
    }
  }, [screen]);

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
      setScreen("vault");
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

  if (screen === "home") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.homeBackground} onPress={collapseHomeButtons}>
          <View style={styles.homeOverlay} />
          <View style={styles.homeContent}>
            <View style={styles.brandWrap}>
              <Text style={styles.brandTitle}>MyLibrary</Text>
            </View>

            <View style={styles.menuStack}>
              <MenuButton
                isExpanded={expandedButtons.vault}
                label="The Vault"
                tint="rgba(191, 219, 254, 0.45)"
                onPress={() => handleHomeButtonPress("vault")}
              />
              <MenuButton
                isExpanded={expandedButtons.manual}
                label="Manual"
                tint="rgba(196, 181, 253, 0.45)"
                onPress={() => handleHomeButtonPress("manual")}
              />
              <MenuButton
                isExpanded={expandedButtons.look}
                label="Look"
                tint="rgba(253, 230, 138, 0.45)"
                onPress={() => handleHomeButtonPress("look")}
              />
            </View>
          </View>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (screen === "vault") {
    return (
      <SecondaryScreen
        title="The Vault"
        onBack={() => setScreen("home")}
        backPosition="bottom"
      >
        <View style={styles.infoPanel}>
          <Text style={styles.panelHeading}>Saved books</Text>
          <Text style={styles.panelCopy}>
            All your saved books live here. Pull the refresh button whenever you want to sync the
            view with local SQLite.
          </Text>
          <Pressable onPress={refreshBooks} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#E2C38B" />
            <Text style={styles.loadingText}>Loading from SQLite...</Text>
          </View>
        ) : books.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>The vault is empty.</Text>
            <Text style={styles.emptyText}>Use Manual from the home screen to add your first book.</Text>
          </View>
        ) : (
          <View style={styles.bookList}>
            {books.map((book) => (
              <BookCard key={book.id} book={book} onDelete={handleDeleteBook} />
            ))}
          </View>
        )}
      </SecondaryScreen>
    );
  }

  if (screen === "manual") {
    return (
      <SecondaryScreen title="Manual" onBack={() => setScreen("home")}>
        <View style={styles.infoPanel}>
          <Text style={styles.panelHeading}>Add a book manually</Text>
          <Text style={styles.panelCopy}>
            This page keeps the local insert flow alive while the home screen stays clean and minimal.
          </Text>
        </View>

        <View style={styles.formPanel}>
          <TextInput
            placeholder="Title"
            placeholderTextColor="#9AA7B8"
            value={draft.title}
            onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
            style={styles.input}
          />
          <TextInput
            placeholder="Author"
            placeholderTextColor="#9AA7B8"
            value={draft.author}
            onChangeText={(value) => setDraft((current) => ({ ...current, author: value }))}
            style={styles.input}
          />
          <TextInput
            placeholder="Notes"
            placeholderTextColor="#9AA7B8"
            value={draft.notes}
            onChangeText={(value) => setDraft((current) => ({ ...current, notes: value }))}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
          <Pressable onPress={handleAddBook} style={styles.primaryButton} disabled={saving}>
            <Text style={styles.primaryButtonLabel}>{saving ? "Saving..." : "Save to The Vault"}</Text>
          </Pressable>
        </View>
      </SecondaryScreen>
    );
  }

  return (
    <SecondaryScreen title="Look" onBack={() => setScreen("home")}>
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>Look is ready for later.</Text>
        <Text style={styles.emptyText}>
          When you decide what this area should do, we can wire it into search, scan, or visual exploration.
        </Text>
        <Text style={styles.assetHintCard}>Future icon path: {futureAssets.lookButton}</Text>
      </View>
    </SecondaryScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#100D08",
  },
  homeBackground: {
    flex: 1,
    backgroundColor: "#120E09",
  },
  homeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 5, 3, 0.45)",
  },
  homeContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
  },
  brandWrap: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 10,
  },
  brandTitle: {
    color: "#F6E7C9",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 1.4,
    textAlign: "right",
  },
  menuStack: {
    marginTop: 320,
    gap: 40,
    alignItems: "flex-start",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    width: 72,
    minHeight: 72,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    borderWidth: 1,
    backgroundColor: "rgba(39, 29, 20, 0.82)",
  },
  menuButtonGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  menuButtonOverlay: {
    flex: 1,
    backgroundColor: "rgba(16, 12, 8, 0.52)",
  },
  menuFloatingLabelWrap: {
    marginLeft: 14,
  },
  menuFloatingLabelHidden: {
    position: "absolute",
    left: 86,
  },
  menuFloatingLabel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(27, 20, 13, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
  },
  menuLabel: {
    color: "#FFF7EA",
    fontSize: 17,
    fontWeight: "700",
  },
  screenShell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246, 231, 201, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
  },
  backButtonLabel: {
    color: "#F6E7C9",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "600",
  },
  screenTitle: {
    marginTop: 18,
    marginBottom: 20,
    color: "#F6E7C9",
    fontSize: 32,
    fontWeight: "800",
  },
  screenContent: {
    paddingBottom: 28,
    gap: 16,
  },
  bottomBackButton: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  infoPanel: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    backgroundColor: "#1A140E",
    gap: 12,
  },
  panelHeading: {
    color: "#FFF7EA",
    fontSize: 20,
    fontWeight: "700",
  },
  panelCopy: {
    color: "#D8C8AE",
    fontSize: 14,
    lineHeight: 22,
  },
  formPanel: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    backgroundColor: "#1A140E",
    gap: 14,
  },
  input: {
    backgroundColor: "#261C13",
    color: "#FFF7EA",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#D1A157",
  },
  primaryButtonLabel: {
    color: "#20150C",
    fontWeight: "800",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#2A2017",
  },
  secondaryButtonLabel: {
    color: "#F6E7C9",
    fontWeight: "700",
  },
  loadingBox: {
    gap: 10,
    alignItems: "center",
    paddingVertical: 36,
  },
  loadingText: {
    color: "#CBB89A",
  },
  emptyPanel: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    backgroundColor: "#1A140E",
    gap: 10,
  },
  emptyTitle: {
    color: "#FFF7EA",
    fontSize: 22,
    fontWeight: "700",
  },
  emptyText: {
    color: "#D8C8AE",
    fontSize: 15,
    lineHeight: 22,
  },
  assetHintCard: {
    color: "#A9987E",
    fontSize: 12,
    marginTop: 8,
  },
  bookList: {
    gap: 12,
  },
});
