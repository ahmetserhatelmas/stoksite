import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryFilterList } from "../../src/components/CategoryFilterList";
import { KeyboardPage } from "../../src/components/KeyboardScreen";
import { QuantityStepper } from "../../src/components/QuantityStepper";
import {
  getAllProducts,
  getCategories,
  getCustomers,
  peekCache,
  sellOrder,
} from "../../src/lib/api";
import { customerCode, customerLabel } from "../../src/lib/customer-code";
import { colors } from "../../src/lib/theme";
import type { CategoryWithChildren, Customer, Product } from "../../src/lib/types";
import { formatCurrency, resolveImageUrl } from "../../src/lib/utils";

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

export default function OrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tablet = useWindowDimensions().width >= 768;
  const cachedProducts = peekCache<Product[]>("products") ?? [];
  const cachedCategories = peekCache<CategoryWithChildren[]>("categories") ?? [];
  const cachedCustomers = peekCache<Customer[]>("customers") ?? [];
  const [loading, setLoading] = useState(cachedProducts.length === 0);
  const [products, setProducts] = useState<Product[]>(cachedProducts);
  const [categories, setCategories] = useState<CategoryWithChildren[]>(cachedCategories);
  const [customers, setCustomers] = useState<Customer[]>(cachedCustomers);
  const [search, setSearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [draftCategoryIds, setDraftCategoryIds] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailScroll = useRef<ScrollView>(null);
  const loadGen = useRef(0);

  const refreshCatalog = useCallback(async () => {
    const gen = ++loadGen.current;
    try {
      const [cats, prods, cars] = await Promise.all([
        getCategories(),
        getAllProducts(),
        getCustomers(),
      ]);
      if (loadGen.current !== gen) return;
      setCategories(cats);
      setProducts(prods);
      setCustomers(cars);
    } catch (err) {
      if (loadGen.current !== gen) return;
      Alert.alert("Hata", err instanceof Error ? err.message : "Liste alınamadı");
    } finally {
      if (loadGen.current === gen) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCatalog();
    }, [refreshCatalog])
  );

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const filteredProducts = useMemo(() => {
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
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.description ?? "").toLowerCase().includes(q)
    );
  }, [products, flatCategories, selectedCategoryIds, search]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = products.find((p) => p.id === id);
          return product && qty > 0 ? { product, quantity: qty } : null;
        })
        .filter((item): item is { product: Product; quantity: number } => item !== null),
    [cart, products]
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.price),
    0
  );

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, customerCode(c) ?? "", c.phone ?? "", c.note ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, customerSearch]);

  async function confirmOrder() {
    if (cartItems.length === 0) {
      Alert.alert("Sepet boş", "Önce ürün ekleyin");
      return;
    }
    Alert.alert(
      "Sipariş onayı",
      `${cartCount} adet · ${formatCurrency(cartTotal)}\nCari: ${
        selectedCustomer ? customerLabel(selectedCustomer) : "Seçilmedi"
      }`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Onayla",
          onPress: async () => {
            setBusy(true);
            const result = await sellOrder(
              cartItems.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
              })),
              {
                customerId,
                customerName: selectedCustomer?.name ?? null,
              }
            );
            setBusy(false);
            if (result.error) {
              Alert.alert("Hata", result.error);
              return;
            }
            const sold = new Map(
              cartItems.map((item) => [item.product.id, item.quantity] as const)
            );
            setProducts((prev) =>
              prev.map((product) => {
                const qty = sold.get(product.id);
                if (!qty) return product;
                return {
                  ...product,
                  stock_quantity: Math.max(0, product.stock_quantity - qty),
                };
              })
            );
            setCart({});
            void refreshCatalog();
            Alert.alert("Tamam", result.invoiceNumber ?? "Sipariş oluştu", [
              {
                text: "Faturayı aç",
                onPress: () =>
                  result.invoiceId
                    ? router.push(`/faturalar/${result.invoiceId}`)
                    : router.push("/faturalar"),
              },
              { text: "Tamam" },
            ]);
          },
        },
      ]
    );
  }

  const cartPanel = (
    <View style={tablet ? styles.cartTablet : styles.cartPhone}>
      {tablet ? <Text style={styles.cartTitle}>Sepet</Text> : null}
      <View style={[styles.cariBtn, !selectedCustomer && styles.cariBtnEmpty]}>
        <Pressable
          onPress={() => {
            setCustomerSearch("");
            setShowCustomers(true);
          }}
          style={styles.categoryBarText}
        >
          <Text style={styles.cariKicker}>Cari</Text>
          <Text
            numberOfLines={2}
            style={selectedCustomer ? styles.customerName : styles.cariPlaceholder}
          >
            {selectedCustomer ? customerLabel(selectedCustomer) : "Cari seç"}
          </Text>
        </Pressable>
        {selectedCustomer ? (
          <Pressable hitSlop={8} onPress={() => setCustomerId(null)}>
            <Text style={styles.categoryReset}>Sıfırla</Text>
          </Pressable>
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => {
            setCustomerSearch("");
            setShowCustomers(true);
          }}
        >
          <Text style={styles.categoryAction}>Seç</Text>
        </Pressable>
      </View>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => item.product.id}
        style={styles.cartList}
        ListEmptyComponent={<Text style={styles.muted}>Sepet boş</Text>}
        renderItem={({ item }) => (
          <View style={styles.cartRow}>
            <Text style={styles.cartItem} numberOfLines={2}>
              {item.product.name}
            </Text>
            <QuantityStepper
              value={item.quantity}
              max={item.product.stock_quantity}
              onChange={(qty) => setQty(item.product.id, qty)}
            />
          </View>
        )}
      />
      <Text style={styles.total}>
        {cartCount} adet · {formatCurrency(cartTotal)}
      </Text>
      {cartItems.length > 0 || selectedCustomer ? (
        <Pressable
          disabled={busy}
          onPress={() =>
            Alert.alert("Sepeti sıfırla", "Sepetteki ürünler ve seçili cari silinsin mi?", [
              { text: "Vazgeç", style: "cancel" },
              {
                text: "Sıfırla",
                style: "destructive",
                onPress: () => {
                  setCart({});
                  setCustomerId(null);
                },
              },
            ])
          }
          style={styles.clearCart}
        >
          <Text style={styles.clearCartText}>Sepeti sıfırla</Text>
        </Pressable>
      ) : null}
      <Pressable disabled={busy} onPress={confirmOrder} style={styles.confirm}>
        <Text style={styles.confirmText}>{busy ? "İşleniyor..." : "Siparişi Onayla"}</Text>
      </Pressable>
    </View>
  );

  const selectedCategoryName =
    selectedCategoryIds.length === 0
      ? "Tümü"
      : selectedCategoryIds
          .map((id) => flatCategories.find((item) => item.id === id)?.name ?? id)
          .join(", ");

  const detailProduct = products.find((p) => p.id === detailId) ?? null;
  const detailCategory = detailProduct
    ? flatCategories.find((c) => c.id === detailProduct.category_id)
    : null;

  function renderProduct({ item }: { item: Product }) {
    const image = resolveImageUrl(item.image_url);
    const qty = cart[item.id] ?? 0;
    const photo = image ? (
      <Image source={{ uri: image }} style={tablet ? styles.image : styles.thumb} contentFit="cover" recyclingKey={item.id} />
    ) : (
      <View style={tablet ? styles.imageEmpty : styles.thumbEmpty}>
        <Text style={styles.muted}>Foto yok</Text>
      </View>
    );
    const stepper = (
      <QuantityStepper
        value={qty}
        max={item.stock_quantity}
        onChange={(next) => setQty(item.id, next)}
      />
    );

    if (!tablet) {
      return (
        <View style={styles.cardPhone}>
          <Pressable onPress={() => setDetailId(item.id)}>{photo}</Pressable>
          <View style={styles.cardBody}>
            <Pressable onPress={() => setDetailId(item.id)}>
              <Text numberOfLines={2} style={styles.productName}>
                {item.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>{formatCurrency(Number(item.price))}</Text>
                <Text style={styles.stockPill}>Stok {item.stock_quantity}</Text>
              </View>
            </Pressable>
            {stepper}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cardTablet}>
        <Pressable onPress={() => setDetailId(item.id)}>
          {photo}
          <Text numberOfLines={2} style={styles.productName}>
            {item.name}
          </Text>
          <Text style={styles.price}>{formatCurrency(Number(item.price))}</Text>
          <Text style={styles.muted}>Stok: {item.stock_quantity}</Text>
        </Pressable>
        {stepper}
      </View>
    );
  }

  const customerPicker = (
    <KeyboardAvoidingView style={styles.customerModal} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.categoryHead}>
        <Text style={styles.modalTitle}>Cari seç</Text>
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            setShowCustomers(false);
          }}
          hitSlop={16}
          style={styles.cartClose}
        >
          <Text style={styles.cartCloseText}>Kapat</Text>
        </Pressable>
      </View>
      <TextInput
        value={customerSearch}
        onChangeText={setCustomerSearch}
        placeholder="Kod, unvan veya telefon"
        placeholderTextColor={colors.hint}
        style={styles.categorySearch}
        autoCorrect={false}
      />
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        style={styles.categoryList}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={8}
        renderItem={({ item }) => {
          const active = item.id === customerId;
          return (
            <Pressable
              style={active ? styles.categoryRowOn : styles.categoryRow}
              onPress={() => {
                Keyboard.dismiss();
                setCustomerId(item.id);
                setShowCustomers(false);
              }}
            >
              <View style={styles.customerPick}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.muted}>
                  {[customerCode(item), item.phone].filter(Boolean).join(" · ") || "Kod / telefon yok"}
                </Text>
              </View>
              {active ? <Text style={styles.categoryAction}>Seçili</Text> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Cari bulunamadı</Text>}
      />
    </KeyboardAvoidingView>
  );

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
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Ürün adı ile ara..."
          placeholderTextColor={colors.hint}
          style={styles.search}
        />
      </View>
      <Pressable
        onPress={() => {
          setCategoryQuery("");
          setDraftCategoryIds(selectedCategoryIds);
          setShowCategories(true);
        }}
        style={styles.categoryBar}
      >
        <View style={styles.categoryBarText}>
          <Text style={styles.categoryKicker}>Kategori</Text>
          <Text numberOfLines={1} style={styles.categoryValue}>
            {selectedCategoryName}
          </Text>
        </View>
        <Text style={styles.categoryAction}>Seç</Text>
      </Pressable>
      <View style={tablet ? styles.bodyTablet : styles.bodyPhone}>
        <FlatList
          data={filteredProducts}
          key={tablet ? "grid" : "list"}
          keyExtractor={(item) => item.id}
          numColumns={tablet ? 3 : 1}
          style={styles.grid}
          columnWrapperStyle={tablet ? styles.gridRow : undefined}
          contentContainerStyle={styles.gridContent}
          renderItem={renderProduct}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          ListEmptyComponent={
            <Text style={styles.empty}>Bu kategoride ürün yok</Text>
          }
        />
        {tablet ? cartPanel : null}
      </View>
      {!tablet ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.bottomTotal}>
            <Text style={styles.cariKicker}>Toplam</Text>
            <Text numberOfLines={1} style={styles.bottomTotalValue}>
              {formatCurrency(cartTotal)}
            </Text>
          </View>
          <Pressable onPress={() => setShowCart(true)} style={styles.cartBtn}>
            <Text style={styles.cartCount}>{cartCount}</Text>
            <Text style={styles.cartBtnText}>Sepet</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={showCategories} animationType="slide" onRequestClose={() => setShowCategories(false)}>
        <KeyboardAvoidingView
          style={[styles.categoryModal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.categoryHead}>
            <Text style={styles.modalTitle}>Kategori</Text>
            <View style={styles.categoryHeadActions}>
              {draftCategoryIds.length > 0 ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setDraftCategoryIds([]);
                    setSelectedCategoryIds([]);
                  }}
                >
                  <Text style={styles.categoryReset}>Sıfırla</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setShowCategories(false)}>
                <Text style={styles.cartCloseText}>Kapat</Text>
              </Pressable>
            </View>
          </View>
          <TextInput
            value={categoryQuery}
            onChangeText={setCategoryQuery}
            placeholder="Kategori ara..."
            placeholderTextColor={colors.hint}
            style={styles.categorySearch}
          />
          <CategoryFilterList
            categories={flatCategories}
            query={categoryQuery}
            selectedIds={draftCategoryIds}
            counts={productCountByCategory}
            includeAll
            totalCount={products.length}
            onToggle={(id) => {
              if (!id) {
                setDraftCategoryIds([]);
                return;
              }
              setDraftCategoryIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
              );
            }}
          />
          <Pressable
            onPress={() => {
              setSelectedCategoryIds(draftCategoryIds);
              setShowCategories(false);
            }}
            style={styles.applyBar}
          >
            <Text style={styles.applyText}>
              {draftCategoryIds.length === 0
                ? "Tümünü göster"
                : `${draftCategoryIds.length} kategoriyi göster`}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showCart}
        animationType="slide"
        onRequestClose={() => {
          if (showCustomers) setShowCustomers(false);
          else setShowCart(false);
        }}
      >
        <View style={[styles.cartModal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]}>
          {showCustomers ? (
            customerPicker
          ) : (
            <>
              <View style={styles.categoryHead}>
                <Text style={styles.modalTitle}>Sepet</Text>
                <Pressable onPress={() => setShowCart(false)} hitSlop={16} style={styles.cartClose}>
                  <Text style={styles.cartCloseText}>Kapat</Text>
                </Pressable>
              </View>
              {cartPanel}
            </>
          )}
        </View>
      </Modal>

      <Modal visible={!!detailProduct} animationType="slide" onRequestClose={() => setDetailId(null)}>
        <KeyboardAvoidingView
          style={[styles.detailModal, { paddingTop: Math.max(insets.top, 16) }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.categoryHead}>
            <Text style={styles.modalTitle}>Ürün detayı</Text>
            <Pressable onPress={() => setDetailId(null)} hitSlop={16} style={styles.cartClose}>
              <Text style={styles.cartCloseText}>Kapat</Text>
            </Pressable>
          </View>
          {detailProduct ? (
            <ScrollView
              ref={detailScroll}
              contentContainerStyle={[styles.detailBody, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {resolveImageUrl(detailProduct.image_url) ? (
                <Image
                  source={{ uri: resolveImageUrl(detailProduct.image_url)! }}
                  style={styles.detailImage}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.detailImageEmpty}>
                  <Text style={styles.muted}>Foto yok</Text>
                </View>
              )}
              <Text style={styles.detailName}>{detailProduct.name}</Text>
              {detailCategory ? (
                <Text style={styles.detailCat}>{detailCategory.name}</Text>
              ) : null}
              {detailProduct.description ? (
                <Text style={styles.detailDesc}>{detailProduct.description}</Text>
              ) : null}
              <View style={styles.detailMeta}>
                <Text style={styles.price}>{formatCurrency(Number(detailProduct.price))}</Text>
                <Text style={styles.stockPill}>Stok {detailProduct.stock_quantity}</Text>
              </View>
              <View style={styles.detailStepper}>
                <QuantityStepper
                  value={cart[detailProduct.id] ?? 0}
                  max={detailProduct.stock_quantity}
                  onChange={(next) => setQty(detailProduct.id, next)}
                  onInputFocus={() => {
                    setTimeout(() => detailScroll.current?.scrollToEnd({ animated: true }), 80);
                  }}
                />
              </View>
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showCustomers && !showCart}
        animationType="slide"
        onRequestClose={() => setShowCustomers(false)}
      >
        <View style={[styles.cartModal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]}>
          {customerPicker}
        </View>
      </Modal>
    </View>
    </KeyboardPage>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toolbar: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, flexGrow: 0 },
  search: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  categoryBar: {
    marginHorizontal: 12,
    marginBottom: 8,
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
  categoryList: { flex: 1 },
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
  applyBar: {
    margin: 16,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  categoryParent: { color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 },
  categoryParentOn: { color: colors.navy, fontWeight: "800", fontSize: 15, flex: 1 },
  categoryChild: { color: colors.text, fontSize: 14, paddingLeft: 10, flex: 1 },
  categoryCount: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  categoryCountOn: { color: colors.navy, fontWeight: "800", fontSize: 13 },
  bodyTablet: { flex: 1, flexDirection: "row" },
  bodyPhone: { flex: 1, minHeight: 0 },
  grid: { flex: 1 },
  gridRow: { gap: 10 },
  gridContent: { paddingHorizontal: 12, paddingBottom: 16, paddingTop: 4, gap: 10 },
  cardTablet: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 140,
  },
  cardPhone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardBody: { flex: 1, minWidth: 0, gap: 6 },
  detailModal: { flex: 1, backgroundColor: colors.bg },
  detailBody: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  detailImage: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  detailImageEmpty: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  detailName: { fontSize: 20, fontWeight: "800", color: colors.text },
  detailCat: { color: colors.navy, fontWeight: "700" },
  detailDesc: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailStepper: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 12,
  },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#f8fafc" },
  thumbEmpty: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  stockPill: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  image: { width: "100%", height: 96, borderRadius: 8, backgroundColor: "#f8fafc" },
  imageEmpty: {
    width: "100%",
    height: 56,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: { fontWeight: "700", color: colors.text, marginTop: 6, fontSize: 15 },
  price: { color: colors.navy, fontWeight: "700", marginVertical: 2 },
  muted: { color: colors.muted, fontSize: 12 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 24 },
  cartTablet: {
    width: 300,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  cartPhone: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16, paddingBottom: 12 },
  cartList: { flex: 1, marginTop: 12 },
  cartTitle: { fontWeight: "800", color: colors.navy, fontSize: 18 },
  cariBtn: {
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cariBtnEmpty: {
    backgroundColor: "#fff8e8",
    borderColor: colors.gold,
  },
  customerName: { fontWeight: "800", color: colors.text, marginTop: 2, fontSize: 16 },
  cariPlaceholder: { fontWeight: "800", color: colors.navy, marginTop: 2, fontSize: 16 },
  customerModal: { flex: 1, backgroundColor: colors.bg },
  cartRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  cartItem: { fontWeight: "600", fontSize: 15, color: colors.text },
  total: { fontWeight: "800", color: colors.navy, marginTop: 10, marginBottom: 8 },
  clearCart: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  clearCartText: { color: colors.danger, fontWeight: "800" },
  confirm: { backgroundColor: colors.success, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  confirmText: { color: "#fff", fontWeight: "800" },
  confirmFlex: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeFlex: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  bottomTotal: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cariKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  bottomTotalValue: { fontWeight: "800", color: colors.navy, fontSize: 18, marginTop: 2 },
  cartBtn: {
    width: 84,
    height: 58,
    backgroundColor: colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cartCount: { fontWeight: "800", color: "#1a1a1a", fontSize: 18, lineHeight: 20 },
  cartBtnText: { fontWeight: "700", color: "#1a1a1a", fontSize: 12 },
  cartModal: { flex: 1, backgroundColor: "#fff" },
  cartClose: { paddingHorizontal: 8, paddingVertical: 8 },
  cartCloseText: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
  },
  modalTitle: { fontWeight: "800", fontSize: 18, color: colors.navy },
  customerList: { maxHeight: 260, marginTop: 8 },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  customerPick: { flex: 1 },
  vazgec: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  vazgecText: { color: colors.navy, fontWeight: "800" },
});
