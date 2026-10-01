import { Redirect, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryFilterList } from "../../src/components/CategoryFilterList";
import { KeyboardPage } from "../../src/components/KeyboardScreen";
import { QuantityStepper } from "../../src/components/QuantityStepper";
import { useAuth } from "../../src/context/AuthContext";
import { getAllProducts, getCategories, peekCache, updateStock } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";
import type { CategoryWithChildren, ProductWithCategory } from "../../src/lib/types";
import { formatCurrency, resolveImageUrl } from "../../src/lib/utils";

type SaveState = "idle" | "saving" | "saved";

const StockCategoryModal = memo(function StockCategoryModal({
  visible,
  categories,
  counts,
  totalCount,
  initialIds,
  topInset,
  bottomInset,
  onClose,
  onApply,
}: {
  visible: boolean;
  categories: { id: string; name: string; parentId: string | null }[];
  counts: Map<string, number>;
  totalCount: number;
  initialIds: string[];
  topInset: number;
  bottomInset: number;
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDraftIds(initialIds);
    setQuery("");
  }, [visible, initialIds]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.categoryModal, { paddingTop: Math.max(topInset, 16), paddingBottom: bottomInset }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.categoryHead}>
          <Text style={styles.modalTitle}>Kategori</Text>
          <View style={styles.categoryHeadActions}>
            {draftIds.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setDraftIds([])}>
                <Text style={styles.categoryReset}>Sıfırla</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Kapat</Text>
            </Pressable>
          </View>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Kategori ara..."
          placeholderTextColor={colors.hint}
          style={styles.categorySearch}
        />
        <CategoryFilterList
          categories={categories}
          query={query}
          selectedIds={draftIds}
          counts={counts}
          includeAll
          totalCount={totalCount}
          onToggle={(id) => {
            if (!id) {
              setDraftIds([]);
              return;
            }
            setDraftIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
          }}
        />
        <Pressable onPress={() => onApply(draftIds)} style={styles.applyBar}>
          <Text style={styles.applyText}>
            {draftIds.length === 0 ? "Tümünü göster" : `${draftIds.length} kategoriyi göster`}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const StockCard = memo(function StockCard({
  product,
  onSave,
}: {
  product: ProductWithCategory;
  onSave: (id: string, qty: number) => Promise<{ error?: string }>;
}) {
  const [qty, setQty] = useState(product.stock_quantity);
  const [status, setStatus] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const image = resolveImageUrl(product.image_url);

  useEffect(() => {
    if (!dirty.current) setQty(product.stock_quantity);
  }, [product.stock_quantity]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function change(next: number) {
    if (status === "saving") return;
    dirty.current = true;
    setQty(next);
    if (status === "saved") setStatus("idle");
  }

  async function save() {
    if (status === "saving") return;
    setStatus("saving");
    const result = await onSave(product.id, qty);
    if (result.error) {
      setStatus("idle");
      Alert.alert("Hata", result.error);
      return;
    }
    dirty.current = false;
    setStatus("saved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <View style={styles.card}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          contentFit="cover"
          recyclingKey={product.id}
          transition={0}
        />
      ) : (
        <View style={[styles.image, styles.emptyImage]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.muted}>
          {product.categories?.name ?? "Kategori yok"} · {formatCurrency(Number(product.price))}
        </Text>
        <View style={styles.row}>
          <QuantityStepper min={0} value={qty} onChange={change} />
          <View style={styles.currentBox}>
            <Text style={styles.currentKicker}>Mevcut</Text>
            <Text style={styles.currentValue}>{product.stock_quantity}</Text>
          </View>
        </View>
        <Pressable
          onPress={save}
          disabled={status === "saving"}
          style={[styles.save, status === "saved" && styles.saveDone, status === "saving" && styles.saveBusy]}
        >
          {status === "saving" ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveText}>{status === "saved" ? "Kaydedildi" : "Kaydet"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

function flattenCategories(categories: CategoryWithChildren[]) {
  const list: { id: string; name: string; parentId: string | null }[] = [];
  for (const cat of categories) {
    list.push({ id: cat.id, name: cat.name, parentId: null });
    for (const child of cat.children ?? []) {
      list.push({ id: child.id, name: child.name, parentId: cat.id });
    }
  }
  return list;
}

export default function StockScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const cachedProducts = peekCache<ProductWithCategory[]>("products") ?? [];
  const cachedCategories = peekCache<CategoryWithChildren[]>("categories") ?? [];
  const [loading, setLoading] = useState(cachedProducts.length === 0);
  const [products, setProducts] = useState<ProductWithCategory[]>(cachedProducts);
  const [categories, setCategories] = useState<CategoryWithChildren[]>(cachedCategories);
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.role !== "admin") return;
      let alive = true;
      Promise.all([getAllProducts(), getCategories()])
        .then(([prods, cats]) => {
          if (!alive) return;
          setProducts(prods);
          setCategories(cats);
        })
        .catch((err) => {
          if (alive) Alert.alert("Hata", err.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, [user?.role])
  );

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    const selected = new Set(selectedCategoryIds);
    if (selected.size > 0) {
      for (const cat of flatCategories) {
        if (cat.parentId && selected.has(cat.parentId)) selected.add(cat.id);
      }
    }
    const base =
      selected.size === 0
        ? products
        : products.filter((product) => selected.has(product.category_id));
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.categories?.name ?? "").toLowerCase().includes(q)
    );
  }, [products, selectedCategoryIds, search, flatCategories]);

  const closeCategories = useCallback(() => setShowCategories(false), []);
  const applyCategories = useCallback((ids: string[]) => {
    setSelectedCategoryIds(ids);
    setShowCategories(false);
  }, []);

  const selectedCategoryName =
    selectedCategoryIds.length === 0
      ? "Tümü"
      : selectedCategoryIds
          .map((id) => flatCategories.find((item) => item.id === id)?.name ?? id)
          .join(", ");

  const saveStock = useCallback(async (id: string, qty: number) => {
    const result = await updateStock(id, qty);
    if (!result.error) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock_quantity: qty } : p)));
    }
    return result;
  }, []);

  if (user?.role !== "admin") return <Redirect href="/siparis" />;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <KeyboardPage>
    <View style={styles.page}>
      <Text style={styles.title}>Stok</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Ürün veya kategori ara"
        placeholderTextColor={colors.hint}
        style={styles.search}
      />
      <Pressable onPress={() => setShowCategories(true)} style={styles.categoryBar}>
        <View style={styles.categoryBarText}>
          <Text style={styles.categoryKicker}>Kategori</Text>
          <Text numberOfLines={1} style={styles.categoryValue}>
            {selectedCategoryName}
          </Text>
        </View>
        <Text style={styles.categoryAction}>Seç</Text>
      </Pressable>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        ListEmptyComponent={
          <Text style={styles.empty}>Bu kategoride ürün yok</Text>
        }
        renderItem={({ item }) => <StockCard product={item} onSave={saveStock} />}
      />

      <StockCategoryModal
        visible={showCategories}
        categories={flatCategories}
        counts={productCountByCategory}
        totalCount={products.length}
        initialIds={selectedCategoryIds}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onClose={closeCategories}
        onApply={applyCategories}
      />
    </View>
    </KeyboardPage>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy, padding: 12 },
  search: {
    marginHorizontal: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  categoryBar: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryBarText: { flex: 1, minWidth: 0 },
  categoryKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  categoryValue: { color: colors.text, fontWeight: "700", fontSize: 15, marginTop: 2 },
  categoryAction: { color: colors.navy, fontWeight: "800" },
  categoryModal: { flex: 1, backgroundColor: colors.bg },
  categoryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryHeadActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  categoryReset: { color: colors.danger, fontWeight: "700", fontSize: 15 },
  modalTitle: { fontWeight: "800", fontSize: 18, color: colors.navy },
  closeText: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  categorySearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  categoryList: { flex: 1 },
  categoryRow: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryRowOn: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: "#e8eef5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkOff: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.navy,
  },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "800" },
  categoryParent: { color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 },
  categoryParentOn: { color: colors.navy, fontWeight: "800", fontSize: 15, flex: 1 },
  categoryChild: { color: colors.text, fontSize: 14, paddingLeft: 10, flex: 1 },
  categoryCount: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  categoryCountOn: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  applyBar: {
    margin: 16,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 24 },
  card: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  image: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#f8fafc" },
  emptyImage: {},
  name: { fontWeight: "700", color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 2 },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentBox: {
    minWidth: 72,
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  currentKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  currentValue: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 1,
  },
  save: {
    marginTop: 8,
    minWidth: 108,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  saveBusy: { opacity: 0.75 },
  saveDone: { backgroundColor: colors.success },
  saveText: { color: "#fff", fontWeight: "700" },
});
