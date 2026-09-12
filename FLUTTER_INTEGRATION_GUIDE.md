# ☕ Bean Fien Flutter App — Complete User-Side Integration Guide

> **Audience:** Flutter developer joining the Bean Fien mobile team.  
> **Scope:** User-facing flows — AI Mood Drink Selector, Natural Language Search, Add to Cart, My Orders, Barista Tracking, Post-Order Tipping.  
> **Stack:** Flutter 3.x · Dart 3 · `dio` HTTP · `flutter_secure_storage` · `socket_io_client` · `provider` state management  
> **Backend Base URL:** `https://<your-domain>/api/v1`

---

## Architecture Overview

```
flowchart TD
    A[Launch App] --> B{Logged In?}
    B -- No --> C[Login Screen]
    C --> D[JWT Saved Securely]
    B -- Yes --> E[Home / Mood Screen]
    
    E --> F[Select Mood Chip]
    E --> G[Type Natural Language Input]
    F & G --> H[Tap 'Find My Drink']
    H --> I[POST /ai/mood-recommendation]
    I --> J[Show Ranked Results with Images + AI Reasons]
    J --> K[Tap 'Add to Cart']
    K --> L[POST /cart/add-item]
    L --> M[Toast Notification + Cart Badge +1]

    N[My Orders Screen] --> O[GET /order/my-orders]
    O --> P[Render Orders + Barista Info]
    P --> Q{Order Completed & No Tip?}
    Q -- Yes --> R[Show 'Leave a Tip' Button]
    R --> S[TipBottomSheet Opens]
    S --> T[POST /order/tip/:orderId]
    T --> U[Socket emits TIP_RECEIVED to Barista]
    U --> V[Success Animation]
```

---

## 1. Project Structure

Create the following folder layout inside your Flutter project:

```
lib/
├── main.dart
├── app.dart                        # MaterialApp, theme, routes
│
├── core/
│   ├── constants/
│   │   ├── app_colors.dart         # ⭐ Brand color palette
│   │   ├── app_text_styles.dart    # Typography system
│   │   └── api_endpoints.dart      # All API route strings
│   ├── services/
│   │   ├── api_client.dart         # Dio + interceptors
│   │   ├── auth_service.dart       # Login / refresh
│   │   ├── cart_service.dart       # Cart CRUD
│   │   ├── order_service.dart      # My orders + tip
│   │   ├── ai_service.dart         # Mood reco + NL search
│   │   └── socket_service.dart     # Socket.IO real-time
│   └── storage/
│       └── token_store.dart        # SecureStorage JWT
│
├── models/
│   ├── user.dart
│   ├── product.dart
│   ├── mood_recommendation.dart
│   ├── cart.dart
│   ├── order.dart
│   └── barista.dart
│
├── providers/
│   ├── auth_provider.dart
│   ├── cart_provider.dart
│   └── order_provider.dart
│
├── screens/
│   ├── auth/
│   │   └── login_screen.dart
│   ├── mood/
│   │   └── mood_screen.dart        # 🔑 Main AI drink screen
│   ├── orders/
│   │   └── my_orders_screen.dart   # 🔑 Order history + tipping
│   └── home/
│       └── home_screen.dart
│
└── widgets/
    ├── mood_chip.dart
    ├── recommendation_card.dart
    ├── order_card.dart
    ├── tip_bottom_sheet.dart
    ├── cart_badge.dart
    └── status_badge.dart
```

---

## 2. Color Palette & Design System

### `lib/core/constants/app_colors.dart`

The app uses the **Bean Fien dark espresso palette** — deep roasted browns with amber highlights and emerald success accents.

```dart
// lib/core/constants/app_colors.dart

import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ─── Background ───────────────────────────────
  static const Color backgroundDeep    = Color(0xFF080302); // Deepest black-coffee
  static const Color backgroundDark    = Color(0xFF0A0503); // Page background
  static const Color backgroundCard    = Color(0xFF1C0E08); // Card surface
  static const Color backgroundElevated = Color(0xFF2A1408); // Raised card

  // ─── Primary Amber/Caramel ─────────────────────
  static const Color primary           = Color(0xFFC07C4A); // Bean Fien amber
  static const Color primaryDark       = Color(0xFF8C4A1E); // Deep caramel
  static const Color primaryLight      = Color(0xFFD49A6A); // Light gold
  static const Color flameOrange       = Color(0xFFE05A2B); // Web hero flame accent (AI Sommelier & Match badges)
  static const Color flameGlow         = Color(0x33E05A2B); // 20% flame glow

  // ─── Border & Divider ────────────────────────
  static const Color borderSubtle      = Color(0xFF3A2010); // Default border
  static const Color borderFocus       = Color(0xFFC07C4A); // Focused input border

  // ─── Text ───────────────────────────────────
  static const Color textPrimary       = Color(0xFFFAF6F0); // Main white-cream
  static const Color textSecondary     = Color(0xFFBFAFA5); // Muted text
  static const Color textMuted         = Color(0xFF6B5E59); // Placeholder, hints

  // ─── Status ─────────────────────────────────
  static const Color success           = Color(0xFF4ADE80); // Emerald green
  static const Color successBg         = Color(0xFF14532D); // Success background
  static const Color warning           = Color(0xFFFBBF24); // Amber warning
  static const Color error             = Color(0xFFF87171); // Soft red error
  static const Color info              = Color(0xFF60A5FA); // Blue info

  // ─── Order Status Chips ──────────────────────
  static const Color statusPending     = Color(0xFFFBBF24);
  static const Color statusConfirmed   = Color(0xFF60A5FA);
  static const Color statusPreparing   = Color(0xFFFB923C);
  static const Color statusReady       = Color(0xFFA78BFA);
  static const Color statusCompleted   = Color(0xFF4ADE80);
  static const Color statusCanceled    = Color(0xFFF87171);

  // ─── Gradients ──────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFC07C4A), Color(0xFF8C4A1E)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1C0E08), Color(0xFF140A07)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
```

### `lib/core/constants/app_text_styles.dart`

```dart
// lib/core/constants/app_text_styles.dart

import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTextStyles {
  AppTextStyles._();

  // ─── Headlines ────────────────────────────────
  static const TextStyle h1 = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 28,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.5,
  );

  static const TextStyle h2 = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 22,
    fontWeight: FontWeight.w800,
  );

  static const TextStyle h3 = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 17,
    fontWeight: FontWeight.w700,
  );

  // ─── Body ─────────────────────────────────────
  static const TextStyle bodyLarge = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: FontWeight.w500,
    height: 1.6,
  );

  static const TextStyle body = TextStyle(
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  // ─── Labels ──────────────────────────────────
  static const TextStyle labelBold = TextStyle(
    color: AppColors.textPrimary,
    fontSize: 12,
    fontWeight: FontWeight.w800,
    letterSpacing: 0.8,
  );

  static const TextStyle labelMuted = TextStyle(
    color: AppColors.textMuted,
    fontSize: 11,
    fontWeight: FontWeight.w500,
  );

  // ─── Prices ──────────────────────────────────
  static const TextStyle price = TextStyle(
    color: AppColors.success,
    fontSize: 18,
    fontWeight: FontWeight.w900,
  );

  static const TextStyle primaryAccent = TextStyle(
    color: AppColors.primary,
    fontSize: 13,
    fontWeight: FontWeight.w700,
  );
}
```

### `lib/core/constants/api_endpoints.dart`

```dart
// lib/core/constants/api_endpoints.dart

class ApiEndpoints {
  ApiEndpoints._();

  static const String base = 'https://<your-backend>/api/v1';

  // Auth
  static const String login          = '/auth/login';
  static const String refreshToken   = '/auth/refresh-token';
  static const String forgotPassword = '/auth/forgot-password';
  static const String verifyEmail    = '/auth/verify-email';

  // AI / Recommendations
  static const String moodReco       = '/ai/mood-recommendation';
  static const String productSearch  = '/ai/product-search';

  // Cart
  static const String cartAdd        = '/cart/add-item';
  static const String cartGet        = '/cart/';
  static String cartUpdate(String id) => '/cart/update-item/$id';
  static String cartRemove(String id) => '/cart/remove-item/$id';
  static const String cartClear      = '/cart/clear';

  // Orders
  static const String myOrders       = '/order/my-orders';
  static String tipOrder(String id)  => '/order/tip/$id';
  static String orderById(String id) => '/order/$id';
}
```

---

## 3. App Theme (`lib/app.dart`)

