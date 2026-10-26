# DutyLens BD — AI HS Code Finder & NBR Import VAT/Tax Engine

An AI-powered **Harmonized System (WCO HS2022)** and **8-digit Bangladesh Customs (NBR) Tariff Classifier** with a live **Import Duty, VAT & Total Tax Incidence (TTI)** assessment calculator.

Built for Bangladeshi importers, C&F agents, LC officers, supply-chain teams, and trade developers.

---

## Key Capabilities

1. **AI Product-to-HS Code Classification (English & বাংলা)**
   - Understands free-text commercial product descriptions, technical specifications (`1500cc` vs `1800cc hybrid`, `25kg bulk` vs `1kg retail tin`, `knitted` vs `woven`), typos, and Bangla/Banglish trade terms (`সুইং মেশিন`, `স্মার্টফোন`, `সোলার প্যানেল`, `কসমেটিকস`, etc.).
   - Grounded in **all 21 WCO Sections, 97 Chapters, 1,229 Headings, and 5,600+ official HS2022 Subheadings** enriched with **8-digit Bangladesh Customs Tariff (BCT)** splits.
   - Displays WCO **General Rules of Interpretation (GRI 1–6)** reasoning, confidence scores, runner-up HS code comparisons, and interactive disambiguation chips.

2. **Hybrid AI Architecture (Works Out-of-the-Box + Optional LLM RAG)**
   - **Built-in Smart Hybrid Engine (Zero API Key Required)**: Multi-stage NLP signal extraction + commercial-to-WCO semantic expansion + weighted multi-field BM25 + bigram phrase matching + GRI domain reranker (`<15ms` latency).
   - **Optional External LLM RAG (`Gemini`, `OpenAI`, `Groq`)**: Retrieves the top verified WCO/NBR tariff rows via BM25 and feeds them as grounded RAG context to your chosen LLM so it never hallucinates invalid HS codes or rates.

3. **Authentic Bangladesh NBR Compound Tax & VAT Calculator**
   - Computes statutory **Assessable Value (AV)** from `FOB` / `CFR` / `CIF` invoices (including statutory `1%` Insurance and `1%` Landing Charge) or direct `AV`.
   - Applies exact NBR compound bases across all 6 import tax heads:
     - **CD (Customs Duty)** — on `AV`
     - **RD (Regulatory Duty)** — on `AV`
     - **SD (Supplementary Duty)** — on `(AV + CD + RD)`
     - **VAT (Import Value Added Tax)** — on `(AV + CD + RD + SD)`
     - **AIT (Advance Income Tax)** — on `AV`
     - **AT (Advance Tax)** — on `(AV + CD + RD + SD)`
   - Supports **Commercial IRC (`5% AT`)**, **Industrial IRC (`3% AT`)**, **Capital Machinery SRO (`1% CD, 0% VAT, 0% AT`)**, and inline **Custom SRO Rate Overrides**.
   - Separates **Total Customs Outflow at Port** from **Rebateable Credits (`VAT + AT + AIT`)** and **Net Sunk Duty (`CD + RD + SD`)**.

4. **Technical Duty Reduction & Tax Rebate Advisor (`shared/tax-optimizer.ts`)**
   - **Quantified Port Duty Reduction Levers**: Automatically identifies legal pathways to lower TTI — **Capital Machinery SRO (`1% CD, 0% VAT, 0% AT`)**, **Industrial IRC (`3% AT` vs `5% AT`)**, **APTA / SAFTA / Bhutan PTA Preferential Certificates of Origin**, **Bulk (`>2.5 kg`) vs. Retail Subheading Engineering**, **CKD/SKD Local Assembly SROs**, **100% Export Bonded Warehouse / DEDO Drawback**, and **Actual Marine Insurance Cover Note (`~0.25%` vs `1.00%` NBR presumptive insurance)** — with 1-click live simulation.
   - **Section 46 Input VAT Rebate vs. 5% Commercial Trade VAT Simulator**: Interactive domestic markup & B2B/B2C simulator showing exact `৳` differences between electing **15% Standard Output VAT (`Mushak-6.3` with 100% Import VAT + AT credit)** vs. **5% Trade VAT (`0%` Import VAT credit, `AT` Note-31 adjustable)** including the `62.16%` B2C statutory breakeven.
   - **Post-Clearance Rebate & Mushak Compliance Tracker**: Step-by-step checklists and NBR audit disallowance warnings for **Import VAT (`Mushak-9.1` Note-14 & `Mushak-4.3`)**, **Advance Tax (`Mushak-9.1` Note-31)**, **AIT (`u/s 120 & s.163 Minimum Tax`)**, and **DEDO Duty Drawback**.

5. **Import Policy Order (IPO) & Compliance Checklist**
   - Surfaces mandatory regulatory NOCs (`BTRC`, `BSTI`, `DGDA`, `DAE Plant Quarantine`, `DLS Livestock`, `BAERA Radiation`, `NBR Bonded Warehouse` & `Capital Machinery SRO` notes).

6. **Full Tariff Schedule Explorer & Batch Commercial Invoice Analyzer**
   - Browse & filter all 5,600+ tariff codes across Sections `I–XXI`, or paste multi-line commercial invoices to classify an entire shipment and export CSV costing schedules.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start unified Express + Vite dev server on http://0.0.0.0:3000
npm run dev

# Run automated test suite (NBR tax math, AI classifier & API tests)
npm test

# Build production client & run production server
npm run build
npm start
```

---

## REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service status & loaded WCO/NBR tariff counts |
| `POST` | `/api/classify` | Classify product description (`query`, optional `regime`, `invoiceValue`, `currency`, `llm`) |
| `POST` | `/api/calculate` | Compute exact NBR `AV`, 6-head duties/taxes, `TTI %`, and rebateable credits |
| `POST` | `/api/optimize` | Generate quantified legal duty-reduction strategies, `15% vs 5%` VAT rebate simulation & Mushak playbook |
| `POST` | `/api/batch-classify` | Classify and assess a multi-line commercial invoice / packing list |
| `GET` | `/api/tariff/sections` | Retrieve all 21 WCO sections and 97 chapters |
| `GET` | `/api/tariff/search` | Search/filter tariff entries (`q`, `section`, `chapter`, `curatedOnly`) |
| `GET` | `/api/tariff/code/:code` | Lookup a specific 4-, 6-, or 8-digit HS code |
| `GET` | `/api/cloud/status` | Live Supabase Cloud connection status & recent classification feed |
| `POST` | `/api/assessments` | Save a shareable NBR duty & VAT assessment permalink (`dl-xxxxxx`) to Supabase |
| `GET` | `/api/assessments/:slug` | Retrieve a saved cloud assessment permalink and hydrated tariff schedule |

---

## Cloud Deployment (Vercel + Supabase)

- **Vercel Serverless + Edge CDN**: Configured out-of-the-box via `vercel.json` and `api/index.ts` (bundles `data/wco-hs2022.csv` & `data/wco-sections.csv` via `includeFiles: "data/**"`).
- **Supabase Postgres**: Backed by RLS-protected tables (`public.tariff_curated_bct`, `public.shared_assessments`, and `public.classification_logs`) with graceful in-memory fallback when running offline.

