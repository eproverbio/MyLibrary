import { useEffect, useRef, useState } from "react";
import * as NavigationBar from "expo-navigation-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  GestureResponderEvent,
  Image,
  ImageBackground,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { createBook, fetchBooks, removeBook } from "./src/services/books";
import type { Book } from "./src/types/book";

type Screen = "home" | "vault" | "manual" | "ocr";
type HomeBackgroundMode = "image" | "frames" | "video";
type VaultSortKey = "title" | "author";
type VaultSortDirection = "asc" | "desc";

const emptyDraft = {
  title: "",
  author: "",
  notes: "",
};

const homeBackgroundImage = require("./assets/ui/home-background.png");
const homeLogoImage = require("./assets/ui/logo-mylibrary.png");
const isHomeLogoVisible = false;
const homeBackgroundMode: HomeBackgroundMode = "image";
const isHomeBackgroundAnimationEnabled = false;
const areHomeButtonsInitiallyVisible = false;
const appChromeColor = "#100D08";
const homeBackgroundVideoAssetPath = "assets/ui/home-video/home-background-loop.mp4";
const homeBackgroundVideoSource: number | null = null;
const homeAnimationFrames = [
  require("./assets/ui/home-animation/frame-01.png"),
  require("./assets/ui/home-animation/frame-02.png"),
  require("./assets/ui/home-animation/frame-03.png"),
  require("./assets/ui/home-animation/frame-04.png"),
  require("./assets/ui/home-animation/frame-05.png"),
  require("./assets/ui/home-animation/frame-06.png"),
  require("./assets/ui/home-animation/frame-07.png"),
  require("./assets/ui/home-animation/frame-08.png"),
  require("./assets/ui/home-animation/frame-09.png"),
  require("./assets/ui/home-animation/frame-10.png"),
];

const futureAssets = {
  homeBackground: "assets/ui/home-background.png",
  homeBackgroundVideo: homeBackgroundVideoAssetPath,
  vaultButton: "assets/ui/button-vault.png",
  manualButton: "assets/ui/button-manual.png",
  ocrButton: "assets/ui/button-look.png",
};

type HomeVideoBackgroundProps = {
  source: number | null;
};

function HomeVideoBackground({ source }: HomeVideoBackgroundProps) {
  if (!source) {
    return null;
  }

  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.muted = true;
    videoPlayer.loop = true;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      style={styles.homeVideoBackground}
    />
  );
}

type MenuButtonProps = {
  isExpanded: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
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
  stickyHeaderIndices?: number[];
  onScrollBeginDrag?: () => void;
  children: React.ReactNode;
};