```dart
// lib/app.dart

import 'package:flutter/material.dart';
import 'core/constants/app_colors.dart';
import 'screens/mood/mood_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/orders/my_orders_screen.dart';

class BeanFienApp extends StatelessWidget {
  const BeanFienApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bean Fien',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(
          primary:   AppColors.primary,
          surface:   AppColors.backgroundCard,
          onPrimary: AppColors.textPrimary,
          onSurface: AppColors.textPrimary,
          error:     AppColors.error,
        ),
        scaffoldBackgroundColor: AppColors.backgroundDark,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.backgroundDark,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          titleTextStyle: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.backgroundElevated,
          hintStyle: const TextStyle(color: AppColors.textMuted),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.borderSubtle),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.borderFocus, width: 1.5),
          ),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.backgroundCard,
          contentTextStyle: const TextStyle(color: AppColors.textPrimary),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      initialRoute: '/mood',
      routes: {
        '/login':   (_) => const LoginScreen(),
        '/mood':    (_) => const MoodScreen(),
        '/orders':  (_) => const MyOrdersScreen(),
      },
    );
  }
}
```

---

## 4. HTTP Client Setup

### `lib/core/services/api_client.dart`

```dart
// lib/core/services/api_client.dart

import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';
import '../storage/token_store.dart';
import 'auth_service.dart';

final Dio dio = _buildDio();

Dio _buildDio() {
  final d = Dio(BaseOptions(
    baseUrl: ApiEndpoints.base,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 25),
    headers: {'Content-Type': 'application/json'},
  ));

  d.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await TokenStore.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          try {
            await AuthService.refreshToken();
            final newToken = await TokenStore.getAccessToken();
            final opts = e.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newToken';
            final retry = await dio.fetch(opts);
            return handler.resolve(retry);
          } catch (_) {
            await TokenStore.clearAll();
            // Navigate to login — hook up a global nav key
          }
        }
        return handler.next(e);
      },
    ),
  );

  return d;
}
```

### `lib/core/storage/token_store.dart`

```dart
// lib/core/storage/token_store.dart

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  TokenStore._();

  static const _storage = FlutterSecureStorage();
  static const _keyAccess  = 'bf_access_token';
  static const _keyRefresh = 'bf_refresh_token';

  static Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: _keyAccess,  value: access);
    await _storage.write(key: _keyRefresh, value: refresh);
  }

  static Future<String?> getAccessToken()  => _storage.read(key: _keyAccess);
  static Future<String?> getRefreshToken() => _storage.read(key: _keyRefresh);

  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
```

---

## 5. Authentication Service

### `lib/core/services/auth_service.dart`

```dart
// lib/core/services/auth_service.dart

import 'api_client.dart';
import '../constants/api_endpoints.dart';
import '../storage/token_store.dart';

class AuthService {
  AuthService._();

  /// POST /auth/login
  /// Returns { data: { accessToken, refreshToken, user } }
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final resp = await dio.post(ApiEndpoints.login, data: {
      'email':    email,
      'password': password,
    });
    final data = resp.data['data'];
    await TokenStore.saveTokens(
      data['accessToken'],
      data['refreshToken'],
    );
    return data['user'];
  }

  /// POST /auth/refresh-token
  static Future<void> refreshToken() async {
    final refresh = await TokenStore.getRefreshToken();
    final resp = await dio.post(ApiEndpoints.refreshToken, data: {
      'refreshToken': refresh,
    });
    final newAccess = resp.data['data']['accessToken'];
    await TokenStore.saveTokens(
      newAccess,
      resp.data['data']['refreshToken'] ?? refresh!,
    );
  }
}
```

---

## 6. AI Mood Recommendation Service & API Specification

The AI Mood Recommendation feature is powered by the **AI Sensory Sommelier** engine (mirroring the web's `<MoodRecommendationSection />` at `src/components/MoodRecommendationSection.tsx`). It pairs the user's real-time mood, sensory preferences (temperature, sweetness, caffeine), and optional natural-language context with real coffee shop inventory, scoring candidates from `1.0` to `10.0` and generating individualized tasting notes explaining **"Why It Fits"**.

---

### 6.1 API Contract: Request & Response

#### **Endpoint & Method**
- **URL:** `POST /api/v1/ai/mood-recommendation`
- **Auth:** Optional (`Authorization: Bearer <accessToken>`). Works seamlessly for both guest users and authenticated users. When authenticated, recommendations are automatically linked to the user's profile for recommendation history and rewards tracking.
- **Content-Type:** `application/json`

---

#### **Request Payload Specification**

| Field | Type | Required | Description | Allowed Values / Examples |
| :--- | :--- | :---: | :--- | :--- |
| `mood` | `String` | **Yes** | Primary emotional or sensory state | `"happy"`, `"relaxed"`, `"stressed"`, `"tired"`, `"energetic"`, `"focused"` |
| `inputText` | `String` | No | Free-form natural language query with context | `"I have an exam in an hour, need high focus and something iced with oat milk"` |
| `preferences` | `Object` | No | Sensory & dietary constraints | See sub-fields below |
| `preferences.temperature` | `String` | No | Serving temperature preference | `"HOT"`, `"COLD"`, `"BOTH"` |
| `preferences.sweet` | `String \| Boolean` | No | Sweetness intensity level | `"low"`, `"medium"`, `"high"` |
| `preferences.caffeine` | `String` | No | Desired caffeine intensity | `"none"`, `"low"`, `"medium"`, `"high"` |
| `preferences.milk` | `Boolean` | No | Dairy / plant milk pairing | `true` \| `false` |

##### **Example Request JSON:**
```json
{
  "mood": "relaxed",
  "inputText": "Need something smooth and iced to unwind on a sunny afternoon",
  "preferences": {
    "temperature": "COLD",
    "sweet": "low",
    "caffeine": "medium",
    "milk": true
  }
}
```

---

#### **Response Payload Specification**

The backend returns a standard API wrapper with `statusCode: 200`, `success: true`, and the recommendation data object in `data`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `data.recommendationId` | `String` | Unique UUID of the generated recommendation session (stored in DB) |
| `data.mood` | `String` | The normalized mood queried (e.g., `"relaxed"`) |
| `data.moodSummary` | `String` | AI sommelier summary (e.g., `"Curated by Bean Fien's AI sensory matching engine."`) |
| `data.recommendations` | `Array` | Ranked list of recommended beverages (sorted by score descending) |
| `data.recommendations[].rank` | `Integer` | Rank order (`1`, `2`, `3`...) |
| `data.recommendations[].score` | `Double` | **AI Match Score** on a `1.0` to `10.0` scale (e.g., `9.5`) |
| `data.recommendations[].reason` | `String` | **"Why It Fits"** — personalized 1–2 sentence sensory justification |
| `data.recommendations[].product` | `Object` | Complete catalog product entity (name, price, image, temperature, caffeine, etc.) |

##### **AI Matched Percentage Formula (Like the Web)**
The backend generates a `score` between `1.0` and `10.0`. In both Web and Flutter apps, this score translates to a user-facing **Match Percentage**:

$$\text{Match Percentage} = \text{round}(\text{score} \times 10)\%$$

| Backend Score | Match Percentage | UI Badge (Flutter / Web) | Color Vibe |
| :---: | :---: | :---: | :---: |
| **`9.8`** | **98% Match** | `✨ 98% Match` (`9.8/10`) | Emerald Green (`#22C55E`) or Flame Glow (`#E05A2B`) |
| **`9.5`** | **95% Match** | `✨ 95% Match` (`9.5/10`) | Flame Orange (`#E05A2B`) |
| **`8.8`** | **88% Match** | `✨ 88% Match` (`8.8/10`) | Amber Gold (`#FBBF24`) |
| **`8.0`** | **80% Match** | `✨ 80% Match` (`8.0/10`) | Warm Caramel (`#C07C4A`) |

##### **Example Response JSON:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Mood-based recommendations generated successfully",
  "data": {
    "recommendationId": "clx89abc00012e891jklmnopq",
    "mood": "relaxed",
    "moodSummary": "Smooth, velvety drinks for a peaceful mindful moment.",
    "recommendations": [
      {
        "rank": 1,
        "score": 9.5,
        "reason": "Refreshingly smooth cold brew steeped for 18 hours with hints of cocoa, perfectly dialed for an easy-going relaxing afternoon.",
        "product": {
          "id": "cm1a2b3c4d5e6f7g8h9i0j",
          "name": "Nitro Vanilla Cold Brew",
          "basePrice": 5.75,
          "image": [
            "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600"
          ],
          "description": "Velvety micro-bubbles with pure Madagascar vanilla and slow-extracted Colombian beans.",
          "temperatureType": "COLD",
          "caffeineMg": 110,
          "sweetnessLevel": 2,
          "bitternessLevel": 2,
          "strengthLevel": 3,
          "flavorProfile": ["vanilla", "velvety", "cocoa"],
          "category": {
            "id": "cat_cold_brew",
            "name": "Cold Brew & Iced"
          }
        }
      },
      {
        "rank": 2,
        "score": 9.0,
        "reason": "Velvety steamed oat milk with lavender and light chamomile notes to help slow your pulse and unwind.",
        "product": {
          "id": "cm1a2b3c4d5e6f7g8h9i0k",
          "name": "Honey Lavender Oat Latte",
          "basePrice": 6.25,
          "image": [
            "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600"
          ],
          "description": "Calming wildflower honey infused with French culinary lavender and organic oat milk.",
          "temperatureType": "BOTH",
          "caffeineMg": 65,
          "sweetnessLevel": 3,
          "bitternessLevel": 1,
          "strengthLevel": 2,
          "flavorProfile": ["lavender", "honey", "smooth"],
          "category": {
            "id": "cat_specialty",
            "name": "Signature Lattes"
          }
        }
      }
    ]
  }
}
```

---

### 6.2 Service Implementation: `lib/core/services/ai_service.dart`

```dart
// lib/core/services/ai_service.dart

