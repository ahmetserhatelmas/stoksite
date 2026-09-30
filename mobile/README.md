# Assos Stok — mobil (iOS + Android)

Web sitesi aynı kalır. Bu uygulama aynı Supabase verisini kullanır: ürün, cari, fatura, mesaj, kullanıcı.

## Çalıştırma

```bash
cd mobile
cp ../.env.local .env   # veya aşağıdaki değişkenleri yazın
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_ANON_KEY=
# EXPO_PUBLIC_WEB_URL=http://TABLET_IN_AYNI_AGINDAKI_WEB:3000

npm start
```

Telefonda / tablette Expo Go ile QR okutun, veya:

```bash
npm run android
npm run ios
```

Yerel ürün fotoğrafları (`/products/assos/...`) için `EXPO_PUBLIC_WEB_URL` web sunucusunun adresine işaret etmeli. Uzak Assos / Supabase görselleri doğrudan yüklenir.

## APK (tabletlere dağıtım)

```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

`preview` profili **APK** üretir. Bitince EAS linkinden indirip tabletlere kopyalayın (USB, Drive, WhatsApp).

iOS tabletlere (iPad) dağıtım için Apple Developer hesabı gerekir:

```bash
npx eas-cli build --platform ios --profile preview
```

## Giriş

Web ile aynı kullanıcılar: `app_users` tablosu (ör. admin / user).
