import { useEffect, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { extractBooksFromCoverImage, resolveOcrVaultMatch } from "./src/services/ocr";
import type { Book, BookStatus } from "./src/types/book";
import type { OcrCandidate, OcrConfidence, OcrMatchType } from "./src/types/ocr";

type Screen = "home" | "vault" | "manual" | "ocr";
type HomeBackgroundMode = "image" | "frames" | "video";
type VaultSortKey = "title" | "author";
type VaultSortDirection = "asc" | "desc";
type VaultStatusFilter = "All" | BookStatus;
type GenrePickerTarget = "manual" | "vault" | null;
type OcrRowStatus = "review" | "added";

type OcrReviewRow = OcrCandidate & {
  rowStatus: OcrRowStatus;
  isSaving: boolean;
  errorMessage: string;
};

const bookStatusOptions: BookStatus[] = ["In progress", "Read", "Not Read"];
const literaryGenreOptions = [
  "",
  "Action",
  "Adventure",
  "Allegory",
  "Alternate history",
  "Anthology",
  "Apocalyptic",
  "Art book",
  "Autobiography",
  "Bildungsroman",
  "Biography",
  "Campus novel",
  "Children's",
  "Classic",
  "Coming-of-age",
  "Comedy",
  "Contemporary",
  "Crime",
  "Cyberpunk",
  "Dark fantasy",
  "Detective",
  "Dystopian",
  "Drama",
  "Epic",
  "Epistolary",
  "Essay",
  "Fairy tale",
  "Family saga",
  "Fantasy",
  "Feminist fiction",
  "Folklore",
  "Gothic",
  "Graphic novel",
  "Hard science fiction",
  "Historical fiction",
  "Horror",
  "Humor",
  "Literary fiction",
  "Magical realism",
  "Memoir",
  "Metafiction",
  "Middle grade",
  "Military fiction",
  "Mystery",
  "Mythology",
  "Noir",
  "Novella",
  "Paranormal",
  "Philosophical fiction",
  "Poetry",
  "Political fiction",
  "Post-apocalyptic",
  "Psychological thriller",
  "Romance",
  "Satire",
  "Science fiction",
  "Self-help",
  "Short stories",
  "Slice of life",
  "Social commentary",
  "Space opera",
  "Speculative fiction",
  "Steampunk",
  "Suspense",
  "Thriller",
  "Travel writing",
  "True crime",
  "Urban fantasy",
  "Utopian",
  "War",
  "Western",
  "Women's fiction",
  "Young adult",
] as const;

const emptyDraft = {
  title: "",
  author: "",
  edition: "",
  genre: "",
  notes: "",
  status: "Not Read" as BookStatus,
  bookmark: "",
};

const homeBackgroundImage = require("./assets/ui/home-background.png");
const homeLogoImage = require("./assets/ui/logo-mylibrary.png");
const rewardCoinPreviewImage = require("./assets_pipeline/outputs/png/coin_icon.png");
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
  rewardCoinPreview: "assets_pipeline/outputs/png/coin_icon.png",
  rewardCoinModelAndroid: "android/app/src/main/assets/models/coin.glb",
};

function parseGenreValue(value: string) {
  return value
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
}