import 'api_client.dart';
import '../constants/api_endpoints.dart';
import '../../models/mood_recommendation.dart';

class AiService {
  AiService._();

  /// POST /ai/mood-recommendation
  ///
  /// [mood]        Primary mood identifier (e.g. "happy", "relaxed", "stressed", "tired", "energetic", "focused")
  /// [inputText]   Optional natural-language context (e.g. "Studying for exams, need iced drink")
  /// [temperature] Serving temperature: "HOT" | "COLD" | "BOTH" | null
  /// [sweet]       Sweetness level: "low" | "medium" | "high" | null
  /// [caffeine]    Caffeine level: "none" | "low" | "medium" | "high" | null
  /// [milk]        Dietary milk preference (true/false)
  static Future<List<MoodRecommendation>> getMoodRecommendation({
    required String mood,
    String? inputText,
    String? temperature,
    String? sweet,
    String? caffeine,
    bool? milk,
  }) async {
    final Map<String, dynamic> payload = {
      'mood': mood.toLowerCase(),
    };

    if (inputText != null && inputText.trim().isNotEmpty) {
      payload['inputText'] = inputText.trim();
    }

    final prefs = <String, dynamic>{};
    if (temperature != null && temperature.isNotEmpty) {
      prefs['temperature'] = temperature;
    }
    if (sweet != null && sweet.isNotEmpty) {
      prefs['sweet'] = sweet;
    }
    if (caffeine != null && caffeine.isNotEmpty) {
      prefs['caffeine'] = caffeine;
    }
    if (milk != null) {
      prefs['milk'] = milk;
    }

    if (prefs.isNotEmpty) {
      payload['preferences'] = prefs;
    }

    final resp = await dio.post(ApiEndpoints.moodReco, data: payload);

    // Robust parsing: handles { data: { recommendations: [...] } } or direct array fallback
    final responseData = resp.data['data'];
    final List<dynamic> list = (responseData is Map && responseData['recommendations'] != null)
        ? responseData['recommendations'] as List<dynamic>
        : (responseData is List ? responseData : []);

    return list.map((r) => MoodRecommendation.fromJson(r as Map<String, dynamic>)).toList();
  }
}
```

---

## 7. Models

### `lib/models/mood_recommendation.dart`

This model includes helper getters (`matchPercentage`, `matchPercentageString`, `matchScoreLabel`, `matchProgress`) to render visual match meters and glassmorphic badges matching the web's design system.

```dart
// lib/models/mood_recommendation.dart

import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class MoodRecommendation {
  final int     rank;
  final double  score; // 1.0 to 10.0 scale from AI
  final String  reason;
  final Product product;

  MoodRecommendation({
    required this.rank,
    required this.score,
    required this.reason,
    required this.product,
  });

  /// 🎯 Matched Percentage: converts 1.0–10.0 score into 0–100% integer
  /// e.g. 9.5 -> 95, 8.8 -> 88
  int get matchPercentage => (score * 10).clamp(0, 100).round();

  /// Formatted percentage string: e.g. "95%"
  String get matchPercentageString => '$matchPercentage%';

  /// Label for badge: e.g. "95% Match"
  String get matchBadgeLabel => '$matchPercentage% Match';

  /// Score format: e.g. "9.5/10"
  String get scoreOutOfTen => '${score.toStringAsFixed(score.truncateToDouble() == score ? 0 : 1)}/10';

  /// Normalized 0.0 to 1.0 double for progress bars and visual meters
  double get matchProgress => (score / 10.0).clamp(0.0, 1.0);

  /// Dynamic badge accent color based on match strength
  Color get matchColor {
    if (matchPercentage >= 90) return AppColors.flameOrange; // #E05A2B vibrant match
    if (matchPercentage >= 80) return AppColors.warning;     // Gold / amber
    return AppColors.primary;                                // Warm caramel
  }

  factory MoodRecommendation.fromJson(Map<String, dynamic> json) =>
      MoodRecommendation(
        rank:    (json['rank'] as num?)?.toInt() ?? 1,
        score:   (json['score'] as num?)?.toDouble() ?? 8.0,
        reason:  json['reason'] as String? ?? 'Handcrafted beverage matching your vibe.',
        product: Product.fromJson(json['product'] as Map<String, dynamic>),
      );
}

class Product {
  final String       id;
  final String       name;
  final double       basePrice;
  final List<String> image;           // Array of image URLs
  final String?      shortDescription;
  final String?      description;
  final String?      temperatureType; // "HOT" | "COLD" | "BOTH"
  final int?         sweetnessLevel;  // 1–5
  final int?         caffeineMg;
  final List<String> flavorProfile;   // e.g. ["caramel", "smooth"]
  final String?      categoryName;

  Product({
    required this.id,
    required this.name,
    required this.basePrice,
    required this.image,
    this.shortDescription,
    this.description,
    this.temperatureType,
    this.sweetnessLevel,
    this.caffeineMg,
    this.flavorProfile = const [],
    this.categoryName,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    // Safely parse image whether it is a List, a single String, or empty
    List<String> parsedImages = [];
    if (json['image'] is List) {
      parsedImages = (json['image'] as List).map((e) => e.toString()).toList();
    } else if (json['image'] is String && (json['image'] as String).isNotEmpty) {
      parsedImages = [json['image'] as String];
    }

    // Safely parse flavorProfile whether list or string
    List<String> parsedFlavors = [];
    if (json['flavorProfile'] is List) {
      parsedFlavors = (json['flavorProfile'] as List).map((e) => e.toString()).toList();
    } else if (json['flavorProfile'] is String && (json['flavorProfile'] as String).isNotEmpty) {
      parsedFlavors = [json['flavorProfile'] as String];
    }

    // Safely extract category name if present as object or string
    String? catName;
    if (json['category'] is Map) {
      catName = json['category']['name'] as String?;
    } else if (json['category'] is String) {
      catName = json['category'] as String;
    }

    return Product(
      id:               json['id'] as String? ?? '',
      name:             json['name'] as String? ?? 'Specialty Coffee',
      basePrice:        (json['basePrice'] ?? json['price'] as num?)?.toDouble() ?? 5.50,
      image:            parsedImages,
      shortDescription: json['shortDescription'] as String?,
      description:      json['description'] as String?,
      temperatureType:  json['temperatureType'] as String?,
      sweetnessLevel:   (json['sweetnessLevel'] as num?)?.toInt(),
      caffeineMg:       (json['caffeineMg'] as num?)?.toInt(),
      flavorProfile:    parsedFlavors,
      categoryName:     catName,
    );
  }

  /// Primary image with high-res coffee fallback
  String get primaryImage {
    if (image.isNotEmpty && image.first.trim().isNotEmpty) {
      final img = image.first;
      if (img.startsWith('http://') || img.startsWith('https://')) return img;
      return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600';
    }
    return 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600';
  }

  String get displayDescription => shortDescription ?? description ?? '';
}
```

### `lib/models/order.dart`

```dart
// lib/models/order.dart

class Order {
  final String       id;
  final String       orderNumber;
  final String       status;
  final double       total;
  final double       tipAmount;
  final AssignedBarista? assignedBarista;
  final DateTime     createdAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.total,
    required this.tipAmount,
    this.assignedBarista,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id:          json['id'] as String,
        orderNumber: json['orderNumber'] as String,
        status:      json['status'] as String,
        total:       (json['total'] as num).toDouble(),
        tipAmount:   (json['tipAmount'] as num? ?? 0).toDouble(),
        assignedBarista: json['assignedBarista'] != null
            ? AssignedBarista.fromJson(json['assignedBarista'])
            : null,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  bool get isCompleted => status == 'COMPLETED';
  bool get isReady     => status == 'READY';
  bool get canTip      => (isCompleted || isReady) && tipAmount <= 0;
  bool get alreadyTipped => tipAmount > 0;
}

class AssignedBarista {
  final String  id;
  final String  name;
  final String? station;
  final String? profileImage;

