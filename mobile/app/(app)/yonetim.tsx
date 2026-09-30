import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { KeyboardPage, KeyboardScreen } from "../../src/components/KeyboardScreen";
import { useAuth } from "../../src/context/AuthContext";
import {
  createAppUser,
  createCategory,
  createCustomer,
  createProduct,
  deleteAppUser,
  deleteCategory,
  deleteCustomer,
  deleteProduct,
  getAdminUsers,
  getAllProducts,
  getCategories,
  getCustomers,
  getInvoices,
  updateAppUser,
  updateCategory,
  updateCustomer,
  updateProduct,
  uploadProductPhoto,
} from "../../src/lib/api";
import { customerCode } from "../../src/lib/customer-code";
import { colors } from "../../src/lib/theme";
import type { AppUser, CategoryWithChildren, Customer, ProductWithCategory } from "../../src/lib/types";
import { formatCurrency } from "../../src/lib/utils";

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

export default function AdminScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [sales, setSales] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [catName, setCatName] = useState("");
  const [parentName, setParentName] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "user">("user");
  const [usernameDrafts, setUsernameDrafts] = useState<Record<string, string>>({});
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [userBusy, setUserBusy] = useState(false);
  const [tab, setTab] = useState<"urun" | "kullanici" | "cari">("urun");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cariSearch, setCariSearch] = useState("");
  const [newCariName, setNewCariName] = useState("");
  const [newCariCode, setNewCariCode] = useState("");
  const [newCariPhone, setNewCariPhone] = useState("");
  const [cariNameDrafts, setCariNameDrafts] = useState<Record<string, string>>({});
  const [cariCodeDrafts, setCariCodeDrafts] = useState<Record<string, string>>({});
  const [cariPhoneDrafts, setCariPhoneDrafts] = useState<Record<string, string>>({});
  const [cariBusy, setCariBusy] = useState(false);
  const [editingCariId, setEditingCariId] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<ProductWithCategory[]>([]);
  const [urunPane, setUrunPane] = useState<"yeni" | "kategori" | "urun">("yeni");
  const [categoryManageSearch, setCategoryManageSearch] = useState("");
  const [productManageSearch, setProductManageSearch] = useState("");
  const [productFilterIds, setProductFilterIds] = useState<string[]>([]);
  const [draftProductFilterIds, setDraftProductFilterIds] = useState<string[]>([]);
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [productFilterQuery, setProductFilterQuery] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState({
    name: "",
    price: "",
    stock: "",
    categoryId: "",
  });
  const [categoryPickTarget, setCategoryPickTarget] = useState<"new" | "edit" | "parent">("new");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [productPhoto, setProductPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [catalogBusy, setCatalogBusy] = useState(false);

  useEffect(() => {
    if (user?.role !== "admin") return;
    Promise.all([getAllProducts(), getInvoices(), getCustomers(), getAdminUsers(), getCategories()])
      .then(([products, invoices, customers, adminUsers, cats]) => {
        setCatalogProducts(products);
        setProductCount(products.length);
        setLowStock(products.filter((p) => p.stock_quantity <= 5).length);
        setInvoiceCount(invoices.length);
        setSales(invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0));
        setCustomers(customers);
        setCustomerCount(customers.length);
        setCariNameDrafts(Object.fromEntries(customers.map((item) => [item.id, item.name])));
        setCariCodeDrafts(
          Object.fromEntries(customers.map((item) => [item.id, customerCode(item) ?? ""]))
        );
        setCariPhoneDrafts(Object.fromEntries(customers.map((item) => [item.id, item.phone ?? ""])));
        setUsers(adminUsers);
        setUserCount(adminUsers.length);
        setUsernameDrafts(
          Object.fromEntries(adminUsers.map((item) => [item.id, item.username]))
        );
        setPasswordDrafts(
          Object.fromEntries(adminUsers.map((item) => [item.id, item.password ?? ""]))
        );
        setCategories(cats);
        setCategoryId("");
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role !== "admin") return;
      let alive = true;
      getAllProducts()
        .then((products) => {
          if (!alive) return;
          setCatalogProducts(products);
          setProductCount(products.length);
          setLowStock(products.filter((item) => item.stock_quantity <= 5).length);
        })
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [user?.role])
  );

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const filteredCustomers = useMemo(() => {
    const q = cariSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((item) => {
      const code = (customerCode(item) ?? "").toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        code.includes(q) ||
        (item.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, cariSearch]);

  const filteredManageCategories = useMemo(() => {
    const q = categoryManageSearch.trim().toLowerCase();
    if (!q) return flatCategories;
    return flatCategories.filter((item) => {
      const parent = item.parentId
        ? flatCategories.find((cat) => cat.id === item.parentId)?.name ?? ""
        : "";
      return item.name.toLowerCase().includes(q) || parent.toLowerCase().includes(q);
    });
  }, [flatCategories, categoryManageSearch]);

  const filteredManageProducts = useMemo(() => {
    const selected = new Set(productFilterIds);
    if (selected.size > 0) {
      for (const cat of flatCategories) {
        if (cat.parentId && selected.has(cat.parentId)) selected.add(cat.id);
      }
    }
    const byCategory =
      selected.size === 0
        ? catalogProducts
        : catalogProducts.filter((item) => selected.has(item.category_id));
    const q = productManageSearch.trim().toLowerCase();
    if (!q) return byCategory;
    return byCategory.filter((item) => {
      const cat = flatCategories.find((row) => row.id === item.category_id);
      const parent = cat?.parentId
        ? flatCategories.find((row) => row.id === cat.parentId)?.name ?? ""
        : "";
      return (
        item.name.toLowerCase().includes(q) ||
        (item.categories?.name ?? "").toLowerCase().includes(q) ||
        (cat?.name ?? "").toLowerCase().includes(q) ||
        parent.toLowerCase().includes(q)
      );
    });
  }, [catalogProducts, productManageSearch, productFilterIds, flatCategories]);

  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of catalogProducts) {
      counts.set(item.category_id, (counts.get(item.category_id) ?? 0) + 1);
    }
    return counts;
  }, [catalogProducts]);

  function applyProductList(next: ProductWithCategory[]) {
    setCatalogProducts(next);
    setProductCount(next.length);
    setLowStock(next.filter((item) => item.stock_quantity <= 5).length);
  }

  async function pickProductPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Fotoğraf eklemek için erişim izni verin");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setProductPhoto({ uri: asset.uri, mime: asset.mimeType ?? "image/jpeg" });
  }

  function chooseProductPhoto() {
    Alert.alert("Fotoğraf", "Nereden eklemek istersin?", [
      { text: "Galeri", onPress: () => pickProductPhoto(false) },
      { text: "Kamera", onPress: () => pickProductPhoto(true) },
      { text: "Vazgeç", style: "cancel" },
    ]);
  }

  if (user?.role !== "admin") return <Redirect href="/panel" />;

  const selectedCategory = flatCategories.find((cat) => cat.id === categoryId);
  const selectedCategoryName = selectedCategory?.parentId
    ? `${flatCategories.find((cat) => cat.id === selectedCategory.parentId)?.name ?? ""} · ${selectedCategory.name}`
    : "Alt kategori seç";
  const selectedParent = flatCategories.find((cat) => cat.id === parentCategoryId && !cat.parentId);
  const categoryQueryText = categoryQuery.trim().toLowerCase();
  const categoryPool = flatCategories.filter((item) =>
    categoryPickTarget === "parent" ? !item.parentId : Boolean(item.parentId)
  );
  const filteredCategoryOptions = categoryQueryText
    ? categoryPool.filter((item) => {
        const parent = item.parentId
          ? flatCategories.find((cat) => cat.id === item.parentId)?.name ?? ""
          : "";
        return (
          item.name.toLowerCase().includes(categoryQueryText) ||
          parent.toLowerCase().includes(categoryQueryText)
        );
      })
    : categoryPool;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  const adminHeader = (
    <>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Admin paneli</Text>
        <Text style={styles.hello}>Merhaba, {user?.name}</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>Ürün {productCount}</Text>
          <Text style={styles.stat}>Düşük stok {lowStock}</Text>
          <Text style={styles.stat}>
            Fatura {invoiceCount} · {formatCurrency(sales)}
          </Text>
          <Text style={styles.stat}>
            Cari {customerCount} / kullanıcı {userCount}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab("urun")}
          style={tab === "urun" ? styles.tabOn : styles.tabOff}
        >
          <Text style={tab === "urun" ? styles.tabOnText : styles.tabOffText}>Ürün</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("kullanici")}
          style={tab === "kullanici" ? styles.tabOn : styles.tabOff}
        >
          <Text style={tab === "kullanici" ? styles.tabOnText : styles.tabOffText}>Kullanıcı</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("cari")}
          style={tab === "cari" ? styles.tabOn : styles.tabOff}
        >
          <Text style={tab === "cari" ? styles.tabOnText : styles.tabOffText}>Cariler</Text>
        </Pressable>
      </View>
      {tab === "urun" ? (
        <View style={styles.subtabs}>
          {(
            [
              ["yeni", "Yeni"],
              ["kategori", "Kategoriler"],
              ["urun", "Ürünler"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setUrunPane(key)}
              style={urunPane === key ? styles.tabOn : styles.tabOff}
            >
              <Text style={urunPane === key ? styles.tabOnText : styles.tabOffText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );

  if (tab === "cari") {
    return (
      <KeyboardPage>
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          initialNumToRender={16}
          windowSize={8}
          ListHeaderComponent={
            <View>
              {adminHeader}
              <Text style={styles.section}>Yeni cari</Text>
              <TextInput
                value={newCariCode}
                onChangeText={setNewCariCode}
                placeholder="Cari kodu"
                placeholderTextColor={colors.hint}
                autoCapitalize="none"
                style={styles.input}
              />
              <TextInput
                value={newCariName}
                onChangeText={setNewCariName}
                placeholder="Unvan"
                placeholderTextColor={colors.hint}
                style={styles.input}
              />
              <TextInput
                value={newCariPhone}
                onChangeText={setNewCariPhone}
                placeholder="Telefon"
                placeholderTextColor={colors.hint}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <Pressable
                disabled={cariBusy}
                style={styles.button}
                onPress={async () => {
                  Keyboard.dismiss();
                  if (!newCariName.trim()) {
                    Alert.alert("Hata", "Unvan gerekli");
                    return;
                  }
                  setCariBusy(true);
                  const result = await createCustomer({
                    name: newCariName,
                    code: newCariCode,
                    phone: newCariPhone,
                  });
                  setCariBusy(false);
                  if (result.error || !result.customer) {
                    Alert.alert("Hata", result.error ?? "Cari eklenemedi");
                    return;
                  }
                  const next = result.customer;
                  setCustomers((prev) => [next, ...prev]);
                  setCustomerCount((count) => count + 1);
                  setCariNameDrafts((prev) => ({ ...prev, [next.id]: next.name }));
                  setCariCodeDrafts((prev) => ({ ...prev, [next.id]: customerCode(next) ?? "" }));
                  setCariPhoneDrafts((prev) => ({ ...prev, [next.id]: next.phone ?? "" }));
                  setNewCariName("");
                  setNewCariCode("");
                  setNewCariPhone("");
                  Alert.alert("Tamam", "Cari eklendi");
                }}
              >
                <Text style={styles.buttonText}>{cariBusy ? "Ekleniyor..." : "Cari ekle"}</Text>
              </Pressable>
              <Text style={styles.section}>Kayıtlı cariler</Text>
              <TextInput
                value={cariSearch}
                onChangeText={setCariSearch}
                placeholder="Kod, unvan veya telefon ara"
                placeholderTextColor={colors.hint}
                style={styles.input}
              />
            </View>
          }
          renderItem={({ item }) => {
            const open = editingCariId === item.id;
            return (
              <View style={styles.userCard}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userMeta}>
                  {[customerCode(item), item.phone].filter(Boolean).join(" · ") || "Kod / telefon yok"}
                </Text>
                {open ? (
                  <>
                    <Text style={styles.passwordLabel}>Cari kodu</Text>
                    <TextInput
                      value={cariCodeDrafts[item.id] ?? customerCode(item) ?? ""}
                      onChangeText={(text) =>
                        setCariCodeDrafts((prev) => ({ ...prev, [item.id]: text }))
                      }
                      placeholder="Cari kodu"
                      placeholderTextColor={colors.hint}
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <Text style={styles.passwordLabel}>Unvan</Text>
                    <TextInput
                      value={cariNameDrafts[item.id] ?? item.name}
                      onChangeText={(text) =>
                        setCariNameDrafts((prev) => ({ ...prev, [item.id]: text }))
                      }
                      placeholder="Unvan"
                      placeholderTextColor={colors.hint}
                      style={styles.input}
                    />
                    <Text style={styles.passwordLabel}>Telefon</Text>
                    <TextInput
                      value={cariPhoneDrafts[item.id] ?? item.phone ?? ""}
                      onChangeText={(text) =>
                        setCariPhoneDrafts((prev) => ({ ...prev, [item.id]: text }))
                      }
                      placeholder="Telefon"
                      placeholderTextColor={colors.hint}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </>
                ) : null}
                <View style={styles.userActions}>
                  {open ? (
                    <Pressable
                      disabled={cariBusy}
                      style={styles.userSave}
                      onPress={async () => {
                        Keyboard.dismiss();
                        const name = cariNameDrafts[item.id] ?? item.name;
                        if (!name.trim()) {
                          Alert.alert("Hata", "Unvan gerekli");
                          return;
                        }
                        setCariBusy(true);
                        const result = await updateCustomer({
                          id: item.id,
                          name,
                          code: cariCodeDrafts[item.id] ?? "",
                          phone: cariPhoneDrafts[item.id] ?? "",
                        });
                        setCariBusy(false);
                        if (result.error || !result.customer) {
                          Alert.alert("Hata", result.error ?? "Cari güncellenemedi");
                          return;
                        }
                        setCustomers((prev) =>
                          prev.map((row) => (row.id === item.id ? result.customer! : row))
                        );
                        setEditingCariId(null);
                        Alert.alert("Tamam", "Cari güncellendi");
                      }}
                    >
                      <Text style={styles.userSaveText}>Kaydet</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.userSave} onPress={() => setEditingCariId(item.id)}>
                      <Text style={styles.userSaveText}>Düzenle</Text>
                    </Pressable>
                  )}
                  {open ? (
                    <Pressable
                      style={styles.userCancel}
                      onPress={() => {
                        Keyboard.dismiss();
                        setCariNameDrafts((prev) => ({ ...prev, [item.id]: item.name }));
                        setCariCodeDrafts((prev) => ({
                          ...prev,
                          [item.id]: customerCode(item) ?? "",
                        }));
                        setCariPhoneDrafts((prev) => ({ ...prev, [item.id]: item.phone ?? "" }));
                        setEditingCariId(null);
                      }}
                    >
                      <Text style={styles.userCancelText}>Vazgeç</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={cariBusy}
                      style={styles.userDelete}
                      onPress={() =>
                        Alert.alert("Cariyi sil", `${item.name} silinsin mi?`, [
                          { text: "İptal", style: "cancel" },
                          {
                            text: "Sil",
                            style: "destructive",
                            onPress: async () => {
                              setCariBusy(true);
                              const result = await deleteCustomer(item.id);
                              setCariBusy(false);
                              if (result.error) {
                                Alert.alert("Hata", result.error);
                                return;
                              }
                              setCustomers((prev) => prev.filter((row) => row.id !== item.id));
                              setCustomerCount((count) => Math.max(0, count - 1));
                              if (editingCariId === item.id) setEditingCariId(null);
                            },
                          },
                        ])
                      }
                    >
                      <Text style={styles.userDeleteText}>Sil</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {cariSearch.trim() ? "Cari bulunamadı" : "Henüz cari yok"}
            </Text>
          }
        />
      </KeyboardPage>
    );
  }

  if (tab === "urun" && urunPane === "kategori") {
    return (
      <KeyboardPage>
        <FlatList
          data={filteredManageCategories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          initialNumToRender={16}
          windowSize={8}
          ListHeaderComponent={
            <View>
              {adminHeader}
              <Text style={styles.section}>Kategoriler</Text>
              <TextInput
                value={categoryManageSearch}
                onChangeText={setCategoryManageSearch}
                placeholder="Kategori veya alt kategori ara"
                placeholderTextColor={colors.hint}
                style={styles.input}
              />
            </View>
          }
          renderItem={({ item }) => {
            const open = editingCategoryId === item.id;
            const parentName = item.parentId
              ? flatCategories.find((cat) => cat.id === item.parentId)?.name
              : null;
            return (
              <View style={styles.userCard}>
                <Text style={styles.userMeta}>{parentName ? "Alt kategori" : "Kategori"}</Text>
                <Text style={styles.userName}>{item.name}</Text>
                {parentName ? <Text style={styles.userMeta}>{parentName}</Text> : null}
                {open ? (
                  <TextInput
                    value={categoryNameDraft}
                    onChangeText={setCategoryNameDraft}
                    placeholder="Kategori adı"
                    placeholderTextColor={colors.hint}
                    style={[styles.input, { marginTop: 8 }]}
                  />
                ) : null}
                <View style={styles.userActions}>
                  {open ? (
                    <Pressable
                      disabled={catalogBusy}
                      style={styles.userSave}
                      onPress={async () => {
                        Keyboard.dismiss();
                        const name = categoryNameDraft.trim();
                        if (!name) {
                          Alert.alert("Hata", "Kategori adı gerekli");
                          return;
                        }
                        setCatalogBusy(true);
                        const result = await updateCategory(item.id, name);
                        setCatalogBusy(false);
                        if (result.error) {
                          Alert.alert("Hata", result.error);
                          return;
                        }
                        setCategories(await getCategories());
                        setCatalogProducts((prev) =>
                          prev.map((product) =>
                            product.category_id === item.id && product.categories
                              ? { ...product, categories: { ...product.categories, name } }
                              : product
                          )
                        );
                        setEditingCategoryId(null);
                      }}
                    >
                      <Text style={styles.userSaveText}>Kaydet</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.userSave}
                      onPress={() => {
                        setEditingCategoryId(item.id);
                        setCategoryNameDraft(item.name);
                      }}
                    >
                      <Text style={styles.userSaveText}>Düzenle</Text>
                    </Pressable>
                  )}
                  {open ? (
                    <Pressable
                      style={styles.userCancel}
                      onPress={() => {
                        Keyboard.dismiss();
                        setEditingCategoryId(null);
                      }}
                    >
                      <Text style={styles.userCancelText}>Vazgeç</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={catalogBusy}
                      style={styles.userDelete}
                      onPress={() => {
                        const childCount = flatCategories.filter((cat) => cat.parentId === item.id).length;
                        const productCountHere = catalogProducts.filter(
                          (product) => product.category_id === item.id
                        ).length;
                        Alert.alert(
                          "Kategoriyi sil",
                          `${item.name} silinsin mi?${
                            productCountHere ? ` ${productCountHere} ürün de silinir.` : ""
                          }${childCount ? " Alt kategoriler ana kategori olarak kalır." : ""}`,
                          [
                            { text: "İptal", style: "cancel" },
                            {
                              text: "Sil",
                              style: "destructive",
                              onPress: async () => {
                                setCatalogBusy(true);
                                const result = await deleteCategory(item.id);
                                setCatalogBusy(false);
                                if (result.error) {
                                  Alert.alert("Hata", result.error);
                                  return;
                                }
                                setCategories(await getCategories());
                                applyProductList(
                                  catalogProducts.filter((product) => product.category_id !== item.id)
                                );
                                if (categoryId === item.id) setCategoryId("");
                                if (editingCategoryId === item.id) setEditingCategoryId(null);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.userDeleteText}>Sil</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Kategori bulunamadı</Text>}
        />
      </KeyboardPage>
    );
  }

  if (tab === "urun" && urunPane === "urun") {
    return (
      <>
      <KeyboardPage>
        <FlatList
          data={filteredManageProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={
            <View>
              {adminHeader}
              <Text style={styles.section}>Ürünler</Text>
              <TextInput
                value={productManageSearch}
                onChangeText={setProductManageSearch}
                placeholder="Ürün veya kategori ara"
                placeholderTextColor={colors.hint}
                style={styles.input}
              />
              <Pressable
                onPress={() => {
                  setProductFilterQuery("");
                  setDraftProductFilterIds(productFilterIds);
                  setShowProductFilter(true);
                }}
                style={styles.categoryBar}
              >
                <View style={styles.categoryBarText}>
                  <Text style={styles.categoryKicker}>Kategori</Text>
                  <Text numberOfLines={1} style={styles.categoryValue}>
                    {productFilterIds.length === 0
                      ? "Tümü"
                      : productFilterIds
                          .map((id) => flatCategories.find((cat) => cat.id === id)?.name ?? id)
                          .join(", ")}
                  </Text>
                </View>
                <Text style={styles.categoryAction}>Seç</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const open = editingProductId === item.id;
            const draftCategory = flatCategories.find((cat) => cat.id === productDraft.categoryId);
            return (
              <View style={styles.userCard}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userMeta}>
                  {item.categories?.name ?? "Kategori yok"} · {formatCurrency(Number(item.price))} · Stok{" "}
                  {item.stock_quantity}
                </Text>
                {open ? (
                  <>
                    <Text style={[styles.passwordLabel, { marginTop: 8 }]}>Ürün adı</Text>
                    <TextInput
                      value={productDraft.name}
                      onChangeText={(text) => setProductDraft((prev) => ({ ...prev, name: text }))}
                      placeholder="Ürün adı"
                      placeholderTextColor={colors.hint}
                      style={styles.input}
                    />
                    <Text style={styles.passwordLabel}>Fiyat</Text>
                    <TextInput
                      value={productDraft.price}
                      onChangeText={(text) => {
                        const cleaned = text.replace(",", ".").replace(/[^\d.]/g, "");
                        const [whole, ...rest] = cleaned.split(".");
                        setProductDraft((prev) => ({
                          ...prev,
                          price:
                            rest.length > 0 ? `${whole}.${rest.join("").replace(/\./g, "")}` : whole,
                        }));
                      }}
                      placeholder="Fiyat"
                      placeholderTextColor={colors.hint}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      style={styles.input}
                    />
                    <Text style={styles.passwordLabel}>Stok</Text>
                    <TextInput
                      value={productDraft.stock}
                      onChangeText={(text) =>
                        setProductDraft((prev) => ({ ...prev, stock: text.replace(/\D/g, "") }))
                      }
                      placeholder="Stok"
                      placeholderTextColor={colors.hint}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      style={styles.input}
                    />
                    <Pressable
                      onPress={() => {
                        setCategoryPickTarget("edit");
                        setCategoryQuery("");
                        setShowCategories(true);
                      }}
                      style={styles.categoryBar}
                    >
                      <View style={styles.categoryBarText}>
                        <Text style={styles.categoryKicker}>Alt kategori</Text>
                        <Text numberOfLines={1} style={styles.categoryValue}>
                          {draftCategory?.name ?? "Kategori seç"}
                        </Text>
                      </View>
                      <Text style={styles.categoryAction}>Seç</Text>
                    </Pressable>
                  </>
                ) : null}
                <View style={styles.userActions}>
                  {open ? (
                    <Pressable
                      disabled={catalogBusy}
                      style={styles.userSave}
                      onPress={async () => {
                        Keyboard.dismiss();
                        if (!productDraft.name.trim() || !productDraft.categoryId) {
                          Alert.alert("Hata", "Ürün adı ve kategori gerekli");
                          return;
                        }
                        setCatalogBusy(true);
                        const result = await updateProduct({
                          id: item.id,
                          name: productDraft.name,
                          categoryId: productDraft.categoryId,
                          price: parseFloat(productDraft.price),
                          stockQuantity: parseInt(productDraft.stock, 10),
                        });
                        setCatalogBusy(false);
                        if (result.error || !result.product) {
                          Alert.alert("Hata", result.error ?? "Ürün güncellenemedi");
                          return;
                        }
                        applyProductList(
                          catalogProducts.map((product) =>
                            product.id === item.id ? result.product! : product
                          )
                        );
                        setEditingProductId(null);
                      }}
                    >
                      <Text style={styles.userSaveText}>Kaydet</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.userSave}
                      onPress={() => {
                        setEditingProductId(item.id);
                        setProductDraft({
                          name: item.name,
                          price: String(item.price ?? ""),
                          stock: String(item.stock_quantity ?? ""),
                          categoryId: item.category_id,
                        });
                      }}
                    >
                      <Text style={styles.userSaveText}>Düzenle</Text>
                    </Pressable>
                  )}
                  {open ? (
                    <Pressable
                      style={styles.userCancel}
                      onPress={() => {
                        Keyboard.dismiss();
                        setEditingProductId(null);
                      }}
                    >
                      <Text style={styles.userCancelText}>Vazgeç</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={catalogBusy}
                      style={styles.userDelete}
                      onPress={() =>
                        Alert.alert("Ürünü sil", `${item.name} silinsin mi?`, [
                          { text: "İptal", style: "cancel" },
                          {
                            text: "Sil",
                            style: "destructive",
                            onPress: async () => {
                              setCatalogBusy(true);
                              const result = await deleteProduct(item.id);
                              setCatalogBusy(false);
                              if (result.error) {
                                Alert.alert("Hata", result.error);
                                return;
                              }
                              applyProductList(
                                catalogProducts.filter((product) => product.id !== item.id)
                              );
                              if (editingProductId === item.id) setEditingProductId(null);
                            },
                          },
                        ])
                      }
                    >
                      <Text style={styles.userDeleteText}>Sil</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {productManageSearch.trim() || productFilterIds.length ? "Ürün bulunamadı" : "Henüz ürün yok"}
            </Text>
          }
        />
      </KeyboardPage>
      <Modal visible={showProductFilter} animationType="slide" onRequestClose={() => setShowProductFilter(false)}>
        <KeyboardAvoidingView
          style={[styles.categoryModal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.categoryHead}>
            <Text style={styles.modalTitle}>Kategori</Text>
            <View style={styles.categoryHeadActions}>
              {draftProductFilterIds.length > 0 ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setDraftProductFilterIds([]);
                    setProductFilterIds([]);
                  }}
                >
                  <Text style={styles.categoryReset}>Sıfırla</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setShowProductFilter(false)}>
                <Text style={styles.closeText}>Kapat</Text>
              </Pressable>
            </View>
          </View>
          <TextInput
            value={productFilterQuery}
            onChangeText={setProductFilterQuery}
            placeholder="Kategori ara..."
            placeholderTextColor={colors.hint}
            style={styles.categorySearch}
          />
          <CategoryFilterList
            categories={flatCategories}
            query={productFilterQuery}
            selectedIds={draftProductFilterIds}
            counts={productCountByCategory}
            onToggle={(id) =>
              setDraftProductFilterIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
              )
            }
          />
          <Pressable
            onPress={() => {
              setProductFilterIds(draftProductFilterIds);
              setShowProductFilter(false);
            }}
            style={styles.filterApply}
          >
            <Text style={styles.filterApplyText}>
              {draftProductFilterIds.length === 0
                ? "Tümünü göster"
                : `${draftProductFilterIds.length} kategoriyi göster`}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showCategories} animationType="slide" onRequestClose={() => setShowCategories(false)}>
        <KeyboardAvoidingView
          style={[styles.categoryModal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.categoryHead}>
            <Text style={styles.modalTitle}>
              {categoryPickTarget === "parent" ? "Ana kategori" : "Alt kategori"}
            </Text>
            <Pressable onPress={() => setShowCategories(false)}>
              <Text style={styles.closeText}>Kapat</Text>
            </Pressable>
          </View>
          <TextInput
            value={categoryQuery}
            onChangeText={setCategoryQuery}
            placeholder={categoryPickTarget === "parent" ? "Ana kategori ara..." : "Alt kategori ara..."}
            placeholderTextColor={colors.hint}
            style={styles.categorySearch}
          />
          <CategoryFilterList
            categories={flatCategories}
            query={categoryQuery}
            selectedIds={productDraft.categoryId ? [productDraft.categoryId] : []}
            counts={productCountByCategory}
            selectParents={false}
            showCounts={false}
            onToggle={(id) => {
              const picked = flatCategories.find((cat) => cat.id === id);
              if (!picked?.parentId) return;
              setProductDraft((prev) => ({ ...prev, categoryId: id }));
              setShowCategories(false);
            }}
          />
        </KeyboardAvoidingView>
      </Modal>
    </>
    );
  }

  return (
    <KeyboardScreen contentContainerStyle={styles.page}>
      {adminHeader}

      {tab === "kullanici" ? (
      <>
      <Text style={styles.section}>Kullanıcılar</Text>
      <TextInput
        value={newUserName}
        onChangeText={setNewUserName}
        placeholder="Ad soyad"
        placeholderTextColor={colors.hint}
        style={styles.input}
      />
      <TextInput
        value={newUsername}
        onChangeText={setNewUsername}
        placeholder="Kullanıcı adı"
        autoCapitalize="none"
        placeholderTextColor={colors.hint}
        style={styles.input}
      />
      <TextInput
        value={newUserPassword}
        onChangeText={setNewUserPassword}
        placeholder="Şifre"
        autoCapitalize="none"
        placeholderTextColor={colors.hint}
        style={styles.input}
      />
      <View style={styles.roleRow}>
        <Pressable
          onPress={() => setNewUserRole("user")}
          style={newUserRole === "user" ? styles.roleOn : styles.roleOff}
        >
          <Text style={newUserRole === "user" ? styles.roleOnText : styles.roleOffText}>Kullanıcı</Text>
        </Pressable>
        <Pressable
          onPress={() => setNewUserRole("admin")}
          style={newUserRole === "admin" ? styles.roleOn : styles.roleOff}
        >
          <Text style={newUserRole === "admin" ? styles.roleOnText : styles.roleOffText}>Admin</Text>
        </Pressable>
      </View>
      <Pressable
        disabled={userBusy}
        style={styles.button}
        onPress={async () => {
          Keyboard.dismiss();
          setUserBusy(true);
          const result = await createAppUser({
            name: newUserName,
            username: newUsername,
            password: newUserPassword,
            role: newUserRole,
          });
          setUserBusy(false);
          if (result.error || !result.user) {
            Alert.alert("Hata", result.error ?? "Kullanıcı eklenemedi");
            return;
          }
          setUsers((prev) => [...prev, result.user!].sort((a, b) => a.name.localeCompare(b.name, "tr")));
          setUserCount((count) => count + 1);
          setUsernameDrafts((prev) => ({ ...prev, [result.user!.id]: result.user!.username }));
          setPasswordDrafts((prev) => ({ ...prev, [result.user!.id]: result.user!.password ?? newUserPassword }));
          setNewUserName("");
          setNewUsername("");
          setNewUserPassword("");
          setNewUserRole("user");
          Alert.alert("Tamam", "Kullanıcı eklendi");
        }}
      >
        <Text style={styles.buttonText}>{userBusy ? "Ekleniyor..." : "Kullanıcı ekle"}</Text>
      </Pressable>

      {users.map((item) => (
        <View key={item.id} style={styles.userCard}>
          <View style={styles.userHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userMeta}>
                {item.role === "admin" ? "Admin" : "Kullanıcı"}
                {item.id === user?.id ? " · Siz" : ""}
              </Text>
            </View>
          </View>
          <Text style={styles.passwordLabel}>Kullanıcı adı</Text>
          <TextInput
            value={usernameDrafts[item.id] ?? item.username}
            onChangeText={(text) =>
              setUsernameDrafts((prev) => ({ ...prev, [item.id]: text }))
            }
            autoCapitalize="none"
            placeholder="Kullanıcı adı"
            placeholderTextColor={colors.hint}
            style={styles.input}
          />
          <Text style={styles.passwordLabel}>Şifre</Text>
          <TextInput
            value={passwordDrafts[item.id] ?? item.password ?? ""}
            onChangeText={(text) =>
              setPasswordDrafts((prev) => ({ ...prev, [item.id]: text }))
            }
            autoCapitalize="none"
            placeholder="Şifre"
            placeholderTextColor={colors.hint}
            style={styles.input}
          />
          <View style={styles.userActions}>
            <Pressable
              disabled={userBusy}
              style={styles.userSave}
              onPress={async () => {
                const nextUsername = usernameDrafts[item.id] ?? item.username;
                const nextPassword = passwordDrafts[item.id] ?? "";
                Keyboard.dismiss();
                setUserBusy(true);
                const result = await updateAppUser(item.id, {
                  username: nextUsername,
                  password: nextPassword,
                });
                setUserBusy(false);
                if (result.error) {
                  Alert.alert("Hata", result.error);
                  return;
                }
                setUsers((prev) =>
                  prev.map((row) =>
                    row.id === item.id
                      ? { ...row, username: nextUsername.trim(), password: nextPassword.trim() }
                      : row
                  )
                );
                Alert.alert("Tamam", "Kullanıcı güncellendi");
              }}
            >
              <Text style={styles.userSaveText}>Kaydet</Text>
            </Pressable>
            <Pressable
              disabled={userBusy || item.id === user?.id}
              style={styles.userDelete}
              onPress={() => {
                if (item.id === user?.id) return;
                Alert.alert("Kullanıcıyı sil", `${item.name} silinsin mi?`, [
                  { text: "İptal", style: "cancel" },
                  {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                      setUserBusy(true);
                      const result = await deleteAppUser(item.id, user?.id ?? "");
                      setUserBusy(false);
                      if (result.error) {
                        Alert.alert("Hata", result.error);
                        return;
                      }
                      setUsers((prev) => prev.filter((row) => row.id !== item.id));
                      setUserCount((count) => Math.max(0, count - 1));
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.userDeleteText}>Sil</Text>
            </Pressable>
          </View>
        </View>
      ))}
      </>
      ) : (
      <>
      <Text style={styles.section}>Yeni ürün</Text>
      <Text style={styles.passwordLabel}>Ürün adı</Text>
      <TextInput
        value={productName}
        onChangeText={setProductName}
        placeholder="Ürün adı"
        placeholderTextColor={colors.hint}
        style={styles.input}
      />
      <Text style={styles.passwordLabel}>Fiyat</Text>
      <TextInput
        value={price}
        onChangeText={(text) => {
          const cleaned = text.replace(",", ".").replace(/[^\d.]/g, "");
          const [whole, ...rest] = cleaned.split(".");
          setPrice(rest.length > 0 ? `${whole}.${rest.join("").replace(/\./g, "")}` : whole);
        }}
        placeholder="Fiyat"
        placeholderTextColor={colors.hint}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={styles.input}
      />
      <Text style={styles.passwordLabel}>Stok</Text>
      <TextInput
        value={stock}
        onChangeText={(text) => setStock(text.replace(/\D/g, ""))}
        placeholder="Stok"
        placeholderTextColor={colors.hint}
        keyboardType="number-pad"
        inputMode="numeric"
        style={styles.input}
      />
      <Pressable
        onPress={() => {
          setCategoryPickTarget("new");
          setCategoryQuery("");
          setShowCategories(true);
        }}
        style={styles.categoryBar}
      >
        <View style={styles.categoryBarText}>
          <Text style={styles.categoryKicker}>Alt kategori</Text>
          <Text numberOfLines={1} style={styles.categoryValue}>
            {selectedCategoryName}
          </Text>
        </View>
        <Text style={styles.categoryAction}>Seç</Text>
      </Pressable>
      <Pressable onPress={chooseProductPhoto} style={styles.photoPick}>
        {productPhoto ? (
          <Image source={{ uri: productPhoto.uri }} style={styles.photoPreview} contentFit="cover" />
        ) : (
          <Text style={styles.photoPickText}>Fotoğraf ekle</Text>
        )}
      </Pressable>
      {productPhoto ? (
        <Pressable onPress={() => setProductPhoto(null)} style={styles.photoClear}>
          <Text style={styles.photoClearText}>Fotoğrafı kaldır</Text>
        </Pressable>
      ) : null}
      <Pressable
        disabled={catalogBusy}
        style={styles.button}
        onPress={async () => {
          Keyboard.dismiss();
          if (!selectedCategory?.parentId) {
            Alert.alert("Hata", "Alt kategori seçin");
            return;
          }
          setCatalogBusy(true);
          const result = await createProduct({
            name: productName,
            categoryId,
            price: parseFloat(price),
            stockQuantity: parseInt(stock, 10),
          });
          if (result.error || !result.product) {
            setCatalogBusy(false);
            Alert.alert("Hata", result.error ?? "Ürün eklenemedi");
            return;
          }
          let created = result.product;
          let photoError: string | undefined;
          if (productPhoto) {
            const uploaded = await uploadProductPhoto(created.id, productPhoto.uri, productPhoto.mime);
            if (uploaded.error || !uploaded.imageUrl) photoError = uploaded.error ?? "Fotoğraf yüklenemedi";
            else created = { ...created, image_url: uploaded.imageUrl };
          }
          setCatalogBusy(false);
          applyProductList([created, ...catalogProducts]);
          setProductName("");
          setPrice("");
          setStock("");
          setProductPhoto(null);
          Alert.alert(
            photoError ? "Ürün eklendi" : "Tamam",
            photoError ? `Fotoğraf yüklenemedi: ${photoError}` : "Ürün eklendi"
          );
        }}
      >
        <Text style={styles.buttonText}>{catalogBusy ? "Ekleniyor..." : "Ürün ekle"}</Text>
      </Pressable>

      <Text style={styles.section}>Yeni ana kategori</Text>
      <TextInput
        value={parentName}
        onChangeText={setParentName}
        placeholder="Ana kategori adı"
        placeholderTextColor={colors.hint}
        style={styles.input}
      />
      <Pressable
        disabled={catalogBusy}
        style={styles.button}
        onPress={async () => {
          Keyboard.dismiss();
          setCatalogBusy(true);
          const result = await createCategory(parentName, null);
          setCatalogBusy(false);
          if (result.error || !result.category) {
            Alert.alert("Hata", result.error ?? "Ana kategori eklenemedi");
            return;
          }
          setParentName("");
          setCategories(await getCategories());
          setParentCategoryId(result.category.id);
          Alert.alert("Tamam", "Ana kategori eklendi");
        }}
      >
        <Text style={styles.buttonText}>{catalogBusy ? "Ekleniyor..." : "Ana kategori ekle"}</Text>
      </Pressable>

      <Text style={styles.section}>Yeni alt kategori</Text>
      <Pressable
        onPress={() => {
          setCategoryPickTarget("parent");
          setCategoryQuery("");
          setShowCategories(true);
        }}
        style={styles.categoryBar}
      >
        <View style={styles.categoryBarText}>
          <Text style={styles.categoryKicker}>Ana kategori</Text>
          <Text numberOfLines={1} style={styles.categoryValue}>
            {selectedParent?.name ?? "Ana kategori seç"}
          </Text>
        </View>
        <Text style={styles.categoryAction}>Seç</Text>
      </Pressable>
      <TextInput
        value={catName}
        onChangeText={setCatName}
        placeholder="Alt kategori adı"
        placeholderTextColor={colors.hint}
        style={styles.input}
      />
      <Pressable
        disabled={catalogBusy}
        style={styles.button}
        onPress={async () => {
          Keyboard.dismiss();
          if (!parentCategoryId) {
            Alert.alert("Hata", "Ana kategori seçin");
            return;
          }
          setCatalogBusy(true);
          const result = await createCategory(catName, parentCategoryId);
          setCatalogBusy(false);
          if (result.error || !result.category) {
            Alert.alert("Hata", result.error ?? "Alt kategori eklenemedi");
            return;
          }
          setCatName("");
          setCategories(await getCategories());
          setCategoryId(result.category.id);
          Alert.alert("Tamam", "Alt kategori eklendi");
        }}
      >
        <Text style={styles.buttonText}>{catalogBusy ? "Ekleniyor..." : "Alt kategori ekle"}</Text>
      </Pressable>
      </>
      )}

      <Modal visible={showCategories} animationType="slide" onRequestClose={() => setShowCategories(false)}>
        <KeyboardAvoidingView
          style={[styles.categoryModal, { paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.categoryHead}>
            <Text style={styles.modalTitle}>
              {categoryPickTarget === "parent" ? "Ana kategori" : "Alt kategori"}
            </Text>
            <Pressable onPress={() => setShowCategories(false)}>
              <Text style={styles.closeText}>Kapat</Text>
            </Pressable>
          </View>
          <TextInput
            value={categoryQuery}
            onChangeText={setCategoryQuery}
            placeholder={categoryPickTarget === "parent" ? "Ana kategori ara..." : "Alt kategori ara..."}
            placeholderTextColor={colors.hint}
            style={styles.categorySearch}
          />
          {categoryPickTarget === "parent" ? (
            <FlatList
              data={filteredCategoryOptions}
              keyExtractor={(item) => item.id}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              initialNumToRender={16}
              windowSize={8}
              style={styles.categoryList}
              renderItem={({ item }) => {
                const active = item.id === parentCategoryId;
                return (
                  <Pressable
                    onPress={() => {
                      setParentCategoryId(item.id);
                      setShowCategories(false);
                    }}
                    style={active ? styles.categoryRowOn : styles.categoryRow}
                  >
                    <View style={active ? styles.checkOn : styles.checkOff}>
                      {active ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={active ? styles.categoryParentOn : styles.categoryParent}>{item.name}</Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>Ana kategori bulunamadı</Text>}
            />
          ) : (
            <CategoryFilterList
              categories={flatCategories}
              query={categoryQuery}
              selectedIds={
                categoryPickTarget === "edit"
                  ? productDraft.categoryId
                    ? [productDraft.categoryId]
                    : []
                  : categoryId
                    ? [categoryId]
                    : []
              }
              counts={productCountByCategory}
              selectParents={false}
              showCounts={false}
              onToggle={(id) => {
                const picked = flatCategories.find((cat) => cat.id === id);
                if (!picked?.parentId) return;
                if (categoryPickTarget === "edit") {
                  setProductDraft((prev) => ({ ...prev, categoryId: id }));
                } else {
                  setCategoryId(id);
                }
                setShowCategories(false);
              }}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: colors.bar, borderRadius: 18, padding: 18 },
  kicker: { color: colors.gold, fontWeight: "700" },
  hello: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 6 },
  stats: { marginTop: 12, gap: 4 },
  stat: { color: "rgba(255,255,255,0.8)" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  subtabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
    marginTop: 8,
    gap: 4,
  },
  tabOff: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabOn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.navy,
  },
  tabOffText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  tabOnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  section: { marginTop: 20, marginBottom: 8, fontWeight: "800", color: colors.navy },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  categoryBar: {
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
    marginBottom: 8,
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
  photoPick: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  photoPickText: { color: colors.navy, fontWeight: "800" },
  photoPreview: { width: "100%", height: "100%" },
  photoClear: { alignSelf: "flex-end", marginBottom: 8 },
  photoClearText: { color: colors.danger, fontWeight: "700" },
  categoryModal: { flex: 1, backgroundColor: colors.bg },
  categoryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { fontWeight: "800", fontSize: 18, color: colors.navy },
  closeText: { color: colors.navy, fontWeight: "700", fontSize: 16 },
  categoryHeadActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  categoryReset: { color: colors.danger, fontWeight: "700", fontSize: 15 },
  filterApply: {
    margin: 16,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  filterApplyText: { color: "#fff", fontWeight: "800", fontSize: 16 },
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
  empty: { textAlign: "center", color: colors.muted, marginTop: 24 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  roleOff: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleOn: {
    flex: 1,
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  roleOffText: { color: colors.text, fontWeight: "700" },
  roleOnText: { color: "#fff", fontWeight: "800" },
  userCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  userHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  userName: { fontWeight: "800", color: colors.navy, fontSize: 16 },
  userMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  passwordLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  userActions: { flexDirection: "row", gap: 8 },
  userSave: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  userSaveText: { color: "#fff", fontWeight: "800" },
  userDelete: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  userDeleteText: { color: colors.danger, fontWeight: "800" },
  userCancel: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  userCancelText: { color: colors.navy, fontWeight: "800" },
  button: { backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  buttonText: { color: "#fff", fontWeight: "800" },
});
