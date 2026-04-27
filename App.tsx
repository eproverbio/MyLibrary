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
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import type { RefreshControlProps } from "react-native";
import { createBook, fetchBooks, removeBook, updateBook } from "./src/services/books";
import type { Book, BookStatus } from "./src/types/book";

type Screen = "home" | "vault" | "manual" | "ocr";
type HomeBackgroundMode = "image" | "frames" | "video";
type VaultSortKey = "title" | "author";
type VaultSortDirection = "asc" | "desc";

const bookStatusOptions: BookStatus[] = ["In progress", "Read", "Not Read"];

const emptyDraft = {
  title: "",
  author: "",
  notes: "",
  status: "Not Read" as BookStatus,
  bookmark: "",
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
  refreshControl?: React.ReactElement<RefreshControlProps>;
  children: React.ReactNode;
};

function SecondaryScreen({
  title,
  onBack,
  backPosition = "bottom",
  stickyHeaderIndices,
  onScrollBeginDrag,
  refreshControl,
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
          refreshControl={refreshControl}
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
  onSelect: (book: Book) => void;
};

const vaultDeleteRevealWidth = 104;
const vaultSwipeOpenThreshold = 56;
const vaultSwipeCloseThreshold = 36;
const vaultSwipeVelocityThreshold = 0.35;

function getBookmarkLabel(book: Book) {
  if (book.status !== "In progress" || typeof book.bookmark !== "number") {
    return "—";
  }

  return String(book.bookmark);
}

function getVaultStatusBadgeStyle(status: BookStatus) {
  switch (status) {
    case "In progress":
      return styles.vaultStatusInProgress;
    case "Read":
      return styles.vaultStatusRead;
    default:
      return styles.vaultStatusNotRead;
  }
}

function SwipeableVaultRow({
  book,
  isLast,
  isOpen,
  onOpen,
  onDelete,
  onSelect,
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
        <Pressable onPress={() => onSelect(book)} style={styles.vaultRowPressable}>
          <View style={styles.vaultTitleColumn}>
            <Text numberOfLines={2} style={styles.vaultCellPrimary}>
              {book.title}
            </Text>
          </View>
          <View style={styles.vaultAuthorColumn}>
            <Text numberOfLines={2} style={styles.vaultCellValue}>
              {book.author}
            </Text>
          </View>
        </Pressable>
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
  const [refreshingVault, setRefreshingVault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultSortKey, setVaultSortKey] = useState<VaultSortKey>("title");
  const [vaultSortDirection, setVaultSortDirection] = useState<VaultSortDirection>("asc");
  const [openVaultRowId, setOpenVaultRowId] = useState<string | null>(null);
  const [selectedVaultBookId, setSelectedVaultBookId] = useState<string | null>(null);
  const [isVaultModalEditing, setIsVaultModalEditing] = useState(false);
  const [isVaultModalSaving, setIsVaultModalSaving] = useState(false);
  const [vaultModalDraft, setVaultModalDraft] = useState(emptyDraft);
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

  async function refreshBooks(options?: { showLoading?: boolean }) {
    const showLoading = options?.showLoading ?? true;

    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshingVault(true);
      }

      const nextBooks = await fetchBooks();
      setBooks(nextBooks);
      setOpenVaultRowId((current) =>
        nextBooks.some((book) => book.id === current) ? current : null
      );
      setSelectedVaultBookId((current) =>
        nextBooks.some((book) => book.id === current) ? current : null
      );
    } catch (error) {
      Alert.alert("Database error", error instanceof Error ? error.message : "Unknown error");
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshingVault(false);
      }
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

    if (draft.status === "In progress" && !draft.bookmark.trim()) {
      Alert.alert("Missing bookmark", "Add the last page reached for books in progress.");
      return;
    }

    const parsedBookmark =
      draft.status === "In progress" && draft.bookmark.trim()
        ? Number(draft.bookmark.trim())
        : undefined;

    if (
      draft.status === "In progress" &&
      (!Number.isFinite(parsedBookmark) || (parsedBookmark ?? 0) <= 0)
    ) {
      Alert.alert("Invalid bookmark", "Bookmark must be a page number greater than 0.");
      return;
    }

    try {
      setSaving(true);
      await createBook({
        title: draft.title.trim(),
        author: draft.author.trim(),
        notes: draft.notes.trim(),
        status: draft.status,
        bookmark: parsedBookmark,
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
      setSelectedVaultBookId((current) => (current === id ? null : current));
      setIsVaultModalEditing(false);
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
  const selectedVaultBook =
    selectedVaultBookId !== null ? books.find((book) => book.id === selectedVaultBookId) ?? null : null;

  useEffect(() => {
    if (!selectedVaultBook) {
      setVaultModalDraft(emptyDraft);
      setIsVaultModalEditing(false);
      return;
    }

    setVaultModalDraft({
      title: selectedVaultBook.title,
      author: selectedVaultBook.author,
      notes: selectedVaultBook.notes,
      status: selectedVaultBook.status,
      bookmark:
        selectedVaultBook.status === "In progress" && typeof selectedVaultBook.bookmark === "number"
          ? String(selectedVaultBook.bookmark)
          : "",
    });
  }, [selectedVaultBook]);

  function openVaultBookModal(book: Book) {
    setSelectedVaultBookId(book.id);
    setIsVaultModalEditing(false);
    setOpenVaultRowId(null);
  }

  function closeVaultBookModal() {
    setSelectedVaultBookId(null);
    setIsVaultModalEditing(false);
    setIsVaultModalSaving(false);
  }

  async function handleVaultModalHammerPress() {
    if (!selectedVaultBook) {
      return;
    }

    if (!isVaultModalEditing) {
      setIsVaultModalEditing(true);
      return;
    }

    if (!vaultModalDraft.title.trim() || !vaultModalDraft.author.trim()) {
      Alert.alert("Missing data", "Please add at least a title and an author.");
      return;
    }

    if (vaultModalDraft.status === "In progress" && !vaultModalDraft.bookmark.trim()) {
      Alert.alert("Missing bookmark", "Add the last page reached for books in progress.");
      return;
    }

    const parsedBookmark =
      vaultModalDraft.status === "In progress" && vaultModalDraft.bookmark.trim()
        ? Number(vaultModalDraft.bookmark.trim())
        : undefined;

    if (
      vaultModalDraft.status === "In progress" &&
      (!Number.isFinite(parsedBookmark) || (parsedBookmark ?? 0) <= 0)
    ) {
      Alert.alert("Invalid bookmark", "Bookmark must be a page number greater than 0.");
      return;
    }

    try {
      setIsVaultModalSaving(true);
      await updateBook(selectedVaultBook.id, {
        title: vaultModalDraft.title.trim(),
        author: vaultModalDraft.author.trim(),
        notes: vaultModalDraft.notes.trim(),
        status: vaultModalDraft.status,
        bookmark: parsedBookmark,
      });
      await refreshBooks({ showLoading: false });
      setIsVaultModalEditing(false);
    } catch (error) {
      Alert.alert("Update failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsVaultModalSaving(false);
    }
  }

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
      <>
        <SecondaryScreen
          title="The Vault"
          onBack={() => setScreen("home")}
          backPosition="bottom"
          stickyHeaderIndices={hasVisibleBooks ? [1, 2] : undefined}
          onScrollBeginDrag={dismissOpenVaultRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshingVault}
              onRefresh={() => void refreshBooks({ showLoading: false })}
              tintColor="#E2C38B"
            />
          }
        >
          <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
            <Text style={styles.vaultSubtitle}>All your saved books!</Text>
          </Pressable>

          {hasVisibleBooks ? (
            <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
              <View style={styles.vaultToolbarWrap}>
                <View style={styles.vaultToolbar}>
                  <View style={styles.vaultToolbarHeader}>
                    <Text style={styles.vaultResultCount}>
                      {visibleBooks.length} {visibleBooks.length === 1 ? "result" : "results"}
                    </Text>
                  </View>
                  <TextInput
                    value={vaultSearch}
                    onChangeText={setVaultSearch}
                    placeholder="Search by title or author"
                    placeholderTextColor="#8E7C66"
                    style={styles.vaultSearchInput}
                  />
                </View>
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
              <View style={styles.vaultToolbar}>
                <View style={styles.vaultToolbarHeader}>
                  <Text style={styles.vaultResultCount}>
                    {visibleBooks.length} {visibleBooks.length === 1 ? "result" : "results"}
                  </Text>
                </View>
                <TextInput
                  value={vaultSearch}
                  onChangeText={setVaultSearch}
                  placeholder="Search by title or author"
                  placeholderTextColor="#8E7C66"
                  style={styles.vaultSearchInput}
                />
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
                <Text style={styles.emptyText}>
                  Use Manual from the home screen to add your first book.
                </Text>
              </View>
            </Pressable>
          ) : visibleBooks.length === 0 ? (
            <Pressable onPress={dismissOpenVaultRow} style={styles.vaultDismissSurface}>
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyTitle}>No matches found.</Text>
                <Text style={styles.emptyText}>
                  Try a different title or author in the search bar.
                </Text>
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
                  onSelect={openVaultBookModal}
                />
              ))}
            </View>
          ) : null}
        </SecondaryScreen>

        <Modal
          animationType="fade"
          transparent
          visible={selectedVaultBook !== null}
          onRequestClose={closeVaultBookModal}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={closeVaultBookModal} />
            <View style={styles.vaultModalCard}>
              <View style={styles.vaultModalHeader}>
                <Pressable onPress={closeVaultBookModal} style={styles.vaultModalIconButton}>
                  <Text style={styles.vaultModalIconLabel}>{"<"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleVaultModalHammerPress()}
                  style={[styles.vaultModalIconButton, styles.vaultModalActionButton]}
                  disabled={isVaultModalSaving}
                >
                  <Text style={styles.vaultModalHammerLabel}>
                    {isVaultModalSaving ? "..." : isVaultModalEditing ? "Save" : "Edit"}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.vaultModalBody}
                contentContainerStyle={styles.vaultModalBodyContent}
                keyboardShouldPersistTaps="handled"
              >
                {selectedVaultBook ? (
                  <View style={styles.vaultModalHero}>
                    <Text style={styles.vaultModalEyebrow}>
                      {isVaultModalEditing ? "Editing entry" : "Vault entry"}
                    </Text>
                    <Text style={styles.vaultModalTitle}>
                      {isVaultModalEditing ? vaultModalDraft.title || "Untitled book" : selectedVaultBook.title}
                    </Text>
                    <Text style={styles.vaultModalAuthor}>
                      {isVaultModalEditing ? vaultModalDraft.author || "Unknown author" : selectedVaultBook.author}
                    </Text>


                  </View>
                ) : null}

                {isVaultModalEditing ? (
                  <>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Title</Text>
                      <TextInput
                        value={vaultModalDraft.title}
                        onChangeText={(value) =>
                          setVaultModalDraft((current) => ({ ...current, title: value }))
                        }
                        style={styles.vaultModalInput}
                        placeholder="Title"
                        placeholderTextColor="#8E7C66"
                      />
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Author</Text>
                      <TextInput
                        value={vaultModalDraft.author}
                        onChangeText={(value) =>
                          setVaultModalDraft((current) => ({ ...current, author: value }))
                        }
                        style={styles.vaultModalInput}
                        placeholder="Author"
                        placeholderTextColor="#8E7C66"
                      />
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Status</Text>
                      <View style={styles.statusSelector}>
                        {bookStatusOptions.map((statusOption) => (
                          <Pressable
                            key={statusOption}
                            onPress={() =>
                              setVaultModalDraft((current) => ({
                                ...current,
                                status: statusOption,
                                bookmark: statusOption === "In progress" ? current.bookmark : "",
                              }))
                            }
                            style={[
                              styles.statusOptionButton,
                              vaultModalDraft.status === statusOption &&
                                styles.statusOptionButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusOptionLabel,
                                vaultModalDraft.status === statusOption &&
                                  styles.statusOptionLabelActive,
                              ]}
                            >
                              {statusOption}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    {vaultModalDraft.status === "In progress" ? (
                      <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                        <Text style={styles.vaultModalLabel}>Bookmark</Text>
                        <TextInput
                          value={vaultModalDraft.bookmark}
                          onChangeText={(value) =>
                            setVaultModalDraft((current) => ({
                              ...current,
                              bookmark: value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          style={styles.vaultModalInput}
                          placeholder="Bookmark page"
                          placeholderTextColor="#8E7C66"
                          keyboardType="number-pad"
                        />
                      </View>
                    ) : null}
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Notes</Text>
                      <TextInput
                        value={vaultModalDraft.notes}
                        onChangeText={(value) =>
                          setVaultModalDraft((current) => ({ ...current, notes: value }))
                        }
                        style={[styles.vaultModalInput, styles.vaultModalMultilineInput]}
                        placeholder="Notes"
                        placeholderTextColor="#8E7C66"
                        multiline
                      />
                    </View>
                  </>
                ) : selectedVaultBook ? (
                  <>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Title</Text>
                      <Text style={styles.vaultModalValue}>{selectedVaultBook.title}</Text>
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Author</Text>
                      <Text style={styles.vaultModalValue}>{selectedVaultBook.author}</Text>
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Status</Text>
                      <View
                        style={[
                          styles.vaultStatusBadge,
                          getVaultStatusBadgeStyle(selectedVaultBook.status),
                        ]}
                      >
                        <Text style={styles.vaultStatusBadgeLabel}>{selectedVaultBook.status}</Text>
                      </View>
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Bookmark</Text>
                      <Text style={styles.vaultModalValue}>{getBookmarkLabel(selectedVaultBook)}</Text>
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Notes</Text>
                      <Text style={styles.vaultModalValue}>
                        {selectedVaultBook.notes || "No notes yet."}
                      </Text>
                    </View>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
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
          <View style={styles.statusSelector}>
            {bookStatusOptions.map((statusOption) => (
              <Pressable
                key={statusOption}
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    status: statusOption,
                    bookmark: statusOption === "In progress" ? current.bookmark : "",
                  }))
                }
                style={[
                  styles.statusOptionButton,
                  draft.status === statusOption && styles.statusOptionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.statusOptionLabel,
                    draft.status === statusOption && styles.statusOptionLabelActive,
                  ]}
                >
                  {statusOption}
                </Text>
              </Pressable>
            ))}
          </View>
          {draft.status === "In progress" ? (
            <TextInput
              placeholder="Bookmark page"
              placeholderTextColor="#9AA7B8"
              value={draft.bookmark}
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  bookmark: value.replace(/[^0-9]/g, ""),
                }))
              }
              keyboardType="number-pad"
              style={styles.input}
            />
          ) : null}
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
    marginTop: 38,
    marginBottom: 10,
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
  statusSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusOptionButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
    backgroundColor: "#261C13",
  },
  statusOptionButtonActive: {
    borderColor: "#D1A157",
    backgroundColor: "rgba(209, 161, 87, 0.18)",
  },
  statusOptionLabel: {
    color: "#D8C8AE",
    fontWeight: "600",
  },
  statusOptionLabelActive: {
    color: "#FFF7EA",
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
  vaultToolbarHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: -2,
  },
  vaultToolbarWrap: {
    backgroundColor: appChromeColor,
    paddingBottom: 12,
  },
  vaultDismissSurface: {
    alignSelf: "stretch",
  },
  vaultSubtitle: {
    color: "#D8C8AE",
    fontSize: 15,
    lineHeight: 22,
    marginTop: -4,
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
    backgroundColor: "#1A140E",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(246, 231, 201, 0.06)",
  },
  vaultTableRowLast: {
    borderBottomWidth: 0,
  },
  vaultRowPressable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  vaultTitleColumn: {
    flex: 1.4,
  },
  vaultAuthorColumn: {
    flex: 1,
  },
  vaultStatusColumn: {
    flex: 1,
  },
  vaultBookmarkColumn: {
    flex: 0.65,
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
  vaultStatusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  vaultStatusBadgeLabel: {
    color: "#FFF7EA",
    fontSize: 12,
    fontWeight: "700",
  },
  vaultStatusInProgress: {
    backgroundColor: "rgba(217, 119, 6, 0.18)",
    borderColor: "rgba(245, 158, 11, 0.35)",
  },
  vaultStatusRead: {
    backgroundColor: "rgba(22, 101, 52, 0.2)",
    borderColor: "rgba(74, 222, 128, 0.28)",
  },
  vaultStatusNotRead: {
    backgroundColor: "rgba(71, 85, 105, 0.22)",
    borderColor: "rgba(148, 163, 184, 0.26)",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 5, 3, 0.8)",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  vaultModalCard: {
    maxHeight: "76%",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.14)",
    backgroundColor: "#140F0A",
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
    overflow: "hidden",
  },
  vaultModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  vaultModalIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246, 231, 201, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.14)",
  },
  vaultModalActionButton: {
    width: "auto",
    minWidth: 64,
    paddingHorizontal: 14,
  },
  vaultModalIconLabel: {
    color: "#F6E7C9",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "600",
  },
  vaultModalHammerLabel: {
    color: "#F6E7C9",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  vaultModalBody: {
    flexShrink: 1,
  },
  vaultModalBodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 10,
  },
  vaultModalHero: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#1D160F",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    gap: 4,
  },
  vaultModalEyebrow: {
    color: "#C9A66B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  vaultModalTitle: {
    color: "#FFF7EA",
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
  },
  vaultModalAuthor: {
    color: "#DCC8A7",
    fontSize: 15,
    lineHeight: 21,
  },
  vaultModalField: {
    gap: 6,
  },
  vaultModalFieldCard: {
    padding: 13,
    borderRadius: 16,
    backgroundColor: "#1A140E",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
  },
  vaultModalLabel: {
    color: "#A9987E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  vaultModalValue: {
    color: "#FFF7EA",
    fontSize: 16,
    lineHeight: 23,
  },
  vaultModalInput: {
    backgroundColor: "#261C13",
    color: "#FFF7EA",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    fontSize: 15,
  },
  vaultModalMultilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
});