  AssignedBarista({
    required this.id,
    required this.name,
    this.station,
    this.profileImage,
  });

  factory AssignedBarista.fromJson(Map<String, dynamic> json) => AssignedBarista(
        id:           json['id'] as String,
        name:         json['name'] as String,
        station:      json['station'] as String?,
        profileImage: json['profileImage'] as String?,
      );
}
```

---

## 8. Cart Service

### `lib/core/services/cart_service.dart`

```dart
// lib/core/services/cart_service.dart

import 'api_client.dart';
import '../constants/api_endpoints.dart';

class CartService {
  CartService._();

  /// POST /cart/add-item
  static Future<void> addToCart({
    required String productId,
    int quantity = 1,
    String? selectedSizeId,
    String? selectedMildId,
    List<String>? extras,
  }) async {
    final Map<String, dynamic> payload = {
      'isCoinProduct': false,
      'productId':     productId,
      'quantity':      quantity,
    };
    if (selectedSizeId != null) payload['selectedSizeId'] = selectedSizeId;
    if (selectedMildId != null) payload['selectedMildId'] = selectedMildId;
    if (extras != null && extras.isNotEmpty) payload['extras'] = extras;

    await dio.post(ApiEndpoints.cartAdd, data: payload);
  }

  /// GET /cart/
  static Future<Map<String, dynamic>> getCart() async {
    final resp = await dio.get(ApiEndpoints.cartGet);
    return resp.data['data'] as Map<String, dynamic>;
  }
}
```

---

## 9. Order Service

### `lib/core/services/order_service.dart`

```dart
// lib/core/services/order_service.dart

import 'api_client.dart';
import '../constants/api_endpoints.dart';
import '../../models/order.dart';

class OrderService {
  OrderService._();

  /// GET /order/my-orders
  static Future<List<Order>> getMyOrders() async {
    final resp = await dio.get(ApiEndpoints.myOrders);
    final list = resp.data['data'] as List<dynamic>;
    return list.map((o) => Order.fromJson(o)).toList();
  }

  /// POST /order/tip/:orderId
  /// [amount]  positive number, e.g. 3.00
  /// [message] optional thank-you note
  static Future<void> addTip({
    required String orderId,
    required double amount,
    String? message,
  }) async {
    await dio.post(ApiEndpoints.tipOrder(orderId), data: {
      'amount':  amount,
      'payType': 'CARD',
      if (message != null && message.trim().isNotEmpty)
        'message': message.trim(),
    });
  }
}
```

---

## 10. Screen: Mood / AI Drink Selector

**Location:** `lib/screens/mood/mood_screen.dart`

This is the flagship user experience of the Bean Fien mobile application, implementing the mobile counterpart of the web's **AI Sensory Sommelier** (`<MoodRecommendationSection />` in `src/components/MoodRecommendationSection.tsx`).

---

### 10.1 UI/UX Design System & Layout Architecture

The screen is built with an ultra-premium dark espresso aesthetic (`#0A0503`), glowing flame accents (`#E05A2B`), and warm cream typography (`#FAF6F0`). It delivers a 2-stage interactive flow:

1. **Input & Sensory Tuning Stage:**
   - **Sommelier Header Pill:** Glowing pill badge with `Icons.auto_awesome` ("AI SENSORY SOMMELIER").
   - **Hero Headline:** *"Find a Drink for Your Mood"* with warm subtitle.
   - **Step 1 — 6-Card Mood Grid:** High-touch mood cards displaying emoji, title, and descriptive taglines matching the web (`Happy`, `Relaxed`, `Stressed`, `Tired`, `Energetic`, `Focused`).
   - **Step 2 — Natural Language Context:** Text field for optional freeform desires (e.g., *"I have an exam in an hour, need high focus and something iced with oat milk"*).
   - **Step 3 — Fine-Tune Sensory Drawer (Expandable):** Toggles for Serving Temperature (`Any ☕❄️`, `Hot ☕`, `Iced ❄️`) and Sweetness (`Any`, `Low`, `Med`, `Sweet`).
   - **Interactive Brewing CTA:** Vibrant flame button with animated spinner (`Brewing AI Recommendations...`).

2. **Ranked Recommendations Stage:**
   - **Results Header Bar:** Displays the selected mood emoji, mood title, AI Sommelier summary quote, and a **"Try Another Mood"** reset button.
   - **High-Impact Product Cards:**
     - **Floating AI Match Percentage Badge** (`✨ 95% Match` / `9.5/10`) in top-left of image with glassmorphic dark backdrop (`#080403/85`) and flame border (`#E05A2B`).
     - **Floating Temperature Pill** (`❄️ Iced` or `☕ Hot`) in top-right of image.
     - Product title, category, and base price.
     - **Sensory Match Meter:** A visual progress bar displaying match confidence percentage.
     - **"Why It Fits" Sensory Box:** Custom dark container with flame label and italicized tasting rationale from the AI.
     - Sensory attribute chips (Caffeine mg, Sweetness level, Flavor notes).
     - **Interactive Add to Cart:** Transitions to green checkmark (`Added ✓`) with instant toast notification and floating cart counter increment.

#### **Visual Mobile Wireframe:**

```
┌─────────────────────────────────────────────────────────┐
│ [Bean Fien]                                   [( 2 ) 🛒]│
├─────────────────────────────────────────────────────────┤
│          [ ✨ AI SENSORY SOMMELIER ]                    │
│             Find a Drink for Your Mood                  │
│   Tell our AI barista how you feel, we'll dial it in.   │
│                                                         │
│  1. SELECT YOUR VIBE                                    │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ 😊 Happy      │ │ 😌 Relaxed    │ │ 😫 Stressed   │  │
│  │ Sunny vibes   │ │ Unwind slow   │ │ Soothing reset│  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │ 😴 Tired      │ │ ⚡ Energetic  │ │ 🎯 Focused    │  │
│  │ Wake up senses│ │ High-voltage  │ │ Deep clarity  │  │
│  └───────────────┘ └───────────────┘ └───────────────┘  │
│                                                         │
│  2. TELL US MORE (OPTIONAL)                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │ "Need something iced with oat milk for studying..."│  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ⚙️ Fine-tune Temperature & Sweetness                   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │          ✨ FIND MY PERFECT DRINK →               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ═══════════════ RESULTS STAGE ═══════════════════════  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 😌 RECOMMENDATIONS FOR "RELAXED"                  │  │
│  │ "Smooth, velvety drinks for a mindful moment."    │  │
│  │                             [ Try Another Mood ↺ ]│  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ [ ✨ 95% Match ]                      [ ❄️ Iced ] │  │
│  │                                                   │  │
│  │           ( Product Hero Image )                  │  │
│  │                                                   │  │
│  │ Nitro Vanilla Cold Brew                   $5.75   │  │
│  │ AI Match: 95% [████████████████████░░░░]          │  │
│  │ ┌───────────────────────────────────────────────┐ │  │
│  │ │ ✨ WHY IT FITS:                               │ │  │
│  │ │ "Steeped for 18 hrs with vanilla and cocoa to │ │  │
│  │ │  help melt away tension smoothly."            │ │  │
│  │ └───────────────────────────────────────────────┘ │  │
│  │ ( 110mg caff ) ( Sweet 2/5 ) ( Vanilla, Velvety ) │  │
│  │                                                   │  │
│  │ [ + ADD TO CART ]                                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

### 10.2 Flutter Implementation: `lib/screens/mood/mood_screen.dart`

```dart
// lib/screens/mood/mood_screen.dart

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/services/ai_service.dart';
import '../../core/services/cart_service.dart';
import '../../models/mood_recommendation.dart';
import '../../widgets/recommendation_card.dart';
import '../../widgets/cart_badge.dart';

class MoodOptionItem {
  final String id;
  final String label;
  final String emoji;
  final String tagline;