function formatGenreValue(genres: string[]) {
  return genres.join(", ");
}

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
          <View style={styles.vaultRowTop}>
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
          </View>
          <View style={styles.vaultGenreRow}>
            <Text numberOfLines={1} style={styles.vaultCellSecondary}>
              {book.genre || ""}
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
  const [vaultStatusFilter, setVaultStatusFilter] = useState<VaultStatusFilter>("All");
  const [isVaultStatusMenuOpen, setIsVaultStatusMenuOpen] = useState(false);
  const [vaultSortKey, setVaultSortKey] = useState<VaultSortKey>("title");
  const [vaultSortDirection, setVaultSortDirection] = useState<VaultSortDirection>("asc");
  const [openVaultRowId, setOpenVaultRowId] = useState<string | null>(null);
  const [selectedVaultBookId, setSelectedVaultBookId] = useState<string | null>(null);
  const [isVaultModalEditing, setIsVaultModalEditing] = useState(false);
  const [isVaultModalSaving, setIsVaultModalSaving] = useState(false);
  const [vaultModalDraft, setVaultModalDraft] = useState(emptyDraft);
  const [genrePickerTarget, setGenrePickerTarget] = useState<GenrePickerTarget>(null);
  const [genrePickerSelection, setGenrePickerSelection] = useState<string[]>([]);
  const [duplicateBookWarningTarget, setDuplicateBookWarningTarget] = useState<Book | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [ocrRows, setOcrRows] = useState<OcrReviewRow[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isOcrCameraReady, setIsOcrCameraReady] = useState(false);
  const homeButtonsAnimation = useRef(
    new Animated.Value(areHomeButtonsInitiallyVisible ? 1 : 0)
  ).current;
  const ocrCameraRef = useRef<CameraView | null>(null);

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
    if (screen !== "ocr") {
      return;
    }

    if (cameraPermission?.granted) {
      return;
    }

    if (cameraPermission && cameraPermission.canAskAgain === false) {
      return;
    }

    void requestCameraPermission();
  }, [screen, cameraPermission, requestCameraPermission]);

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

    const duplicateBook = findDuplicateBook(draft.title, draft.author);
    if (duplicateBook) {
      showDuplicateBookWarning(duplicateBook);
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
        edition: draft.edition.trim(),
        genre: draft.genre.trim(),
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

  function handleVaultStatusFilterChange(nextFilter: VaultStatusFilter) {
    setVaultStatusFilter(nextFilter);
    setIsVaultStatusMenuOpen(false);
  }

  function openGenrePicker(target: Exclude<GenrePickerTarget, null>) {
    const currentGenre = target === "manual" ? draft.genre : vaultModalDraft.genre;
    setGenrePickerSelection(parseGenreValue(currentGenre));
    setGenrePickerTarget(target);
  }

  function closeGenrePicker() {
    setGenrePickerTarget(null);
    setGenrePickerSelection([]);
  }

  function handleGenreToggle(genre: string) {
    if (!genre) {
      setGenrePickerSelection([]);
      return;
    }

    setGenrePickerSelection((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]
    );
  }

  function applyGenrePickerSelection() {
    const genre = formatGenreValue(genrePickerSelection);

    if (genrePickerTarget === "manual") {
      setDraft((current) => ({ ...current, genre }));
    }

    if (genrePickerTarget === "vault") {
      setVaultModalDraft((current) => ({ ...current, genre }));
    }

    closeGenrePicker();
  }

  function getGenrePickerLabel(value: string) {
    return value || "Select genre";
  }

  function findDuplicateBook(title: string, author: string, excludeId?: string) {
    const normalizedTitle = title.trim().toLowerCase();
    const normalizedAuthor = author.trim().toLowerCase();

    return books.find((book) => {
      if (excludeId && book.id === excludeId) {
        return false;
      }

      return (
        book.title.trim().toLowerCase() === normalizedTitle &&
        book.author.trim().toLowerCase() === normalizedAuthor
      );
    });
  }

  function openExistingBookCard(book: Book) {
    setDuplicateBookWarningTarget(null);
    setIsVaultModalEditing(false);
    setOpenVaultRowId(null);
    setSelectedVaultBookId(book.id);
    setScreen("vault");
  }

  function showDuplicateBookWarning(book: Book) {
    setDuplicateBookWarningTarget(book);
  }

  function getOcrRowMatch(row: Pick<OcrReviewRow, "title" | "author" | "edition">) {
    return resolveOcrVaultMatch(row, books);
  }

  function getOcrMatchTone(matchType: OcrMatchType) {
    switch (matchType) {
      case "exact":
        return {
          label: "Gia presente nel Vault",
          containerStyle: styles.ocrResultDuplicate,
          badgeStyle: styles.ocrResultDuplicateBadge,
          badgeLabelStyle: styles.ocrResultDuplicateBadgeLabel,
        };
      case "title-author":
        return {
          label: "Possibile match nel Vault",
          containerStyle: styles.ocrResultPossibleDuplicate,
          badgeStyle: styles.ocrResultPossibleDuplicateBadge,
          badgeLabelStyle: styles.ocrResultPossibleDuplicateBadgeLabel,
        };
      default:
        return {
          label: "Nuovo libro",
          containerStyle: styles.ocrResultNew,
          badgeStyle: styles.ocrResultNewBadge,
          badgeLabelStyle: styles.ocrResultNewBadgeLabel,
        };
    }
  }

  function getOcrConfidenceLabel(confidence: OcrConfidence) {
    switch (confidence) {
      case "high":
        return "Alta";
      case "medium":
        return "Media";
      default:
        return "Bassa";
    }
  }

  function updateOcrRow(id: string, updater: (row: OcrReviewRow) => OcrReviewRow) {
    setOcrRows((current) => current.map((row) => (row.id === id ? updater(row) : row)));
  }

  function handleOcrRowFieldChange(
    id: string,
    field: "title" | "author" | "edition" | "genre",
    value: string
  ) {
    updateOcrRow(id, (row) => ({
      ...row,
      [field]: value,
      errorMessage: "",
    }));
  }

  function resetOcrSession() {
    setOcrRows([]);
    setIsOcrProcessing(false);
  }

  async function handleRunOcrExtraction() {
    if (!cameraPermission?.granted) {
      Alert.alert("Camera unavailable", "Allow camera access before starting the OCR flow.");
      return;
    }

    if (!ocrCameraRef.current || !isOcrCameraReady) {
      Alert.alert("Camera not ready", "Wait a moment for the preview to initialize and try again.");
      return;
    }

    try {
      setIsOcrProcessing(true);
      const capturedImage = await ocrCameraRef.current.takePictureAsync({
        quality: 0.7,
        shutterSound: false,
      });
      const extractedBooks = await extractBooksFromCoverImage(
        {
          uri: capturedImage.uri,
          width: capturedImage.width,
          height: capturedImage.height,
          format: capturedImage.format,
          capturedAt: Date.now(),
        },
        books
      );
      setOcrRows(
        extractedBooks.map((candidate) => ({
          ...candidate,
          rowStatus: "review",
          isSaving: false,
          errorMessage: "",
        }))
      );
    } catch (error) {
      Alert.alert(
        "OCR unavailable",
        error instanceof Error ? error.message : "Unknown OCR extraction error"
      );
    } finally {
      setIsOcrProcessing(false);
    }
  }

  async function handleAddOcrRowToVault(rowId: string) {
    const row = ocrRows.find((currentRow) => currentRow.id === rowId);

    if (!row) {
      return;
    }

    if (!row.title.trim() || !row.author.trim()) {
      updateOcrRow(rowId, (currentRow) => ({
        ...currentRow,
        errorMessage: "Titolo e autore sono obbligatori prima del salvataggio.",
      }));
      return;
    }

    const match = getOcrRowMatch(row);
    if (match.matchType === "exact" && match.matchedBook) {
      showDuplicateBookWarning(match.matchedBook);
      return;
    }

    updateOcrRow(rowId, (currentRow) => ({
      ...currentRow,
      isSaving: true,
      errorMessage: "",
    }));

    try {
      await createBook({
        title: row.title.trim(),
        author: row.author.trim(),
        edition: row.edition.trim(),
        genre: row.genre.trim(),
        notes: "",
        status: "Not Read",
      });

      await refreshBooks({ showLoading: false });

      updateOcrRow(rowId, (currentRow) => ({
        ...currentRow,
        rowStatus: "added",
        isSaving: false,
        errorMessage: "",
      }));
    } catch (error) {
      updateOcrRow(rowId, (currentRow) => ({
        ...currentRow,
        isSaving: false,
        errorMessage: error instanceof Error ? error.message : "Save failed",
      }));
    }
  }

  function handleOpenOcrMatchedBook(row: OcrReviewRow) {
    const match = getOcrRowMatch(row);

    if (!match.matchedBook) {
      return;
    }

    openExistingBookCard(match.matchedBook);
  }

  function renderDuplicateWarningModal() {
    return (
      <Modal
        animationType="fade"
        transparent
        visible={duplicateBookWarningTarget !== null}
        onRequestClose={() => setDuplicateBookWarningTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDuplicateBookWarningTarget(null)}
          />
          <View style={styles.duplicateWarningCard}>
            <Text style={styles.duplicateWarningEyebrow}>Warning</Text>
            <Text style={styles.duplicateWarningTitle}>Duplicate book</Text>
            <Text style={styles.duplicateWarningText}>
              A book with the same title and author is already in your Vault.
            </Text>
            <View style={styles.duplicateWarningMeta}>
              <Text style={styles.duplicateWarningMetaLabel}>
                {duplicateBookWarningTarget?.title || ""}
              </Text>
              <Text style={styles.duplicateWarningMetaValue}>
                {duplicateBookWarningTarget?.author || ""}
              </Text>
            </View>
            <View style={styles.duplicateWarningActions}>
              <Pressable
                onPress={() => setDuplicateBookWarningTarget(null)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  duplicateBookWarningTarget
                    ? openExistingBookCard(duplicateBookWarningTarget)
                    : null
                }
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonLabel}>Open card</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const normalizedSearch = vaultSearch.trim().toLowerCase();
  const visibleBooks = [...books]
    .filter((book) => {
      if (!normalizedSearch) {
        return vaultStatusFilter === "All" ? true : book.status === vaultStatusFilter;
      }

      const haystack = `${book.title} ${book.author} ${book.edition} ${book.genre}`.toLowerCase();
      const matchesSearch = haystack.includes(normalizedSearch);
      const matchesStatus = vaultStatusFilter === "All" ? true : book.status === vaultStatusFilter;
      return matchesSearch && matchesStatus;
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
  const ocrRowsWithMatch = ocrRows.map((row) => ({
    row,
    match: getOcrRowMatch(row),
  }));
  const exactOcrMatchesCount = ocrRowsWithMatch.filter(
    ({ match }) => match.matchType === "exact"
  ).length;
  const possibleOcrMatchesCount = ocrRowsWithMatch.filter(
    ({ match }) => match.matchType === "title-author"
  ).length;
  const newOcrRowsCount = ocrRowsWithMatch.filter(({ match }) => match.matchType === "none").length;

  useEffect(() => {
    if (!selectedVaultBook) {
      setVaultModalDraft(emptyDraft);
      setIsVaultModalEditing(false);
      return;
    }

    setVaultModalDraft({
      title: selectedVaultBook.title,
      author: selectedVaultBook.author,
      edition: selectedVaultBook.edition,
      genre: selectedVaultBook.genre,
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

    const duplicateBook = findDuplicateBook(
      vaultModalDraft.title,
      vaultModalDraft.author,
      selectedVaultBook.id
    );
    if (duplicateBook) {
      showDuplicateBookWarning(duplicateBook);
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
        edition: vaultModalDraft.edition.trim(),
        genre: vaultModalDraft.genre.trim(),
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

              <View style={styles.generatedAssetCard}>
                <Image
                  source={rewardCoinPreviewImage}
                  resizeMode="contain"
                  style={styles.generatedAssetPreview}
                />
                <View style={styles.generatedAssetCopy}>
                  <Text style={styles.generatedAssetEyebrow}>Generated asset</Text>
                  <Text style={styles.generatedAssetTitle}>Reward Coin</Text>
                  <Text style={styles.generatedAssetBody}>
                    PNG preview loaded in React Native. Matching GLB exported to Android native
                    assets for future 3D use.
                  </Text>
                </View>
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
                    label="Add Book"
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
      setIsVaultStatusMenuOpen(false);
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
                  <View style={styles.vaultSearchRow}>
                    <TextInput
                      value={vaultSearch}
                      onChangeText={setVaultSearch}
                      placeholder="Search by title, author or genre"
                      placeholderTextColor="#8E7C66"
                      style={styles.vaultSearchInput}
                    />
                    <View style={styles.vaultFilterWrap}>
                      <Pressable
                        onPress={() => setIsVaultStatusMenuOpen((current) => !current)}
                        style={styles.vaultFilterButton}
                      >
                        <Text style={styles.vaultFilterLabel} numberOfLines={1}>
                          {vaultStatusFilter}
                        </Text>
                        <Text style={styles.vaultFilterCaret}>
                          {isVaultStatusMenuOpen ? "↑" : "↓"}
                        </Text>
                      </Pressable>
                      {isVaultStatusMenuOpen ? (
                        <View style={styles.vaultFilterMenu}>
                          {(["All", ...bookStatusOptions] as VaultStatusFilter[]).map((option) => (
                            <Pressable
                              key={option}
                              onPress={() => handleVaultStatusFilterChange(option)}
                              style={[
                                styles.vaultFilterOption,
                                vaultStatusFilter === option && styles.vaultFilterOptionActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.vaultFilterOptionLabel,
                                  vaultStatusFilter === option &&
                                    styles.vaultFilterOptionLabelActive,
                                ]}
                              >
                                {option}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
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
                <View style={styles.vaultSearchRow}>
                  <TextInput
                    value={vaultSearch}
                    onChangeText={setVaultSearch}
                    placeholder="Search by title, author or genre"
                    placeholderTextColor="#8E7C66"
                    style={styles.vaultSearchInput}
                  />
                  <View
                    style={[
                      styles.vaultFilterWrap,
                      isVaultStatusMenuOpen && styles.vaultFilterWrapRaised,
                    ]}
                  >
                    <Pressable
                      onPress={() => setIsVaultStatusMenuOpen((current) => !current)}
                      style={styles.vaultFilterButton}
                    >
                      <Text style={styles.vaultFilterLabel} numberOfLines={1}>
                        {vaultStatusFilter}
                      </Text>
                      <Text style={styles.vaultFilterCaret}>
                        {isVaultStatusMenuOpen ? "↑" : "↓"}
                      </Text>
                    </Pressable>
                    {isVaultStatusMenuOpen ? (
                      <View style={styles.vaultFilterMenu}>
                        {(["All", ...bookStatusOptions] as VaultStatusFilter[]).map((option) => (
                          <Pressable
                            key={option}
                            onPress={() => handleVaultStatusFilterChange(option)}
                            style={[
                              styles.vaultFilterOption,
                              vaultStatusFilter === option && styles.vaultFilterOptionActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.vaultFilterOptionLabel,
                                vaultStatusFilter === option &&
                                  styles.vaultFilterOptionLabelActive,
                              ]}
                            >
                              {option}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
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
          visible={genrePickerTarget !== null}
          onRequestClose={closeGenrePicker}
        >
          <View style={styles.genrePickerModalOverlay}>
            <Pressable style={styles.genrePickerModalBackdrop} onPress={closeGenrePicker} />
            <View style={styles.genrePickerModalCard}>
              <View style={styles.genrePickerModalHeader}>
                <Text style={styles.genrePickerModalTitle}>Select Genre</Text>
                <Text style={styles.genrePickerModalSubtitle}>
                  {genrePickerSelection.length === 0
                    ? "No genre selected"
                    : `${genrePickerSelection.length} selected`}
                </Text>
              </View>
              <ScrollView
                style={styles.genrePickerModalList}
                contentContainerStyle={styles.genrePickerModalListContent}
                keyboardShouldPersistTaps="handled"
              >
                {literaryGenreOptions.map((option) => {
                  const isActive = option === ""
                    ? genrePickerSelection.length === 0
                    : genrePickerSelection.includes(option);

                  return (
                    <Pressable
                      key={option || "__empty_genre__"}
                      onPress={() => handleGenreToggle(option)}
                      style={[styles.genrePickerOption, isActive && styles.genrePickerOptionActive]}
                    >
                      <View style={styles.genrePickerOptionRow}>
                        <Text
                          style={[
                            styles.genrePickerOptionLabel,
                            isActive && styles.genrePickerOptionLabelActive,
                          ]}
                        >
                          {option || "No genre"}
                        </Text>
                        <Text
                          style={[
                            styles.genrePickerOptionCheck,
                            isActive && styles.genrePickerOptionCheckActive,
                          ]}
                        >
                          {isActive ? "Selected" : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.genrePickerActions}>
                <Pressable onPress={() => setGenrePickerSelection([])} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>Clear</Text>
                </Pressable>
                <Pressable onPress={applyGenrePickerSelection} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonLabel}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {renderDuplicateWarningModal()}

        <Modal
          animationType="fade"
          transparent
          visible={isVaultStatusMenuOpen}
          onRequestClose={() => setIsVaultStatusMenuOpen(false)}
        >
          <View style={styles.vaultFilterModalOverlay}>
            <Pressable
              style={styles.vaultFilterModalBackdrop}
              onPress={() => setIsVaultStatusMenuOpen(false)}
            />
            <View style={styles.vaultFilterModalCard}>
              {(["All", ...bookStatusOptions] as VaultStatusFilter[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => handleVaultStatusFilterChange(option)}
                  style={[
                    styles.vaultFilterOption,
                    vaultStatusFilter === option && styles.vaultFilterOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.vaultFilterOptionLabel,
                      vaultStatusFilter === option && styles.vaultFilterOptionLabelActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

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
                    <Text style={styles.vaultModalEdition}>
                      {isVaultModalEditing
                        ? vaultModalDraft.edition || ""
                        : selectedVaultBook.edition || ""}
                    </Text>
                    <Text style={styles.vaultModalEdition}>
                      {isVaultModalEditing
                        ? vaultModalDraft.genre || ""
                        : selectedVaultBook.genre || ""}
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
                      <Text style={styles.vaultModalLabel}>Edition</Text>
                      <TextInput
                        value={vaultModalDraft.edition}
                        onChangeText={(value) =>
                          setVaultModalDraft((current) => ({ ...current, edition: value }))
                        }
                        style={styles.vaultModalInput}
                        placeholder="Edition"
                        placeholderTextColor="#8E7C66"
                      />
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Genre</Text>
                      <Pressable
                        onPress={() => openGenrePicker("vault")}
                        style={styles.genrePickerButton}
                      >
                        <Text
                          style={[
                            styles.genrePickerLabel,
                            !vaultModalDraft.genre && styles.genrePickerPlaceholder,
                          ]}
                        >
                          {getGenrePickerLabel(vaultModalDraft.genre)}
                        </Text>
                      </Pressable>
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
                      <Text style={styles.vaultModalLabel}>Edition</Text>
                      <Text style={styles.vaultModalValue}>{selectedVaultBook.edition || ""}</Text>
                    </View>
                    <View style={[styles.vaultModalField, styles.vaultModalFieldCard]}>
                      <Text style={styles.vaultModalLabel}>Genre</Text>
                      <Text style={styles.vaultModalValue}>{selectedVaultBook.genre || ""}</Text>
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
      <>
        <SecondaryScreen title="Add Book" onBack={() => setScreen("home")}>
          <Text style={styles.vaultSubtitle}>This book will be a fine addiction to my Vault!!!</Text>

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
              placeholder="Edition"
              placeholderTextColor="#9AA7B8"
              value={draft.edition}
              onChangeText={(value) => setDraft((current) => ({ ...current, edition: value }))}
              style={styles.input}
            />
            <Pressable onPress={() => openGenrePicker("manual")} style={styles.genrePickerButton}>
              <Text
                style={[
                  styles.genrePickerLabel,
                  !draft.genre && styles.genrePickerPlaceholder,
                ]}
              >
                {getGenrePickerLabel(draft.genre)}
              </Text>
            </Pressable>
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
              <Text style={styles.primaryButtonLabel}>
                {saving ? "Saving..." : "Save to The Vault"}
              </Text>
            </Pressable>
          </View>
        </SecondaryScreen>
        {renderDuplicateWarningModal()}
      </>
    );
  }

  return (
    <SecondaryScreen title="OCR" onBack={() => setScreen("home")}>
      <Text style={styles.vaultSubtitle}>
        Scansiona una o piu copertine, controlla i campi estratti e aggiungi solo i libri che vuoi
        davvero salvare.
      </Text>
      <View style={styles.infoPanel}>
        <Text style={styles.panelHeading}>Flusso OCR</Text>
        <Text style={styles.panelCopy}>
          1. Scattiamo una foto e la lasciamo in cache temporanea. 2. Passiamo l&apos;immagine alla
          pipeline OCR per estrarre i campi di ogni copertina. 3. Incrociamo ogni riga con il
          Vault usando titolo, autore ed edizione, mantenendo il confronto visivo che avete gia.
        </Text>
        <Text style={styles.panelCopy}>
          Il campo genere rimane vuoto per ora, cosi possiamo completarlo piu avanti con una
          ricerca dedicata.
        </Text>
      </View>
      {cameraPermission?.granted ? (
        <View style={styles.ocrCameraCard}>
          <CameraView
            ref={ocrCameraRef}
            facing="back"
            style={styles.ocrCameraPreview}
            onCameraReady={() => setIsOcrCameraReady(true)}
          />
          <View pointerEvents="none" style={styles.ocrGuideFrame}>
            <View style={[styles.ocrGuideCorner, styles.ocrGuideCornerTopLeft]} />
            <View style={[styles.ocrGuideCorner, styles.ocrGuideCornerTopRight]} />
            <View style={[styles.ocrGuideCorner, styles.ocrGuideCornerBottomLeft]} />
            <View style={[styles.ocrGuideCorner, styles.ocrGuideCornerBottomRight]} />
          </View>
          <View style={styles.ocrCameraOverlay}>
            <Text style={styles.ocrCameraOverlayTitle}>Allinea la copertina dentro la guida</Text>
            <Text style={styles.ocrCameraOverlayText}>
              Puoi inquadrare uno o piu libri insieme
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Camera access needed.</Text>
          <Text style={styles.emptyText}>
            Allow camera access to start scanning pages for OCR.
          </Text>
          <Pressable onPress={() => void requestCameraPermission()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Allow camera</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.formPanel}>
        <Text style={styles.panelHeading}>Sessione di estrazione</Text>
        <Text style={styles.panelCopy}>
          Per adesso il motore OCR usa un adapter mockato: il flusso completo e il confronto col
          Vault sono gia pronti, cosi il vero OCR si potra innestare qui senza rifare l’interfaccia.
        </Text>
        <View style={styles.ocrActionRow}>
          <Pressable
            onPress={() => void handleRunOcrExtraction()}
            style={[styles.primaryButton, styles.ocrPrimaryAction]}
            disabled={isOcrProcessing || !isOcrCameraReady}
          >
            <Text style={styles.primaryButtonLabel}>
              {isOcrProcessing
                ? "Scatto e analisi in corso..."
                : isOcrCameraReady
                  ? "Scatta e analizza"
                  : "Avvio camera..."}
            </Text>
          </Pressable>
          {ocrRows.length > 0 ? (
            <Pressable onPress={resetOcrSession} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Resetta sessione</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {isOcrProcessing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#E2C38B" />
          <Text style={styles.loadingText}>Sto preparando le righe OCR da revisionare.</Text>
        </View>
      ) : null}
      {ocrRows.length > 0 ? (
        <View style={styles.formPanel}>
          <Text style={styles.panelHeading}>Review estrazione</Text>
          <Text style={styles.panelCopy}>
            {ocrRows.length} righe trovate. {exactOcrMatchesCount} gia nel Vault,{" "}
            {possibleOcrMatchesCount} da verificare, {newOcrRowsCount} nuove.
          </Text>
          <View style={styles.ocrLegendRow}>
            <View style={[styles.ocrLegendChip, styles.ocrLegendDuplicateChip]}>
              <Text style={styles.ocrLegendLabel}>Gia presente</Text>
            </View>
            <View style={[styles.ocrLegendChip, styles.ocrLegendPossibleChip]}>
              <Text style={styles.ocrLegendLabel}>Possibile match</Text>
            </View>
            <View style={[styles.ocrLegendChip, styles.ocrLegendNewChip]}>
              <Text style={styles.ocrLegendLabel}>Nuovo</Text>
            </View>
          </View>
          {ocrRowsWithMatch.map(({ row, match }) => {
            const tone = getOcrMatchTone(match.matchType);

            return (
              <View
                key={row.id}
                style={[
                  styles.ocrResultCard,
                  tone.containerStyle,
                  row.rowStatus === "added" && styles.ocrResultAdded,
                ]}
              >
                <View style={styles.ocrResultHeader}>
                  <View style={styles.ocrResultHeaderCopy}>
                    <Text style={styles.ocrResultSource}>{row.sourceLabel}</Text>
                    <Text style={styles.ocrResultConfidence}>
                      Confidenza OCR: {getOcrConfidenceLabel(row.confidence)}
                    </Text>
                  </View>
                  <View style={[styles.ocrResultBadge, tone.badgeStyle]}>
                    <Text style={[styles.ocrResultBadgeLabel, tone.badgeLabelStyle]}>
                      {row.rowStatus === "added" ? "Aggiunto" : tone.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.ocrFieldGroup}>
                  <Text style={styles.vaultModalLabel}>Titolo</Text>
                  <TextInput
                    value={row.title}
                    onChangeText={(value) => handleOcrRowFieldChange(row.id, "title", value)}
                    placeholder="Titolo"
                    placeholderTextColor="#8E7C66"
                    style={styles.vaultModalInput}
                    editable={!row.isSaving && row.rowStatus !== "added"}
                  />
                </View>
                <View style={styles.ocrFieldGroup}>
                  <Text style={styles.vaultModalLabel}>Autore</Text>
                  <TextInput
                    value={row.author}
                    onChangeText={(value) => handleOcrRowFieldChange(row.id, "author", value)}
                    placeholder="Autore"
                    placeholderTextColor="#8E7C66"
                    style={styles.vaultModalInput}
                    editable={!row.isSaving && row.rowStatus !== "added"}
                  />
                </View>
                <View style={styles.ocrFieldGroup}>
                  <Text style={styles.vaultModalLabel}>Edizione</Text>
                  <TextInput
                    value={row.edition}
                    onChangeText={(value) => handleOcrRowFieldChange(row.id, "edition", value)}
                    placeholder="Edizione"
                    placeholderTextColor="#8E7C66"
                    style={styles.vaultModalInput}
                    editable={!row.isSaving && row.rowStatus !== "added"}
                  />
                </View>
                <View style={styles.ocrFieldGroup}>
                  <Text style={styles.vaultModalLabel}>Genere</Text>
                  <TextInput
                    value={row.genre}
                    onChangeText={(value) => handleOcrRowFieldChange(row.id, "genre", value)}
                    placeholder="Lasciato vuoto per ora"
                    placeholderTextColor="#8E7C66"
                    style={styles.vaultModalInput}
                    editable={!row.isSaving && row.rowStatus !== "added"}
                  />
                </View>
                {match.matchedBook ? (
                  <View style={styles.ocrMatchInfoCard}>
                    <Text style={styles.ocrMatchInfoTitle}>
                      {match.matchType === "exact"
                        ? "Match trovato nel Vault"
                        : "Possibile libro gia presente"}
                    </Text>
                    <Text style={styles.ocrMatchInfoText}>
                      {match.matchedBook.title} · {match.matchedBook.author}
                    </Text>
                    <Text style={styles.ocrMatchInfoText}>
                      {match.matchedBook.edition || "Edizione non valorizzata"}
                    </Text>
                  </View>
                ) : null}
                {row.errorMessage ? (
                  <Text style={styles.ocrErrorText}>{row.errorMessage}</Text>
                ) : null}
                <View style={styles.ocrResultActions}>
                  {match.matchedBook ? (
                    <Pressable
                      onPress={() => handleOpenOcrMatchedBook(row)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonLabel}>Apri nel Vault</Text>
                    </Pressable>
                  ) : null}
                  {row.rowStatus !== "added" ? (
                    <Pressable
                      onPress={() => void handleAddOcrRowToVault(row.id)}
                      style={styles.primaryButton}
                      disabled={row.isSaving}
                    >
                      <Text style={styles.primaryButtonLabel}>
                        {row.isSaving ? "Salvataggio..." : "Aggiungi al Vault"}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.ocrSavedPill}>
                      <Text style={styles.ocrSavedPillLabel}>Salvato</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
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
  generatedAssetCard: {
    marginTop: 18,
    alignSelf: "flex-end",
    maxWidth: 252,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
    backgroundColor: "rgba(20, 15, 10, 0.76)",
  },
  generatedAssetPreview: {
    width: 54,
    height: 54,
  },
  generatedAssetCopy: {
    flex: 1,
    gap: 2,
  },
  generatedAssetEyebrow: {
    color: "#D1A157",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  generatedAssetTitle: {
    color: "#FFF7EA",
    fontSize: 16,
    fontWeight: "800",
  },
  generatedAssetBody: {
    color: "#CBB89A",
    fontSize: 12,
    lineHeight: 17,
  },
  menuStack: {
    marginTop: 360,
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
  genrePickerButton: {
    backgroundColor: "#261C13",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
  },
  genrePickerLabel: {
    color: "#FFF7EA",
    fontSize: 15,
  },
  genrePickerPlaceholder: {
    color: "#8E7C66",
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
  ocrCameraCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    backgroundColor: "#1A140E",
    overflow: "hidden",
    minHeight: 420,
  },
  ocrCameraPreview: {
    width: "100%",
    minHeight: 420,
    backgroundColor: "#120D09",
  },
  ocrGuideFrame: {
    position: "absolute",
    top: 52,
    left: 28,
    right: 28,
    bottom: 92,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.18)",
    backgroundColor: "rgba(246, 231, 201, 0.03)",
  },
  ocrGuideCorner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "#F6E7C9",
  },
  ocrGuideCornerTopLeft: {
    top: 14,
    left: 14,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 14,
  },
  ocrGuideCornerTopRight: {
    top: 14,
    right: 14,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 14,
  },
  ocrGuideCornerBottomLeft: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 14,
  },
  ocrGuideCornerBottomRight: {
    right: 14,
    bottom: 14,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 14,
  },
  ocrCameraOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(20, 15, 10, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
    gap: 4,
  },
  ocrCameraOverlayTitle: {
    color: "#FFF7EA",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  ocrCameraOverlayText: {
    color: "#D8C8AE",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  ocrActionRow: {
    gap: 10,
  },
  ocrPrimaryAction: {
    alignSelf: "stretch",
  },
  ocrLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ocrLegendChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  ocrLegendDuplicateChip: {
    backgroundColor: "rgba(153, 27, 27, 0.18)",
    borderColor: "rgba(248, 113, 113, 0.28)",
  },
  ocrLegendPossibleChip: {
    backgroundColor: "rgba(180, 83, 9, 0.18)",
    borderColor: "rgba(251, 191, 36, 0.28)",
  },
  ocrLegendNewChip: {
    backgroundColor: "rgba(6, 95, 70, 0.18)",
    borderColor: "rgba(74, 222, 128, 0.24)",
  },
  ocrLegendLabel: {
    color: "#FFF7EA",
    fontSize: 12,
    fontWeight: "700",
  },
  ocrResultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  ocrResultDuplicate: {
    backgroundColor: "rgba(67, 14, 18, 0.58)",
    borderColor: "rgba(248, 113, 113, 0.22)",
  },
  ocrResultPossibleDuplicate: {
    backgroundColor: "rgba(66, 32, 7, 0.56)",
    borderColor: "rgba(251, 191, 36, 0.24)",
  },
  ocrResultNew: {
    backgroundColor: "rgba(14, 43, 31, 0.56)",
    borderColor: "rgba(74, 222, 128, 0.22)",
  },
  ocrResultAdded: {
    backgroundColor: "rgba(19, 39, 51, 0.72)",
    borderColor: "rgba(125, 211, 252, 0.22)",
  },
  ocrResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  ocrResultHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  ocrResultSource: {
    color: "#FFF7EA",
    fontSize: 16,
    fontWeight: "800",
  },
  ocrResultConfidence: {
    color: "#D8C8AE",
    fontSize: 13,
    lineHeight: 18,
  },
  ocrResultBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  ocrResultDuplicateBadge: {
    backgroundColor: "rgba(127, 29, 29, 0.28)",
    borderColor: "rgba(248, 113, 113, 0.24)",
  },
  ocrResultDuplicateBadgeLabel: {
    color: "#FECACA",
  },
  ocrResultPossibleDuplicateBadge: {
    backgroundColor: "rgba(146, 64, 14, 0.28)",
    borderColor: "rgba(251, 191, 36, 0.24)",
  },
  ocrResultPossibleDuplicateBadgeLabel: {
    color: "#FDE68A",
  },
  ocrResultNewBadge: {
    backgroundColor: "rgba(6, 95, 70, 0.28)",
    borderColor: "rgba(74, 222, 128, 0.24)",
  },
  ocrResultNewBadgeLabel: {
    color: "#BBF7D0",
  },
  ocrResultBadgeLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  ocrFieldGroup: {
    gap: 6,
  },
  ocrMatchInfoCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(11, 9, 7, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    gap: 4,
  },
  ocrMatchInfoTitle: {
    color: "#FFF7EA",
    fontSize: 14,
    fontWeight: "700",
  },
  ocrMatchInfoText: {
    color: "#D8C8AE",
    fontSize: 13,
    lineHeight: 18,
  },
  ocrErrorText: {
    color: "#FCA5A5",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  ocrResultActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  ocrSavedPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(125, 211, 252, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.24)",
  },
  ocrSavedPillLabel: {
    color: "#E0F2FE",
    fontSize: 12,
    fontWeight: "800",
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
    zIndex: 30,
    elevation: 30,
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
    position: "relative",
    zIndex: 30,
    elevation: 30,
  },
  vaultToolbarWrapRaised: {
    zIndex: 80,
    elevation: 80,
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
  vaultSearchRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  vaultSearchInput: {
    flex: 1,
    backgroundColor: "#261C13",
    color: "#FFF7EA",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
  },
  vaultFilterWrap: {
    position: "relative",
    width: 118,
    zIndex: 20,
  },
  vaultFilterWrapRaised: {
    zIndex: 90,
    elevation: 90,
  },
  vaultFilterButton: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    backgroundColor: "#261C13",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  vaultFilterLabel: {
    flex: 1,
    color: "#FFF7EA",
    fontSize: 14,
    fontWeight: "600",
  },
  vaultFilterCaret: {
    display: "none",
    color: "#C9A66B",
    fontSize: 13,
    fontWeight: "800",
  },
  vaultFilterMenu: {
    display: "none",
    position: "absolute",
    top: 56,
    right: 0,
    width: 140,
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
    backgroundColor: "#1C150E",
    gap: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  vaultFilterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 5, 3, 0.56)",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  vaultFilterModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  vaultFilterModalCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 240,
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
    backgroundColor: "#1C150E",
    gap: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  vaultFilterOption: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  vaultFilterOptionActive: {
    backgroundColor: "rgba(209, 161, 87, 0.18)",
  },
  vaultFilterOptionLabel: {
    color: "#D8C8AE",
    fontSize: 14,
    fontWeight: "600",
  },
  vaultFilterOptionLabelActive: {
    color: "#FFF7EA",
  },
  genrePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 5, 3, 0.56)",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  genrePickerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  genrePickerModalCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 320,
    maxHeight: "72%",
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.12)",
    backgroundColor: "#1C150E",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  genrePickerModalHeader: {
    marginBottom: 12,
    gap: 4,
  },
  genrePickerModalTitle: {
    color: "#FFF7EA",
    fontSize: 18,
    fontWeight: "800",
  },
  genrePickerModalSubtitle: {
    color: "#A9987E",
    fontSize: 13,
  },
  genrePickerModalList: {
    flexGrow: 0,
  },
  genrePickerModalListContent: {
    gap: 6,
    paddingBottom: 4,
  },
  genrePickerOption: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#261C13",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
  },
  genrePickerOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  genrePickerOptionActive: {
    borderColor: "#D1A157",
    backgroundColor: "rgba(209, 161, 87, 0.18)",
  },
  genrePickerOptionLabel: {
    color: "#D8C8AE",
    fontSize: 14,
    fontWeight: "600",
  },
  genrePickerOptionCheck: {
    color: "#A9987E",
    fontSize: 12,
    fontWeight: "700",
  },
  genrePickerOptionLabelActive: {
    color: "#FFF7EA",
  },
  genrePickerOptionCheckActive: {
    color: "#F6E7C9",
  },
  genrePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  duplicateWarningCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.14)",
    backgroundColor: "#140F0A",
    padding: 18,
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
  duplicateWarningEyebrow: {
    color: "#C9A66B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  duplicateWarningTitle: {
    color: "#FFF7EA",
    fontSize: 24,
    fontWeight: "800",
  },
  duplicateWarningText: {
    color: "#D8C8AE",
    fontSize: 15,
    lineHeight: 22,
  },
  duplicateWarningMeta: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#1A140E",
    borderWidth: 1,
    borderColor: "rgba(246, 231, 201, 0.08)",
    gap: 4,
  },
  duplicateWarningMetaLabel: {
    color: "#FFF7EA",
    fontSize: 16,
    fontWeight: "700",
  },
  duplicateWarningMetaValue: {
    color: "#A9987E",
    fontSize: 14,
    lineHeight: 20,
  },
  duplicateWarningActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  vaultTableHeaderWrap: {
    backgroundColor: appChromeColor,
    position: "relative",
    zIndex: 10,
    elevation: 10,
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
    zIndex: 10,
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
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  vaultRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vaultGenreRow: {
    minHeight: 18,
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
  vaultModalEdition: {
    color: "#A9987E",
    fontSize: 13,
    lineHeight: 18,
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

