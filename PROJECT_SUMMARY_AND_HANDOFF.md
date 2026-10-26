# DutyLens BD — Complete Project Summary, Architecture & Cross-Platform Handoff Guide

**Date:** October 26, 2026  
**Application Name:** DutyLens BD — AI HS Code Finder & Bangladesh Customs (NBR) Import VAT, Duty & Trade Intelligence Platform  
**Live Public Web App:** [https://dutylens-bd.vercel.app](https://dutylens-bd.vercel.app)  
**Privacy Policy URL (Play Store Ready):** [https://dutylens-bd.vercel.app/privacy.html](https://dutylens-bd.vercel.app/privacy.html)  
**Android Package ID:** `com.dutylensbd.app` (`targetSdkVersion 35` — Android 15)  
**GitHub Repository:** [https://github.com/saidurhridoy/HS-Code](https://github.com/saidurhridoy/HS-Code)

---

## 1. Chronological Summary of Everything Built in This Session

### Phase 1: Core AI HS Code Finder & Bangladesh NBR Compound Tax Engine
- **Official Tariff Dataset (`data/wco-hs2022.csv` & `server/tariff/`)**:
  - Integrated **6,940 WCO HS2022 hierarchy nodes** (`Sections I–XXI`, `97 Chapters`, `1,229 Headings`, `5,616` 8-digit tariff lines) merged with **80 curated high-frequency Bangladesh Operative Tariff Schedule (BCT)** items (`8471.30.00` laptops, `8517.13.00` smartphones, `8541.43.00` solar PV panels, `8452.29.00` industrial sewing machines, `0402.21.10 / .90` retail vs. bulk milk powder, `8703` hybrid/petrol/EV vehicles, RMG textiles, polymers, steel, pharmaceuticals, etc.).
- **Hybrid AI Classification Engine (`server/engine/`)**:
  - Works **100% out-of-the-box without requiring any external API key** using custom BM25 lexical retrieval + bilingual (English + বাংলা / Banglish) NLP material/form/end-use extraction + WCO General Rules of Interpretation (`GRI 1–6`).
  - Supports optional **Bring-Your-Own-Key (BYOK) LLM RAG** (`Google Gemini 2.0 Flash`, `OpenAI GPT-4o-mini`, `Groq Llama-3.3-70B`, or any custom OpenAI-compatible endpoint) grounded strictly against retrieved NBR tariff candidates so the AI never hallucinates invalid HS codes.
- **Exact Statutory Bangladesh NBR Compound Tax Calculator (`shared/tax-math.ts`)**:
  - Implements statutory ASYCUDA World valuation & cascading formulas:
    - `CIF = CFR + Insurance` (statutory `1%` if uncertified)
    - `Assessable Value (AV) = CIF × 1.01` (`1%` statutory landing charge)
    - `CD = AV × CD%`
    - `RD = AV × RD%`
    - `SD = (AV + CD + RD) × SD%`
    - `VAT = (AV + CD + RD + SD) × VAT%` (standard `15%`)
    - `AIT = AV × AIT%` (standard `5%`, `2%` / `0%` on qualifying inputs)
    - `AT = (AV + CD + RD + SD) × AT%` (`5%` Commercial IRC / `3%` Industrial IRC)
  - Supports multi-currency (`USD`, `EUR`, `GBP`, `CNY`, `INR`, `BDT`), `FOB / CFR / CIF` Incoterms, `Commercial / Industrial / Capital Machinery (1% CD) / Export Bonded (0%)` regimes, and `APTA / SAFTA / Bhutan PTA` preferential origins.
- **Technical Duty Reduction & VAT Rebate Simulator (`shared/tax-optimizer.ts`)**:
  - Quantifies legal tax-saving pathways (`1% Capital Machinery SRO`, `3% AT Industrial IRC`, `APTA / SAFTA CoO`, `Bulk >2.5kg vs. Retail Pack Tariff Engineering`, `CKD/SKD Local Assembly`, `1% -> ~0.35% Local Marine Insurance Cover Note`).
  - Compares **`15% Standard VAT` (full `s.46` Input VAT Rebate)** vs. **`5% Trade VAT` (`0%` Input VAT Rebate)** across custom markups, proving the exact **`62.16%` value-addition breakeven point**, with step-by-step `Mushak-6.3`, `Mushak-9.1`, `Mushak-4.3`, `ITA s.120/s.163`, and `DEDO` checklists.

### Phase 2: Supabase Cloud Database & Public Vercel Deployment
- **Supabase PostgreSQL (`ckkqhvplfftpnawcvtij`, `ap-northeast-1`)**:
  - Provisioned RLS-protected tables: `public.tariff_curated_bct` (80 rows seeded), `public.shared_assessments` (shareable `?share=dl-...` cloud links), and `public.classification_logs` (live cloud classification feed), with automatic zero-downtime in-memory fallback when running offline.
- **Vercel Serverless + Vite SPA (`https://dutylens-bd.vercel.app`)**:
  - Configured `api/index.ts` Serverless Express handler + `vercel.json` rewrites + encrypted environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_TOKEN_SECRET`).

### Phase 3: Bilingual (`EN | বাংলা`) Switcher, Bottom `Summarize` Briefing & User Profile Accounts
- **Top-Right `EN | বাংলা` Switcher (`src/lib/i18n.ts`, `src/components/Navbar.tsx`)**:
  - Instant English / Bengali UI & technical customs glossary translation (`AV`, `CD`, `RD`, `SD`, `VAT`, `AIT`, `AT`, `TTI`, `Mushak-9.1`, `Sunk Duty`, `CPC/SRO`).
- **Bottom `Summarize` Button (`src/components/ExecutiveSummaryPanel.tsx`)**:
  - Condenses the entire shipment assessment into a 30-second plain-language 4-card executive briefing + live BDT-contextualized technical customs dictionary + 1-click Copy Summary.
- **User Sign Up, Login & Profile Saved Queries (`server/auth-store.ts`, `src/components/AuthProfileModal.tsx`)**:
  - Placed right beside the top-right language switcher.
  - Sign Up captures **Full Name, Company Name, Business Role (`Importer / Exporter / Both`), Mobile Number, Email, and Password** (`scrypt` hashed; HMAC-SHA256 bearer tokens).
  - Provisioned `public.app_users` and `public.user_saved_queries` in Supabase so every logged-in user's queries are automatically saved to their profile and reloadable in 1 click.

### Phase 4: Camera / Photo Upload, Product Link Analyzer & 4-Pillar Strategic Trade Intelligence
- **Multimodal Product Input (`server/engine/source-analyzer.ts`, `src/components/MultimodalSourceInput.tsx`)**:
  - **Camera / Photo Upload**: Live webcam/phone camera viewfinder (`getUserMedia` + mobile `capture="environment"`), drag-and-drop image compression, Multimodal Vision LLM support (`Gemini`, `OpenAI`, `Groq Vision`) + out-of-the-box PNG/EXIF label extraction, browser `TextDetector` OCR, visual category chips, and 4 built-in sample spec-label photos.
  - **Product Link Submit**: Scrapes Schema.org `JSON-LD` & OpenGraph product specs/prices from **Alibaba, 1688, Made-in-China, AliExpress, Amazon, IndiaMART, Flipkart, Daraz**, etc., with anti-bot URL slug intelligence, SSRF protection, and automatic Preferential Origin detection (`China -> APTA`, `India -> SAFTA`).
- **4-Pillar Strategic Trade Intelligence (`shared/trade-intelligence.ts`, `src/components/AlternativeTradeIntelligencePanel.tsx`)**:
  1. **Alternative Duty & Tax Matrix**: Side-by-side comparison across Commercial, Industrial IRC, Capital Machinery, Bonded, and runner-up adjacent HS-8 codes.
  2. **Tax Rebate Scope**: Exact recoverable BDT (`15% VAT` + `AT` + `AIT` + `DEDO`) vs. sunk duty and local recovery %.
  3. **Zero-Tax Options (`0%` Duty)**: Legal zero/near-zero pathways (`100% Export Bonded 0%`, `BEPZA EPZ / BEZA / Hi-Tech Park 0%`, `Statutory 0% CD / 1% Capital Machinery`, `Bhutan PTA 0% CD`, `DEDO 100% Drawback`).
  4. **Best Import Destination**: Ranked **Bangladesh Entry Ports** (`Chattogram CHC`, `Mongla`, `Dhaka Air HSIA`, `Benapole Land`, `CEPZ/BEZA Free Zone`), **Global Sourcing Country Matrix**, and **Regional Destination Hub Tariff Benchmark** (`BD`, `BD EPZ`, `Singapore`, `Dubai JAFZA`, `Vietnam`, `India`).

### Phase 5: Portable Multi-Platform Bundle & Play Store Android App (`APK` + `AAB`)
- Packaged full cross-platform deployment assets (`supabase/schema.sql`, `.env.example`, `Dockerfile`, `docker-compose.yml`), full Android Studio Gradle source (`android/`), Digital Asset Links (`.well-known/assetlinks.json`), V1+V2+V3 release-signed `APK`, and Play Console `.aab`.

---

## 2. Project Directory Map

```text
HS-Code/
├── api/index.ts                 # Vercel Serverless Express API entrypoint
├── data/                        # Official WCO HS2022 CSVs (6,940 rows + 21 Sections)
├── shared/
│   ├── types.ts                 # Shared TypeScript interfaces across client & server
│   ├── tax-math.ts              # NBR statutory compound duty/VAT & 15% vs 5% rebate math
│   ├── tax-optimizer.ts         # Legal NBR duty-reduction & Mushak/DEDO playbook engine
│   └── trade-intelligence.ts    # 4-Pillar Alternative Duty, Rebate, Zero-Tax & Port engine
├── server/
│   ├── index.ts                 # Unified Express + Vite/static production server (0.0.0.0:3000)
│   ├── app.ts                   # REST API routes (/api/classify, /api/analyze-source, /api/auth/*)
│   ├── auth-store.ts            # scrypt password hashing, HMAC tokens & Supabase profile CRUD
│   ├── supabase-store.ts        # PostgREST client with automatic offline memory fallback
│   ├── tariff/                  # Curated BCT overrides & 5,616-entry tariff store
│   └── engine/                  # Bilingual NLP analyzer, BM25 index, classifier & photo/URL analyzer
├── src/
│   ├── App.tsx                  # Main React SPA orchestrating all tabs, auth, i18n & calculators
│   ├── components/              # MultimodalSourceInput, AlternativeTradeIntelligencePanel,
│   │                            # NbrTaxCalculator, TaxOptimizationAdvisor, ExecutiveSummaryPanel,
│   │                            # AuthProfileModal, TariffExplorer, BatchInvoiceAnalyzer, Navbar
│   └── lib/                     # i18n.ts (EN/বাংলা glossary), api.ts, format.ts, presets.ts
├── supabase/schema.sql          # Standalone PostgreSQL / Supabase database setup script
├── android/                     # Full Android Studio / Gradle project (com.dutylensbd.app, SDK 35)
├── public/                      # privacy.html, manifest.json, .well-known/assetlinks.json
├── Dockerfile & docker-compose.yml
└── releases/                    # Portable ZIP, Signed Release APK, Play Store AAB & Keystore ZIP
```

---

## 3. Reusing & Deploying on Another Platform (Using `dutylens-bd-portable-full.zip`)

### Option A: Docker / VPS / AWS / DigitalOcean / Render / Railway / Coolify
1. Extract `dutylens-bd-portable-full.zip` and copy `.env.example` to `.env`.
2. (Optional) Run `supabase/schema.sql` inside any Supabase or PostgreSQL database and paste `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `AUTH_TOKEN_SECRET` into `.env`.
3. Launch with one command:
   ```bash
   docker compose up --build -d
   ```
   The unified frontend + API server listens on `http://0.0.0.0:3000`.

### Option B: Standard Node.js Hosting (Ubuntu / PM2 / cPanel Node.js / Heroku)
```bash
npm install
npm run build
NODE_ENV=production PORT=3000 npm start
```

### Option C: Vercel / Serverless Hosting
1. Import the extracted repository into Vercel.
2. Build Command: `npm run build` | Output Directory: `dist/client`.
3. Add environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `AUTH_TOKEN_SECRET`.

---

## 4. Android APK & Google Play Store Upload Guide

### Generated Android Deliverables (`releases/`)
1. **`releases/dutylens-bd-v1.0.0-release.apk`**
   - **Direct-Installable Signed Release APK** (`zipalign` 4-byte aligned, APK Signature Scheme **v1 + v2 + v3**).
   - Ready to install directly on any Android 7.0+ (`API 24–35`) smartphone, distribute via website download, or upload to APK stores / Play Console Internal App Sharing.
2. **`releases/dutylens-bd-v1.0.0-playstore.aab`**
   - **Official Google Play Store Android App Bundle (`.aab`)** targeting **Android 15 (`targetSdkVersion = 35`)** and signed with your release upload key (`META-INF/DUTYLENS.RSA`).
   - *Note:* Google Play Console requires `.aab` format when creating new production store releases, while `.apk` is used for direct phone installation. Both are included and signed with the exact same key!
3. **`releases/dutylens-bd-signing-credentials.zip`** *(Keep Private & Back Up Safely!)*
   - Contains `dutylens-bd-upload.jks` (2048-bit RSA Upload Keystore, 10,000-day validity), `KEYSTORE_CREDENTIALS.txt`, and `playstore-icon-512.png` (512×512 Play Store listing icon).
   - **Certificate SHA-256 Fingerprint** (already live in `https://dutylens-bd.vercel.app/.well-known/assetlinks.json`):
     `50:62:9E:B2:A5:C1:CD:CA:55:02:A9:7C:50:01:E0:06:89:C5:55:CB:49:4C:DB:4E:2D:12:D9:0A:6A:4C:D0:9C`

### Step-by-Step Google Play Console Submission
1. Sign in to [Google Play Console](https://play.google.com/console) → **Create app**:
   - **App name:** `DutyLens BD — HS Code & Tax AI`
   - **Default language:** `English (United States)` (add `Bangla – bn-BD` translation if desired)
   - **App or game:** `App` | **Free or paid:** `Free`
2. Complete **App content** declarations:
   - **Privacy policy URL:** `https://dutylens-bd.vercel.app/privacy.html` (already live!)
   - **App access:** Core HS classification, NBR tax calculator, rebate simulator, zero-tax options, and port analyzer work **without login**; optional user account saves query history.
   - **Data safety:** Declare optional Account Info (Name, Email, Phone, Company) & transient Camera/Photo input for product classification (encrypted in transit, user-deletable).
3. Under **Store settings → Main store listing**:
   - Upload `playstore-icon-512.png` (512×512 PNG inside `dutylens-bd-signing-credentials.zip` or `android/playstore-icon-512.png`), add 1024×500 feature graphic & phone screenshots.
4. Go to **Test and release → Production (or Closed testing) → Create new release**:
   - Upload **`releases/dutylens-bd-v1.0.0-playstore.aab`** (or install **`releases/dutylens-bd-v1.0.0-release.apk`** directly on Android devices for immediate testing).
   - Submit for review. For future updates (`versionCode 2+`), always sign with `dutylens-bd-upload.jks`!