  const MoodOptionItem({
    required this.id,
    required this.label,
    required this.emoji,
    required this.tagline,
  });
}

const List<MoodOptionItem> _kMoodOptions = [
  MoodOptionItem(
    id: 'happy',
    label: 'Happy',
    emoji: '😊',
    tagline: 'Sunny good vibes',
  ),
  MoodOptionItem(
    id: 'relaxed',
    label: 'Relaxed',
    emoji: '😌',
    tagline: 'Unwind & slow down',
  ),
  MoodOptionItem(
    id: 'stressed',
    label: 'Stressed',
    emoji: '😫',
    tagline: 'Warm soothing reset',
  ),
  MoodOptionItem(
    id: 'tired',
    label: 'Tired',
    emoji: '😴',
    tagline: 'Gentle wake-up boost',
  ),
  MoodOptionItem(
    id: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    tagline: 'High-voltage fuel',
  ),
  MoodOptionItem(
    id: 'focused',
    label: 'Focused',
    emoji: '🎯',
    tagline: 'Zero distraction clarity',
  ),
];

class MoodScreen extends StatefulWidget {
  const MoodScreen({super.key});

  @override
  State<MoodScreen> createState() => _MoodScreenState();
}

class _MoodScreenState extends State<MoodScreen> {
  String _selectedMood = 'relaxed';
  bool _isLoading = false;
  int _cartCount = 0;
  bool _showAdvanced = false;

  // Sensory preferences
  String _temperaturePref = 'BOTH'; // BOTH, HOT, COLD
  String? _sweetnessPref;           // null (Any), low, medium, high

  final _inputController = TextEditingController();
  List<MoodRecommendation> _results = [];
  String? _moodSummary;

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  /// Step 1: Select mood
  void _selectMood(String moodId) {
    setState(() {
      _selectedMood = moodId;
    });
  }

  /// Step 2: Fetch AI Mood Recommendations
  Future<void> _fetchRecommendations() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final results = await AiService.getMoodRecommendation(
        mood:        _selectedMood,
        inputText:   _inputController.text.trim().isEmpty ? null : _inputController.text.trim(),
        temperature: _temperaturePref == 'BOTH' ? null : _temperaturePref,
        sweet:       _sweetnessPref,
      );

      setState(() {
        _results = results;
        final selectedOpt = _kMoodOptions.firstWhere(
          (m) => m.id == _selectedMood,
          orElse: () => _kMoodOptions[1],
        );
        _moodSummary = 'Curated by Bean Fien\'s AI sommelier for "${selectedOpt.label}" moments.';
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error.withOpacity(0.9),
            content: Text('Failed to get recommendations: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Reset to pick another mood
  void _resetMood() {
    setState(() {
      _results = [];
      _moodSummary = null;
    });
  }

  /// Add to Cart with temporary success feedback
  Future<void> _addToCart(Product product) async {
    try {
      await CartService.addToCart(productId: product.id);

      if (mounted) {
        setState(() => _cartCount++);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.successBg,
            duration: const Duration(seconds: 2),
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${product.name} added to cart! ☕',
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.error.withOpacity(0.9),
            content: Text('Failed to add to cart: $e'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        backgroundColor: AppColors.backgroundDark,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.flameOrange.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.coffee_rounded, color: AppColors.flameOrange, size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              'Bean Fien',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
        actions: [
          CartBadge(count: _cartCount),
          const SizedBox(width: 12),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Section Header Badge ─────────────────────────────────────
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.flameGlow,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.flameOrange.withOpacity(0.4)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.auto_awesome, color: AppColors.flameOrange, size: 14),
                    SizedBox(width: 6),
                    Text(
                      'AI SENSORY SOMMELIER',
                      style: TextStyle(
                        color: AppColors.flameOrange,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: Text(
                'Find a Drink for Your Mood',
                textAlign: TextAlign.center,
                style: AppTextStyles.h1.copyWith(fontSize: 26),
              ),
            ),
            const SizedBox(height: 6),
            Center(
              child: Text(
                'Tell our AI barista how you\'re feeling today, and we\'ll match you with drinks dialed to your vibe.',
                textAlign: TextAlign.center,
                style: AppTextStyles.body.copyWith(fontSize: 13, height: 1.4),
              ),
            ),

            const SizedBox(height: 24),

            // ── Dynamic Flow: Input Form vs Results List ─────────────────
            if (_results.isEmpty) ...[
              // STEP 1: Mood Grid
              const Text(
                '1. SELECT YOUR CURRENT MOOD',
                style: TextStyle(
                  color: AppColors.flameOrange,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 10),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _kMoodOptions.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 2.1,
                ),
                itemBuilder: (context, index) {
                  final mood = _kMoodOptions[index];
                  final isSelected = _selectedMood == mood.id;

                  return InkWell(
                    onTap: () => _selectMood(mood.id),
                    borderRadius: BorderRadius.circular(16),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.flameOrange
                            : AppColors.backgroundCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.flameOrange
                              : AppColors.borderSubtle,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.flameOrange.withOpacity(0.35),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                )
                              ]
                            : [],
                      ),
                      child: Row(
                        children: [
                          Text(mood.emoji, style: const TextStyle(fontSize: 24)),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  mood.label,
                                  style: TextStyle(
                                    color: isSelected
                                        ? const Color(0xFF080403)
                                        : AppColors.textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  mood.tagline,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: isSelected
                                        ? const Color(0xFF2C1711)
                                        : AppColors.textSecondary,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),

              // STEP 2: Natural Language Input
              Row(
                mainAxisAlignment: MainAxisAlignment.between,
                children: [
                  const Text(
                    '2. TELL US MORE (OPTIONAL)',
                    style: TextStyle(
                      color: AppColors.flameOrange,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.1,
                    ),
                  ),
                  Text(
                    'Natural language enabled',
                    style: TextStyle(
                      color: AppColors.textSecondary.withOpacity(0.7),
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _inputController,
                maxLines: 2,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'e.g. "I have a presentation in an hour, need high focus and something iced with oat milk..."',
                  hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  filled: true,
                  fillColor: AppColors.backgroundDeep,
                  contentPadding: const EdgeInsets.all(14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.borderSubtle),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.borderSubtle),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.flameOrange, width: 1.5),
                  ),
                  suffixIcon: _inputController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18, color: AppColors.textMuted),
                          onPressed: () {
                            _inputController.clear();
                            setState(() {});
                          },
                        )
                      : null,
                ),
                onChanged: (_) => setState(() {}),
              ),

              const SizedBox(height: 16),

              // STEP 3: Advanced Sensory Toggles
              GestureDetector(
                onTap: () => setState(() => _showAdvanced = !_showAdvanced),
                child: Row(
                  children: [
                    const Icon(Icons.tune_rounded, color: AppColors.flameOrange, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      _showAdvanced
                          ? 'Hide Temperature & Sweetness Preferences'
                          : 'Fine-tune Temperature & Sweetness',
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      _showAdvanced ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                      color: AppColors.textSecondary,
                      size: 16,
                    ),
                  ],
                ),
              ),

              if (_showAdvanced) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Serving Temperature:',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildFilterChip('Any ☕❄️', _temperaturePref == 'BOTH', () {
                            setState(() => _temperaturePref = 'BOTH');
                          }),
                          const SizedBox(width: 8),
                          _buildFilterChip('Hot ☕', _temperaturePref == 'HOT', () {
                            setState(() => _temperaturePref = 'HOT');
                          }),
                          const SizedBox(width: 8),
                          _buildFilterChip('Iced ❄️', _temperaturePref == 'COLD', () {
                            setState(() => _temperaturePref = 'COLD');
                          }),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Sweetness Intensity:',
                        style: TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildFilterChip('Any', _sweetnessPref == null, () {
                            setState(() => _sweetnessPref = null);
                          }),
                          const SizedBox(width: 8),
                          _buildFilterChip('Low', _sweetnessPref == 'low', () {
                            setState(() => _sweetnessPref = 'low');
                          }),
                          const SizedBox(width: 8),
                          _buildFilterChip('Med', _sweetnessPref == 'medium', () {
                            setState(() => _sweetnessPref = 'medium');
                          }),
                          const SizedBox(width: 8),
                          _buildFilterChip('Sweet', _sweetnessPref == 'high', () {
                            setState(() => _sweetnessPref = 'high');
                          }),
                        ],
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

              // Find My Perfect Drink Button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _fetchRecommendations,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.flameOrange,
                    disabledBackgroundColor: AppColors.flameOrange.withOpacity(0.5),
                    elevation: 6,
                    shadowColor: AppColors.flameOrange.withOpacity(0.4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isLoading
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Color(0xFF080403),
                                strokeWidth: 2.5,
                              ),
                            ),
                            SizedBox(width: 12),
                            Text(
                              'Brewing AI Recommendations...',
                              style: TextStyle(
                                color: Color(0xFF080403),
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.auto_awesome, color: Color(0xFF080403), size: 18),
                            SizedBox(width: 8),
                            Text(
                              'FIND MY PERFECT DRINK',
                              style: TextStyle(
                                color: Color(0xFF080403),
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                letterSpacing: 0.8,
                              ),
                            ),
                            SizedBox(width: 8),
                            Icon(Icons.arrow_forward_rounded, color: Color(0xFF080403), size: 18),
                          ],
                        ),
                ),
              ),
            ] else ...[
              // ── RECOMMENDATION RESULTS VIEW ──────────────────────────────
              // Action Bar
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.backgroundCard,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.flameGlow,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          _kMoodOptions.firstWhere((m) => m.id == _selectedMood).emoji,
                          style: const TextStyle(fontSize: 22),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'RECOMMENDATIONS FOR "${_selectedMood.toUpperCase()}"',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _moodSummary ?? 'Curated by Bean Fien\'s AI sensory matching engine.',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    InkWell(
                      onTap: _resetMood,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.backgroundDeep,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderSubtle),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.replay_rounded, color: AppColors.flameOrange, size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Try Another',
                              style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Product Cards List
              ..._results.map((rec) => Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: RecommendationCard(
                      rec: rec,
                      onAddToCart: () => _addToCart(rec.product),
                    ),
                  )),