function SecondaryScreen({
  title,
  onBack,
  backPosition = "bottom",
  stickyHeaderIndices,
  onScrollBeginDrag,
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
        <ScrollView
          contentContainerStyle={styles.screenContent}
          stickyHeaderIndices={stickyHeaderIndices}
          onScrollBeginDrag={onScrollBeginDrag}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {isBottomBackButton ? (
          <Pressable onPress={onBack} style={[styles.backButton, styles.bottomBackButton]}>
            <Text style={styles.backButtonLabel}>{"<"}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

type SwipeableVaultRowProps = {
  book: Book;
  isLast: boolean;
  isOpen: boolean;
  onOpen: (id: string | null) => void;
  onDelete: (id: string) => void;
};

const vaultDeleteRevealWidth = 104;
const vaultSwipeOpenThreshold = 56;
const vaultSwipeCloseThreshold = 36;
const vaultSwipeVelocityThreshold = 0.35;

function SwipeableVaultRow({
  book,
  isLast,
  isOpen,
  onOpen,
  onDelete,
}: SwipeableVaultRowProps) {
  const translateX = useRef(new Animated.Value(isOpen ? -vaultDeleteRevealWidth : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isOpen ? -vaultDeleteRevealWidth : 0,
      damping: 20,
      mass: 0.9,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [isOpen, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const nextValue = isOpen
          ? Math.min(0, Math.max(-vaultDeleteRevealWidth, -vaultDeleteRevealWidth + gestureState.dx))
          : Math.min(0, Math.max(-vaultDeleteRevealWidth, gestureState.dx));

        translateX.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldOpen = isOpen
          ? !(
              gestureState.dx > vaultSwipeCloseThreshold ||
              gestureState.vx > vaultSwipeVelocityThreshold
            )
          : gestureState.dx < -vaultSwipeOpenThreshold ||
            gestureState.vx < -vaultSwipeVelocityThreshold;
        onOpen(shouldOpen ? book.id : null);
      },
      onPanResponderTerminate: () => {
        onOpen(isOpen ? book.id : null);
      },
    })
  ).current;

  return (
    <View style={[styles.vaultSwipeRow, isLast && styles.vaultSwipeRowLast]}>
      <View style={styles.vaultSwipeActionLayer}>
        <Pressable onPress={() => onDelete(book.id)} style={styles.vaultDeleteButton}>
          <Text style={styles.vaultDeleteButtonLabel}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.vaultTableRow,
          isLast && styles.vaultTableRowLast,
          { transform: [{ translateX }] },
        ]}
      >
        <View style={styles.vaultTitleColumn}>
          <Text style={styles.vaultCellPrimary}>{book.title}</Text>
          {book.notes ? (
            <Text numberOfLines={2} style={styles.vaultCellSecondary}>
              {book.notes}
            </Text>
          ) : null}
        </View>
        <View style={styles.vaultAuthorColumn}>
          <Text style={styles.vaultCellValue}>{book.author}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>("home");
  const [areHomeButtonsVisible, setAreHomeButtonsVisible] = useState(
    areHomeButtonsInitiallyVisible
  );
  const [areHomeButtonsRendered, setAreHomeButtonsRendered] = useState(
    areHomeButtonsInitiallyVisible
  );
  const [homeFrameIndex, setHomeFrameIndex] = useState(0);
  const [expandedButtons, setExpandedButtons] = useState({
    vault: false,
    manual: false,
    ocr: false,
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultSortKey, setVaultSortKey] = useState<VaultSortKey>("title");
  const [vaultSortDirection, setVaultSortDirection] = useState<VaultSortDirection>("asc");
  const [openVaultRowId, setOpenVaultRowId] = useState<string | null>(null);
  const homeButtonsAnimation = useRef(
    new Animated.Value(areHomeButtonsInitiallyVisible ? 1 : 0)
  ).current;

  function collapseHomeButtons() {
    setExpandedButtons((current) => {
      if (!current.vault && !current.manual && !current.ocr) {
        return current;
      }

      return {
        vault: false,
        manual: false,
        ocr: false,
      };
    });
  }

  function hideHomeButtons() {
    if (!areHomeButtonsVisible && !areHomeButtonsRendered) {
      return;
    }

    collapseHomeButtons();
    setAreHomeButtonsVisible(false);
    Animated.timing(homeButtonsAnimation, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setAreHomeButtonsRendered(false);
      }
    });
  }

  function handleHomeBackgroundPress() {
    if (areHomeButtonsVisible) {
      hideHomeButtons();
      return;
    }

    setAreHomeButtonsRendered(true);
    setAreHomeButtonsVisible(true);
    Animated.timing(homeButtonsAnimation, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function handleHomeButtonPress(
    target: "vault" | "manual" | "ocr",
    event: GestureResponderEvent
  ) {
    event.stopPropagation();

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
      setOpenVaultRowId((current) =>
        nextBooks.some((book) => book.id === current) ? current : null
      );
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
    if (Platform.OS !== "android") {
      return;
    }

    async function syncNavigationBar() {
      await NavigationBar.setButtonStyleAsync("light");

      if (screen === "home") {
        await NavigationBar.setPositionAsync("absolute");
        await NavigationBar.setBehaviorAsync("overlay-swipe");
        await NavigationBar.setBackgroundColorAsync("#00000000");
        await NavigationBar.setBorderColorAsync("#00000000");
        await NavigationBar.setVisibilityAsync("visible");
        return;
      }

      await NavigationBar.setVisibilityAsync("visible");
      await NavigationBar.setPositionAsync("relative");
      await NavigationBar.setBackgroundColorAsync(appChromeColor);
      await NavigationBar.setBorderColorAsync(appChromeColor);
    }

    void syncNavigationBar();
  }, [screen]);

  useEffect(() => {
    if (screen !== "home") {
      hideHomeButtons();
    }
  }, [screen]);

  useEffect(() => {
    if (
      screen !== "home" ||
      homeBackgroundMode !== "frames" ||
      !isHomeBackgroundAnimationEnabled
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      setHomeFrameIndex((current) => (current + 1) % homeAnimationFrames.length);
    }, 120);

    return () => clearInterval(intervalId);
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
      setOpenVaultRowId(null);
      await refreshBooks();
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  function handleVaultSortChange(nextKey: VaultSortKey) {
    if (vaultSortKey === nextKey) {
      setVaultSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setVaultSortKey(nextKey);
    setVaultSortDirection("asc");
  }

  function getVaultSortLabel(sortKey: VaultSortKey, label: string) {
    return label;
  }

  function getVaultSortArrow(sortKey: VaultSortKey) {
    if (vaultSortKey !== sortKey) {
      return "";
    }

    return vaultSortDirection === "asc" ? "↑" : "↓";
  }

  const normalizedSearch = vaultSearch.trim().toLowerCase();
  const visibleBooks = [...books]
    .filter((book) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${book.title} ${book.author}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .sort((left, right) => {
      const comparison = left[vaultSortKey].localeCompare(right[vaultSortKey], undefined, {
        sensitivity: "base",
      });

      if (comparison === 0) {
        return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
      }

      return vaultSortDirection === "asc" ? comparison : -comparison;
    });
  const hasVisibleBooks = !loading && books.length > 0 && visibleBooks.length > 0;

  if (screen === "home") {
    const menuStackAnimatedStyle = {
      opacity: homeButtonsAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
      transform: [
        {
          translateX: homeButtonsAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [-140, 0],
          }),
        },
      ],
    };

    return (
      <View style={styles.homeScreen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ImageBackground
          source={homeBackgroundImage}
          resizeMode="cover"
          style={styles.homeBackground}
          imageStyle={[styles.homeBackgroundImage, { width: windowWidth + 40 }]}
        >
          {homeBackgroundMode === "video" ? (
            <HomeVideoBackground source={homeBackgroundVideoSource} />
          ) : null}
          {homeBackgroundMode === "frames" && isHomeBackgroundAnimationEnabled ? (
            <Image
              source={homeAnimationFrames[homeFrameIndex]}
              resizeMode="cover"
              style={styles.homeAnimationFrame}
            />
          ) : null}
          <Pressable style={styles.homeTouchLayer} onPress={handleHomeBackgroundPress}>
            <View style={styles.homeOverlay} />
            <View style={styles.homeContent}>
              <View style={styles.brandWrap}>
                {isHomeLogoVisible ? (
                  <Image source={homeLogoImage} resizeMode="contain" style={styles.brandLogo} />
                ) : null}
              </View>

              {areHomeButtonsRendered ? (
                <Animated.View style={[styles.menuStack, menuStackAnimatedStyle]}>
                  <MenuButton
                    isExpanded={expandedButtons.vault}
                    label="The Vault"
                    tint="rgba(191, 219, 254, 0.45)"
                    onPress={(event) => handleHomeButtonPress("vault", event)}
                  />
                  <MenuButton
                    isExpanded={expandedButtons.manual}
                    label="Write"
                    tint="rgba(196, 181, 253, 0.45)"
                    onPress={(event) => handleHomeButtonPress("manual", event)}
                  />
                  <MenuButton
                    isExpanded={expandedButtons.ocr}
                    label="OCR"
                    tint="rgba(253, 230, 138, 0.45)"
                    onPress={(event) => handleHomeButtonPress("ocr", event)}
                  />
                </Animated.View>
              ) : null}
            </View>
          </Pressable>
        </ImageBackground>
      </View>
    );
  }

  if (screen === "vault") {
    const dismissOpenVaultRow = () => {
      setOpenVaultRowId(null);
    };

    return (
      <SecondaryScreen
        title="The Vault"
        onBack={() => setScreen("home")}
        backPosition="bottom"
        stickyHeaderIndices={hasVisibleBooks ? [1, 2] : undefined}
        onScrollBeginDrag={dismissOpenVaultRow}
      >
        <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
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
        </Pressable>

        {hasVisibleBooks ? (
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <View style={styles.vaultToolbarWrap}>
              <View style={styles.vaultToolbar}>
                <TextInput
                  value={vaultSearch}
                  onChangeText={setVaultSearch}
                  placeholder="Search by title or author"
                  placeholderTextColor="#8E7C66"
                  style={styles.vaultSearchInput}
                />
                <Text style={styles.vaultResultCount}>
                  {visibleBooks.length} {visibleBooks.length === 1 ? "result" : "results"}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <View style={styles.vaultToolbar}>
              <TextInput
                value={vaultSearch}
                onChangeText={setVaultSearch}
                placeholder="Search by title or author"
                placeholderTextColor="#8E7C66"
                style={styles.vaultSearchInput}
              />
              <Text style={styles.vaultResultCount}>
                {visibleBooks.length} {visibleBooks.length === 1 ? "result" : "results"}
              </Text>
            </View>
          </Pressable>
        )}

        {hasVisibleBooks ? (
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <View style={styles.vaultTableHeaderWrap}>
              <View style={styles.vaultTableHeader}>
                <Pressable
                  onPress={() => handleVaultSortChange("title")}
                  style={[styles.vaultHeaderButton, styles.vaultTitleColumn]}
                >
                  <View style={styles.vaultHeaderInner}>
                    <Text
                      style={[
                        styles.vaultHeaderCell,
                        vaultSortKey === "title" && styles.vaultHeaderCellActive,
                      ]}
                    >
                      {getVaultSortLabel("title", "Title")}
                    </Text>
                    {getVaultSortArrow("title") ? (
                      <Text style={styles.vaultHeaderArrow}>{getVaultSortArrow("title")}</Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => handleVaultSortChange("author")}
                  style={[styles.vaultHeaderButton, styles.vaultAuthorColumn]}
                >
                  <View style={styles.vaultHeaderInner}>
                    <Text
                      style={[
                        styles.vaultHeaderCell,
                        vaultSortKey === "author" && styles.vaultHeaderCellActive,
                      ]}
                    >
                      {getVaultSortLabel("author", "Author")}
                    </Text>
                    {getVaultSortArrow("author") ? (
                      <Text style={styles.vaultHeaderArrow}>{getVaultSortArrow("author")}</Text>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            </View>
          </Pressable>
        ) : null}

        {loading ? (
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E2C38B" />
              <Text style={styles.loadingText}>Loading from SQLite...</Text>
            </View>
          </Pressable>
        ) : books.length === 0 ? (
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>The vault is empty.</Text>
              <Text style={styles.emptyText}>Use Manual from the home screen to add your first book.</Text>
            </View>
          </Pressable>
        ) : visibleBooks.length === 0 ? (
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyTitle}>No matches found.</Text>
              <Text style={styles.emptyText}>Try a different title or author in the search bar.</Text>
            </View>
          </Pressable>
        ) : null}

        {hasVisibleBooks ? (
          <View style={styles.vaultTableBody}>
            {visibleBooks.map((book, index) => (
              <SwipeableVaultRow
                key={book.id}
                book={book}
                isLast={index === visibleBooks.length - 1}
                isOpen={openVaultRowId === book.id}
                onOpen={setOpenVaultRowId}
                onDelete={handleDeleteBook}
              />
            ))}
          </View>
        ) : null}
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
    <SecondaryScreen title="OCR" onBack={() => setScreen("home")}>
      <View style={styles.emptyPanel}>
        <Text style={styles.emptyTitle}>OCR is ready for later.</Text>
        <Text style={styles.emptyText}>
          When you decide what this area should do, we can wire it into search, scan, or visual exploration.
        </Text>
        <Text style={styles.assetHintCard}>Future icon path: {futureAssets.ocrButton}</Text>
      </View>
    </SecondaryScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appChromeColor,
  },
  homeScreen: {
    flex: 1,
    backgroundColor: appChromeColor,
  },
  homeBackground: {
    flex: 1,
  },
  homeBackgroundImage: {
    left: -40,
  },
  homeTouchLayer: {
    flex: 1,
  },
  homeAnimationFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  homeVideoBackground: {
    ...StyleSheet.absoluteFillObject,
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
  brandLogo: {
    width: 250,
    height: 120,
  },
  menuStack: {
    marginTop: 430,
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
    paddingBottom: 120,
    gap: 16,
  },
  bottomBackButton: {
    position: "absolute",
    left: 20,
    bottom: 50,
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
  vaultToolbar: {
    gap: 12,
    backgroundColor: appChromeColor,
  },
  vaultToolbarWrap: {
    backgroundColor: appChromeColor,
    paddingBottom: 12,
  },
  vaultDismissSurface: {
    alignSelf: "stretch",
  },
  vaultResultCount: {
    color: "#A9987E",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  vaultSearchInput: {
    backgroundColor: "#261C13",
    color: "#FFF7EA",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
  },
  vaultTableHeaderWrap: {
    backgroundColor: appChromeColor,
  },
  vaultTableBody: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "rgba(246, 231, 201, 0.08)",
    backgroundColor: "#1A140E",
    overflow: "hidden",
  },
  vaultTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#241A11",
    borderWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  vaultHeaderCell: {
    color: "#E4D2B3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  vaultHeaderCellActive: {
    color: "#FFF7EA",
  },
  vaultHeaderButton: {
    justifyContent: "center",
  },
  vaultHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vaultHeaderArrow: {
    color: "#FFF7EA",
    fontSize: 12,
    fontWeight: "800",
  },
  vaultSwipeRow: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#1A140E",
  },
  vaultSwipeRowLast: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  vaultSwipeActionLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: vaultDeleteRevealWidth,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#471515",
  },
  vaultTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: "#1A140E",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(246, 231, 201, 0.06)",
  },
  vaultTableRowLast: {
    borderBottomWidth: 0,
  },
  vaultTitleColumn: {
    flex: 1.55,
  },
  vaultAuthorColumn: {
    flex: 1,
  },
  vaultCellPrimary: {
    color: "#FFF7EA",
    fontSize: 16,
    fontWeight: "700",
  },
  vaultCellSecondary: {
    marginTop: 5,
    color: "#A9987E",
    fontSize: 13,
    lineHeight: 18,
  },
  vaultCellValue: {
    color: "#D8C8AE",
    fontSize: 14,
    lineHeight: 20,
  },
  vaultDeleteButton: {
    borderRadius: 999,
    minWidth: 76,
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#6F1D1B",
  },
  vaultDeleteButtonLabel: {
    color: "#FEE2E2",
    fontWeight: "700",
  },
});