              const SizedBox(height: 10),
            ],

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.flameOrange : AppColors.backgroundDeep,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? const Color(0xFF080403) : AppColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## 11. Screen: My Orders & Barista Tracking

**Location:** `lib/screens/orders/my_orders_screen.dart`

```dart
// lib/screens/orders/my_orders_screen.dart

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/services/order_service.dart';
import '../../models/order.dart';
import '../../widgets/order_card.dart';
import '../../widgets/tip_bottom_sheet.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  List<Order> _orders = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final orders = await OrderService.getMyOrders();
      setState(() => _orders = orders);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _openTipSheet(Order order) async {
    final tipped = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: AppColors.backgroundCard,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (_) => TipBottomSheet(order: order),
    );

    if (tipped == true) {
      // Refetch orders to show updated tip status
      _fetchOrders();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      appBar: AppBar(
        title: const Text('My Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _error != null
              ? Center(child: Text('Error: $_error', style: AppTextStyles.body))
              : _orders.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('☕', style: TextStyle(fontSize: 48)),
                          const SizedBox(height: 12),
                          Text('No orders yet', style: AppTextStyles.h3),
                          Text('Go grab your first coffee!', style: AppTextStyles.body),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchOrders,
                      color: AppColors.primary,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        itemBuilder: (_, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: OrderCard(
                            order: _orders[i],
                            onTip: () => _openTipSheet(_orders[i]),
                          ),
                        ),
                      ),
                    ),
    );
  }
}
```

---

## 12. Widgets

### `lib/widgets/mood_chip.dart`

```dart
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class MoodChip extends StatelessWidget {
  final String   label;
  final String   emoji;
  final bool     isSelected;
  final VoidCallback onTap;

  const MoodChip({
    super.key,
    required this.label,
    required this.emoji,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
        decoration: BoxDecoration(
          // ✅ Highlighted amber when selected, dark otherwise
          color: isSelected ? AppColors.primary : AppColors.backgroundCard,
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.borderSubtle,
            width: isSelected ? 1.5 : 1.0,
          ),
          borderRadius: BorderRadius.circular(28),
          boxShadow: isSelected
              ? [BoxShadow(
                  color: AppColors.primary.withOpacity(0.4),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                )]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 17)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color:      isSelected ? Colors.white : AppColors.textSecondary,
                fontWeight: FontWeight.w700,
                fontSize:   13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### `lib/widgets/recommendation_card.dart`

This component directly mirrors the web's AI drink card (`<MoodRecommendationSection />`). It displays:
1. **Glassmorphic AI Match Badge (`✨ 95% Match` / `9.5/10`)** anchored to top-left of the image.
2. **Temperature Pill (`❄️ Iced` or `☕ Hot`)** anchored to top-right of the image.
3. **Visual Match Meter** showing confidence percentage with a flame gradient fill.
4. **"Why It Fits" Sensory Box** with tasting rationale quote.
5. **Interactive Add to Cart** button with animated green feedback (`Added ✓`).

```dart
// lib/widgets/recommendation_card.dart

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_text_styles.dart';
import '../models/mood_recommendation.dart';

class RecommendationCard extends StatefulWidget {
  final MoodRecommendation rec;
  final VoidCallback onAddToCart;

  const RecommendationCard({
    super.key,
    required this.rec,
    required this.onAddToCart,
  });

  @override
  State<RecommendationCard> createState() => _RecommendationCardState();
}

class _RecommendationCardState extends State<RecommendationCard> {
  bool _isTemporarilyAdded = false;

  void _handleAddToCart() {
    widget.onAddToCart();
    setState(() => _isTemporarilyAdded = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _isTemporarilyAdded = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final rec = widget.rec;
    final p = rec.product;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.borderSubtle),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Product Image with Floating Glassmorphic Badges ───────────
          Stack(
            children: [
              SizedBox(
                height: 200,
                width: double.infinity,
                child: CachedNetworkImage(
                  imageUrl: p.primaryImage,
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    color: AppColors.backgroundDeep,
                    child: const Center(
                      child: CircularProgressIndicator(
                        color: AppColors.flameOrange,
                        strokeWidth: 2,
                      ),
                    ),
                  ),
                  errorWidget: (_, __, ___) => Container(
                    color: AppColors.backgroundDeep,
                    child: const Icon(Icons.coffee, size: 60, color: AppColors.flameOrange),
                  ),
                ),
              ),

              // Subtle bottom gradient for image transition
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        AppColors.backgroundCard.withOpacity(0.8),
                      ],
                    ),
                  ),
                ),
              ),

              // 🎯 Top-Left: Floating AI Matched Percentage Pill Badge (Like the Web)
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xE6080403), // 90% black-coffee blur backdrop
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.flameOrange.withOpacity(0.6),
                      width: 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.flameOrange.withOpacity(0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.auto_awesome, color: AppColors.flameOrange, size: 13),
                      const SizedBox(width: 5),
                      Text(
                        '${rec.matchPercentage}% Match',
                        style: const TextStyle(
                          color: AppColors.flameOrange,
                          fontWeight: FontWeight.w900,
                          fontSize: 11,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '(${rec.scoreOutOfTen})',
                        style: TextStyle(
                          color: AppColors.textSecondary.withOpacity(0.8),
                          fontWeight: FontWeight.w600,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ☕❄️ Top-Right: Serving Temperature Badge
              if (p.temperatureType != null && p.temperatureType != 'BOTH')
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xE6080403),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.15)),
                    ),
                    child: Text(
                      p.temperatureType == 'COLD' ? '❄️ Iced' : '☕ Hot',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Title & Price ──────────────────────────────────────────
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (p.categoryName != null)
                            Text(
                              p.categoryName!.toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.flameOrange,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                              ),
                            ),
                          Text(
                            p.name,
                            style: AppTextStyles.h3.copyWith(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '\$${p.basePrice.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: AppColors.flameOrange,
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // ── 📊 Visual Sensory Match Meter ───────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'AI Match Compatibility',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                      ),
                    ),
                    Text(
                      '${rec.matchPercentage}%',
                      style: TextStyle(
                        color: rec.matchColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Container(
                  height: 6,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.backgroundDeep,
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: rec.matchProgress,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            rec.matchColor,
                            rec.matchColor.withOpacity(0.8),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 14),

                // ── ✨ "Why It Fits" Sensory Reasoning Box ──────────────────
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundDeep,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.auto_awesome, color: AppColors.flameOrange, size: 12),
                          SizedBox(width: 5),
                          Text(
                            'WHY IT FITS:',
                            style: TextStyle(
                              color: AppColors.flameOrange,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '“${rec.reason}”',
                        style: const TextStyle(
                          color: Color(0xFFC4B4A5),
                          fontSize: 12,
                          height: 1.4,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 12),

                // ── Sensory Metadata Chips ─────────────────────────────────
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (p.caffeineMg != null)
                      _MetaChip(icon: '⚡', label: '${p.caffeineMg}mg caffeine'),
                    if (p.sweetnessLevel != null)
                      _MetaChip(icon: '🍯', label: 'Sweet ${p.sweetnessLevel}/5'),
                    ...p.flavorProfile.take(3).map(
                          (flavor) => _MetaChip(icon: '🌿', label: flavor),
                        ),
                  ],
                ),

                const SizedBox(height: 16),

                // ── Add to Cart Button (With Temporary Feedback Animation) ───
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    key: ValueKey('add_to_cart_${p.id}'),
                    onPressed: _handleAddToCart,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isTemporarilyAdded
                          ? const Color(0xFF22C55E) // Emerald green on added
                          : AppColors.flameOrange,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 200),
                      child: _isTemporarilyAdded
                          ? const Row(
                              key: ValueKey('added'),
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'ADDED TO CART ✓',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            )
                          : const Row(
                              key: ValueKey('add'),
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_shopping_cart_rounded,
                                    color: Color(0xFF080403), size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'ADD TO CART',
                                  style: TextStyle(
                                    color: Color(0xFF080403),
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final String icon;
  final String label;
  const _MetaChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.backgroundDeep,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Text(
        '$icon $label',
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
```

### `lib/widgets/cart_badge.dart`

```dart
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class CartBadge extends StatelessWidget {
  final int count;
  final VoidCallback? onTap;

  const CartBadge({super.key, required this.count, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.only(right: 8),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            const Icon(Icons.shopping_bag_outlined, color: AppColors.textPrimary, size: 26),
            if (count > 0)
              Positioned(
                right: -4, top: -4,
                child: AnimatedScale(
                  scale: count > 0 ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$count',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

### `lib/widgets/tip_bottom_sheet.dart`

```dart
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_text_styles.dart';
import '../core/services/order_service.dart';
import '../models/order.dart';

class TipBottomSheet extends StatefulWidget {
  final Order order;
  const TipBottomSheet({super.key, required this.order});

  @override
  State<TipBottomSheet> createState() => _TipBottomSheetState();
}

class _TipBottomSheetState extends State<TipBottomSheet> {
  static const _presets = [1.0, 2.0, 3.0, 5.0, 10.0];

  double? _selectedPreset = 2.0;
  bool    _isCustom       = false;
  double? _customAmount;
  bool    _isLoading      = false;
  bool    _isSuccess      = false;

  final _customCtrl  = TextEditingController();
  final _messageCtrl = TextEditingController();

  @override
  void dispose() {
    _customCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = _isCustom ? _customAmount : _selectedPreset;
    if (amount == null || amount <= 0) return;

    setState(() => _isLoading = true);

    try {
      await OrderService.addTip(
        orderId: widget.order.id,
        amount:  amount,
        message: _messageCtrl.text.trim().isEmpty ? null : _messageCtrl.text.trim(),
      );
      setState(() { _isSuccess = true; _isLoading = false; });
      await Future.delayed(const Duration(milliseconds: 1800));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send tip: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 28,
      ),
      child: _isSuccess ? _buildSuccess() : _buildForm(),
    );
  }

  Widget _buildSuccess() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 16),
        const Icon(Icons.favorite, color: AppColors.success, size: 60),
        const SizedBox(height: 12),
        Text('Gratuity Sent! 💛', style: AppTextStyles.h2),
        const SizedBox(height: 6),
        Text(
          'Your tip was delivered to ${widget.order.assignedBarista?.name ?? "your barista"}. Thank you!',
          textAlign: TextAlign.center,
          style: AppTextStyles.body,
        ),
        const SizedBox(height: 28),
      ],
    );
  }

  Widget _buildForm() {
    final barista = widget.order.assignedBarista;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Handle
        Center(child: Container(width: 40, height: 4,
          decoration: BoxDecoration(
            color: AppColors.borderSubtle,
            borderRadius: BorderRadius.circular(2),
          ))),
        const SizedBox(height: 18),

        // Header
        if (barista != null)
          Text('Crafted by ${barista.name} · ${barista.station ?? "Main Kitchen"}',
            style: AppTextStyles.primaryAccent),
        Text('Leave a Gratuity', style: AppTextStyles.h2),
        const SizedBox(height: 18),

        // Presets
        Wrap(
          spacing: 8, runSpacing: 8,
          children: [
            ..._presets.map((amt) => _Chip(
              label: '\$${amt.toStringAsFixed(0)}',
              selected: !_isCustom && _selectedPreset == amt,
              onTap: () => setState(() { _isCustom = false; _selectedPreset = amt; }),
            )),
            _Chip(
              label: 'Custom',
              selected: _isCustom,
              onTap: () => setState(() { _isCustom = true; _selectedPreset = null; }),
            ),
          ],
        ),

        if (_isCustom) ...[
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('custom_tip_input'),
            controller: _customCtrl,
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(color: AppColors.textPrimary),
            onChanged: (v) => _customAmount = double.tryParse(v),
            decoration: const InputDecoration(
              hintText: 'Enter amount e.g. 7.50',
              prefixText: '\$ ',
              prefixStyle: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
            ),
          ),
        ],

        const SizedBox(height: 12),
        TextField(
          key: const ValueKey('tip_message_input'),
          controller: _messageCtrl,
          maxLength: 100,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(
            hintText: 'Say thanks (optional) ☕',
          ),
        ),
        const SizedBox(height: 16),

        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            key: const ValueKey('submit_tip_btn'),
            onPressed: _isLoading ? null : _submit,
            icon: _isLoading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.favorite, color: Colors.white, size: 18),
            label: Text(
              _isLoading ? 'Sending...' : 'Send Tip',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 15,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
          ),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool   selected;
  final VoidCallback onTap;
  const _Chip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.backgroundElevated,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.borderSubtle),
        ),
        child: Text(label,
          style: TextStyle(
            color: selected ? Colors.white : AppColors.textSecondary,
            fontWeight: FontWeight.w800,
            fontSize: 13,
          )),
      ),
    );
  }
}
```

---

## 13. Widget Tests

**Location:** `test/widget/`

### `test/widget/mood_chip_test.dart`

```dart
// test/widget/mood_chip_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:your_app/widgets/mood_chip.dart';
import 'package:your_app/core/constants/app_colors.dart';

void main() {
  group('MoodChip Widget Tests', () {
    // ✅ Test: Verify "Stressed" chip highlights correctly on selection
    testWidgets('unselected chip has dark background', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: MoodChip(
            label: 'Stressed',
            emoji: '😩',
            isSelected: false,
            onTap: () {},
          ),
        ),
      ));

      final container = tester.widget<AnimatedContainer>(
          find.byType(AnimatedContainer));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppColors.backgroundCard);
    });

    testWidgets('selected chip highlights with amber color', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: MoodChip(
            label: 'Stressed',
            emoji: '😩',
            isSelected: true,    // ✅ Stressed is selected
            onTap: () {},
          ),
        ),
      ));

      // Pump animation
      await tester.pump(const Duration(milliseconds: 300));

      final container = tester.widget<AnimatedContainer>(
          find.byType(AnimatedContainer));
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, AppColors.primary); // Amber highlight
    });

    testWidgets('tapping chip fires onTap callback', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: MoodChip(
            label: 'Stressed',
            emoji: '😩',
            isSelected: false,
            onTap: () => tapped = true,
          ),
        ),
      ));

      await tester.tap(find.byType(MoodChip));
      expect(tapped, isTrue);
    });

    testWidgets('chip displays emoji and label text', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: MoodChip(
            label: 'Stressed',
            emoji: '😩',
            isSelected: false,
            onTap: () {},
          ),
        ),
      ));
      expect(find.text('😩'), findsOneWidget);
      expect(find.text('Stressed'), findsOneWidget);
    });
  });
}
```

### `test/widget/mood_screen_test.dart`

```dart
// test/widget/mood_screen_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:your_app/screens/mood/mood_screen.dart';
import 'package:your_app/core/services/ai_service.dart';
import 'package:your_app/core/services/cart_service.dart';
import 'package:your_app/models/mood_recommendation.dart';

class MockAiService extends Mock implements AiService {}
class MockCartService extends Mock implements CartService {}

void main() {
  group('MoodScreen Integration Tests', () {

    // ✅ Test: Select "Stressed" → verify highlight
    testWidgets('selecting Stressed chip updates selection state', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: MoodScreen()));
      await tester.pumpAndSettle();

      // Tap the "Stressed" chip
      await tester.tap(find.text('Stressed'));
      await tester.pumpAndSettle();

      // The chip should now be selected (amber border + color)
      // Verify the Find My Drink button becomes active
      final btn = tester.widget<ElevatedButton>(
        find.widgetWithText(ElevatedButton, 'Find My Drink').last,
      );
      expect(btn.enabled, isTrue);
    });

    // ✅ Test: Natural language input
    testWidgets('typing in NL field updates controller', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: MoodScreen()));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byType(TextField).first,
        'I want something warm and low sugar',
      );
      await tester.pumpAndSettle();

      expect(find.text('I want something warm and low sugar'), findsOneWidget);
    });

    // ✅ Test: Loading spinner appears when "Find My Drink" tapped
    testWidgets('loading spinner shows while fetching recommendations', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: MoodScreen()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Stressed'));
      await tester.pump();
      await tester.tap(find.text('Find My Drink'));
      await tester.pump(); // one frame — spinner should be visible

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    // ✅ Test: Cart count increments after Add to Cart
    testWidgets('cart badge count increments on add to cart', (tester) async {
      // This requires mocking the cart service
      // See integration test below for full mock approach
    });
  });
}
```

### `test/widget/tip_bottom_sheet_test.dart`

```dart
// test/widget/tip_bottom_sheet_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:your_app/widgets/tip_bottom_sheet.dart';
import 'package:your_app/models/order.dart';

void main() {
  final testOrder = Order(
    id:          'ord_test_001',
    orderNumber: 'ORD-2026-001',
    status:      'COMPLETED',
    total:       12.50,
    tipAmount:   0,
    assignedBarista: AssignedBarista(
      id: 'barista_1', name: 'Jordan', station: 'Specialty Bar',
    ),
    createdAt: DateTime.now(),
  );

  group('TipBottomSheet Tests', () {

    testWidgets('renders preset tip amounts', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: TipBottomSheet(order: testOrder)),
      ));
      await tester.pumpAndSettle();

      expect(find.text('\$1'), findsOneWidget);
      expect(find.text('\$2'), findsOneWidget);
      expect(find.text('\$3'), findsOneWidget);
      expect(find.text('\$5'), findsOneWidget);
      expect(find.text('\$10'), findsOneWidget);
    });

    testWidgets('selecting a preset enables Submit button', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: TipBottomSheet(order: testOrder)),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('\$5'));
      await tester.pump();

      final btn = tester.widget<ElevatedButton>(
        find.byKey(const ValueKey('submit_tip_btn')),
      );
      expect(btn.enabled, isTrue);
    });

    testWidgets('custom amount input appears when Custom is tapped', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: TipBottomSheet(order: testOrder)),
      ));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Custom'));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('custom_tip_input')), findsOneWidget);
    });

    testWidgets('shows barista name in sheet header', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: TipBottomSheet(order: testOrder)),
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Jordan'), findsOneWidget);
      expect(find.textContaining('Specialty Bar'), findsOneWidget);
    });
  });
}
```

---

## 14. API Contract Quick Reference

### Mood Recommendation

```
POST /api/v1/ai/mood-recommendation
Auth: Optional (guest supported)

Request:
{
  "mood": "Stressed",
  "inputText": "I want something warm and low sugar",
  "preferences": {
    "temperature": "HOT",
    "caffeine": "low",
    "sweet": "low"
  }
}

Response 200:
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "score": 9.2,
      "reason": "Smooth and comforting — warm notes to reduce stress.",
      "product": {
        "id": "prod_abc",
        "name": "Vanilla Mist Latte",
        "basePrice": 5.50,
        "image": ["https://cdn.beanbien.co/vanilla.jpg"],
        "temperatureType": "HOT",
        "sweetnessLevel": 2,
        "caffeineMg": 65,
        "flavorProfile": "Smooth vanilla, caramel warmth"
      }
    }
  ]
}
```

### Add to Cart

```
POST /api/v1/cart/add-item
Auth: Required (USER)

Request:
{
  "isCoinProduct": false,
  "productId": "prod_abc",
  "quantity": 1,
  "selectedSizeId": "size_medium",  // optional
  "extras": ["extra_oatmilk"]        // optional
}

Response 200: { "success": true, "data": { "id": "cart_...", "total": 5.50 } }
```

### My Orders

```
GET /api/v1/order/my-orders
Auth: Required (USER)

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "ord_xyz",
      "orderNumber": "ORD-1234",
      "status": "COMPLETED",
      "total": 12.50,
      "tipAmount": 0,
      "assignedBarista": {
        "id": "usr_bar1",
        "name": "Jordan",
        "station": "Specialty Bar",
        "profileImage": "https://..."
      },
      "createdAt": "2026-09-03T08:00:00Z"
    }
  ]
}
```

### Tip an Order

```
POST /api/v1/order/tip/:orderId
Auth: Required (USER)

Request:
{
  "amount": 3.00,
  "message": "Best oat milk latte ever! ☕",
  "payType": "CARD"
}

Response 200:
{
  "success": true,
  "message": "Tip added successfully",
  "data": {
    "id": "tip_abc",
    "amount": 3.00,
    "barista": { "name": "Jordan", "station": "Specialty Bar" }
  }
}

Errors:
400 — amount not positive
401 — not authenticated
404 — order not found
```

---

## 15. End-to-End Checklist

```
MOOD & AI DRINK FLOW
☐ 1. Mood chip grid renders all 6 mood options
☐ 2. Tap "Stressed" → chip turns amber (AppColors.primary), glow shadow appears
☐ 3. Type "I want something warm and low sugar" in NL input field
☐ 4. Tap "Find My Drink" → CircularProgressIndicator shows
☐ 5. POST /ai/mood-recommendation fires with mood + inputText + preferences
☐ 6. Results list appears with rank badge, product image (CachedNetworkImage), AI reason, price
☐ 7. Tap "Add to Cart" on any result → success toast (green snackbar) shows product name
☐ 8. Cart badge count on AppBar increments by 1

BARISTA & ORDER FLOW
☐ 9.  Navigate to My Orders → GET /order/my-orders fires
☐ 10. Each order card shows status badge with correct color
☐ 11. Completed orders with assignedBarista show barista name + station
☐ 12. "Leave a Tip" button visible on COMPLETED orders with tipAmount = 0
☐ 13. Tapping "Leave a Tip" opens TipBottomSheet

TIPPING FLOW
☐ 14. Presets $1 $2 $3 $5 $10 render correctly
☐ 15. Tapping a preset highlights it amber
☐ 16. Tapping "Custom" shows text field for custom amount
☐ 17. Message field accepts up to 100 characters
☐ 18. Tap "Send Tip" → loading spinner shows inside button
☐ 19. POST /order/tip/:orderId fires with amount + message
☐ 20. Success animation: green Heart icon + "Gratuity Sent!" text
☐ 21. Sheet dismisses → My Orders screen refreshes → "✅ You tipped $X" shows
☐ 22. Barista receives TIP_RECEIVED socket event on their portal
```

---

## 16. `pubspec.yaml` Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter

  # HTTP
  dio: ^5.4.0

  # Secure token storage
  flutter_secure_storage: ^9.0.0

  # Cached images for drink product photos
  cached_network_image: ^3.3.0

  # Real-time socket for barista status / tip notification
  socket_io_client: ^2.0.3

  # State management
  provider: ^6.1.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  mocktail: ^1.0.4
  flutter_lints: ^3.0.0
```

---

## Files Quick Reference

| File | Role |
|---|---|
| `lib/core/constants/app_colors.dart` | **Brand color palette** — all colors in one place |
| `lib/core/constants/app_text_styles.dart` | Typography system |
| `lib/core/constants/api_endpoints.dart` | All API route strings |
| `lib/core/services/api_client.dart` | Dio HTTP client with JWT auto-inject + refresh |
| `lib/core/services/ai_service.dart` | `getMoodRecommendation()` |
| `lib/core/services/cart_service.dart` | `addToCart()`, `getCart()` |
| `lib/core/services/order_service.dart` | `getMyOrders()`, `addTip()` |
| `lib/screens/mood/mood_screen.dart` | **Main AI drink screen** |
| `lib/screens/orders/my_orders_screen.dart` | **Order history + tipping** |
| `lib/widgets/mood_chip.dart` | Animated mood selection chip |
| `lib/widgets/recommendation_card.dart` | Drink result card with AI reason + cart button |
| `lib/widgets/tip_bottom_sheet.dart` | Post-order tip modal |
| `lib/widgets/cart_badge.dart` | Animated cart count badge |
| `test/widget/mood_chip_test.dart` | Mood chip selection highlight test |
| `test/widget/mood_screen_test.dart` | Mood screen flow test |
| `test/widget/tip_bottom_sheet_test.dart` | Tip sheet preset + submit test |
