import crypto from 'node:crypto';
import {
  BusinessRole,
  DomesticVatMode,
  ImporterRegime,
  Incoterm,
  PreferentialOrigin,
  SupportedCurrency,
  UserProfile,
  UserSavedQuery,
} from '../shared/types.js';

interface StoredUserRow extends UserProfile {
  passwordHash: string;
}

const memoryUsersByEmail = new Map<string, StoredUserRow>();
const memoryUsersById = new Map<string, StoredUserRow>();
const memoryUserQueries = new Map<string, UserSavedQuery[]>();

function getServiceSupabaseConfig(): { url: string; serviceKey: string } | null {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

function getTokenSecret(): string {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dutylens_bd_local_dev_hmac_secret_v1'
  );
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export function signAuthToken(user: Pick<UserProfile, 'id' | 'email'>): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getTokenSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifyAuthToken(token: string | undefined | null): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  const dot = clean.indexOf('.');
  if (dot <= 0) return null;
  const body = clean.slice(0, dot);
  const sig = clean.slice(dot + 1);
  const expectedSig = crypto
    .createHmac('sha256', getTokenSecret())
    .update(body)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function mapDbUser(r: any): UserProfile {
  return {
    id: String(r.id),
    email: String(r.email),
    fullName: String(r.full_name),
    companyName: String(r.company_name),
    businessRole: (r.business_role as BusinessRole) || 'importer',
    mobileNumber: String(r.mobile_number),
    createdAt: String(r.created_at || new Date().toISOString()),
  };
}

function stripSensitive(row: StoredUserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    companyName: row.companyName,
    businessRole: row.businessRole,
    mobileNumber: row.mobileNumber,
    createdAt: row.createdAt,
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  businessRole: BusinessRole;
  mobileNumber: string;
}): Promise<{ user: UserProfile; token: string }> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const companyName = input.companyName.trim();
  const mobileNumber = input.mobileNumber.trim();
  const businessRole: BusinessRole = ['importer', 'exporter', 'both'].includes(input.businessRole)
    ? input.businessRole
    : 'importer';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!input.password || input.password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (fullName.length < 2) {
    throw new Error('Please enter your full name.');
  }
  if (companyName.length < 2) {
    throw new Error('Please enter your company or business name.');
  }
  if (mobileNumber.length < 7) {
    throw new Error('Please enter a valid mobile number.');
  }

  const passwordHash = hashPassword(input.password);
  const cfg = getServiceSupabaseConfig();

  if (!cfg) {
    if (memoryUsersByEmail.has(email)) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }
    const row: StoredUserRow = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      fullName,
      companyName,
      businessRole,
      mobileNumber,
      createdAt: new Date().toISOString(),
    };
    memoryUsersByEmail.set(email, row);
    memoryUsersById.set(row.id, row);
    const user = stripSensitive(row);
    return { user, token: signAuthToken(user) };
  }

  // Check duplicate email in Supabase
  const existingRes = await fetch(
    `${cfg.url}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
    {
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
      },
      signal: AbortSignal.timeout(4000),
    }
  );
  if (existingRes.ok) {
    const existingRows = (await existingRes.json()) as any[];
    if (existingRows.length > 0) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }
  }

  const createRes = await fetch(`${cfg.url}/rest/v1/app_users`, {
    method: 'POST',
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      email,
      password_hash: passwordHash,
      full_name: fullName,
      company_name: companyName,
      business_role: businessRole,
      mobile_number: mobileNumber,
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (errText.includes('duplicate') || errText.includes('23505')) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }
    throw new Error('Failed to create user profile. Please try again.');
  }

  const createdRows = (await createRes.json()) as any[];
  const user = mapDbUser(createdRows[0]);
  return { user, token: signAuthToken(user) };
}

export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile; token: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    throw new Error('Please enter both email and password.');
  }

  const cfg = getServiceSupabaseConfig();
  if (!cfg) {
    const row = memoryUsersByEmail.get(email);
    if (!row || !verifyPassword(input.password, row.passwordHash)) {
      throw new Error('Invalid email or password.');
    }
    const user = stripSensitive(row);
    return { user, token: signAuthToken(user) };
  }

  const res = await fetch(
    `${cfg.url}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
      },
      signal: AbortSignal.timeout(4000),
    }
  );

  if (!res.ok) {
    throw new Error('Unable to reach authentication service.');
  }
  const rows = (await res.json()) as any[];
  if (!rows || rows.length === 0) {
    throw new Error('Invalid email or password.');
  }

  const dbRow = rows[0];
  if (!verifyPassword(input.password, String(dbRow.password_hash))) {
    throw new Error('Invalid email or password.');
  }

  const user = mapDbUser(dbRow);
  return { user, token: signAuthToken(user) };
}

export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  const cfg = getServiceSupabaseConfig();
  if (!cfg) {
    const row = memoryUsersById.get(userId);
    return row ? stripSensitive(row) : null;
  }

  const res = await fetch(
    `${cfg.url}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}&select=id,email,full_name,company_name,business_role,mobile_number,created_at&limit=1`,
    {
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
      },
      signal: AbortSignal.timeout(4000),
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as any[];
  if (!rows || rows.length === 0) return null;
  return mapDbUser(rows[0]);
}

export async function updateUserProfile(
  userId: string,
  patch: {
    fullName?: string;
    companyName?: string;
    businessRole?: BusinessRole;
    mobileNumber?: string;
  }
): Promise<UserProfile> {
  const cfg = getServiceSupabaseConfig();
  if (!cfg) {
    const row = memoryUsersById.get(userId);
    if (!row) throw new Error('User not found.');
    if (patch.fullName && patch.fullName.trim().length >= 2) row.fullName = patch.fullName.trim();
    if (patch.companyName && patch.companyName.trim().length >= 2)
      row.companyName = patch.companyName.trim();
    if (patch.businessRole && ['importer', 'exporter', 'both'].includes(patch.businessRole))
      row.businessRole = patch.businessRole;
    if (patch.mobileNumber && patch.mobileNumber.trim().length >= 7)
      row.mobileNumber = patch.mobileNumber.trim();
    return stripSensitive(row);
  }

  const updateBody: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.fullName && patch.fullName.trim().length >= 2)
    updateBody.full_name = patch.fullName.trim();
  if (patch.companyName && patch.companyName.trim().length >= 2)
    updateBody.company_name = patch.companyName.trim();
  if (patch.businessRole && ['importer', 'exporter', 'both'].includes(patch.businessRole))
    updateBody.business_role = patch.businessRole;
  if (patch.mobileNumber && patch.mobileNumber.trim().length >= 7)
    updateBody.mobile_number = patch.mobileNumber.trim();

  const res = await fetch(
    `${cfg.url}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updateBody),
      signal: AbortSignal.timeout(4000),
    }
  );
  if (!res.ok) throw new Error('Failed to update profile.');
  const rows = (await res.json()) as any[];
  if (!rows || rows.length === 0) throw new Error('User profile not found.');
  return mapDbUser(rows[0]);
}

function mapDbSavedQuery(r: any): UserSavedQuery {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    query: String(r.query),
    hs8: String(r.hs8),
    formattedHs8: String(r.formatted_hs8),
    commercialName: String(r.commercial_name),
    confidence: Number(r.confidence) || 85,
    invoiceValue: Number(r.invoice_value) || 0,
    currency: (r.currency as SupportedCurrency) || 'USD',
    exchangeRateBdt: Number(r.exchange_rate_bdt) || 122,
    incoterm: (r.incoterm as Incoterm) || 'CFR',
    quantity: Number(r.quantity) || 1,
    regime: (r.regime as ImporterRegime) || 'commercial',
    preferentialOrigin: (r.preferential_origin as PreferentialOrigin) || 'none',
    domesticVatMode: (r.domestic_vat_mode as DomesticVatMode) || 'standard_15',
    ttiPercent: Number(r.tti_percent) || 0,
    totalTaxBdt: Number(r.total_tax_bdt) || 0,
    totalLandedBdt: Number(r.total_landed_bdt) || 0,
    createdAt: String(r.created_at || new Date().toISOString()),
  };
}

export async function saveUserQueryToProfile(input: {
  userId: string;
  query: string;
  hs8: string;
  formattedHs8: string;
  commercialName: string;
  confidence: number;
  invoiceValue: number;
  currency: SupportedCurrency;
  exchangeRateBdt: number;
  incoterm: Incoterm;
  quantity: number;
  regime: ImporterRegime;
  preferentialOrigin?: PreferentialOrigin;
  domesticVatMode?: DomesticVatMode;
  ttiPercent: number;
  totalTaxBdt: number;
  totalLandedBdt: number;
}): Promise<UserSavedQuery | null> {
  const cleanQuery = input.query.trim().slice(0, 500);
  if (!cleanQuery) return null;

  const cfg = getServiceSupabaseConfig();
  if (!cfg) {
    const list = memoryUserQueries.get(input.userId) || [];
    const item: UserSavedQuery = {
      id: crypto.randomUUID(),
      userId: input.userId,
      query: cleanQuery,
      hs8: input.hs8,
      formattedHs8: input.formattedHs8,
      commercialName: input.commercialName,
      confidence: Math.round(input.confidence),
      invoiceValue: Number(input.invoiceValue) || 0,
      currency: input.currency || 'USD',
      exchangeRateBdt: Number(input.exchangeRateBdt) || 122,
      incoterm: input.incoterm || 'CFR',
      quantity: Number(input.quantity) || 1,
      regime: input.regime || 'commercial',
      preferentialOrigin: input.preferentialOrigin || 'none',
      domesticVatMode: input.domesticVatMode || 'standard_15',
      ttiPercent: Number(input.ttiPercent) || 0,
      totalTaxBdt: Number(input.totalTaxBdt) || 0,
      totalLandedBdt: Number(input.totalLandedBdt) || 0,
      createdAt: new Date().toISOString(),
    };
    const deduped = [
      item,
      ...list.filter((q) => !(q.hs8 === item.hs8 && q.query.toLowerCase() === item.query.toLowerCase())),
    ].slice(0, 50);
    memoryUserQueries.set(input.userId, deduped);
    return item;
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/user_saved_queries`, {
      method: 'POST',
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: input.userId,
        query: cleanQuery,
        hs8: input.hs8,
        formatted_hs8: input.formattedHs8,
        commercial_name: input.commercialName,
        confidence: Math.round(input.confidence),
        invoice_value: Number(input.invoiceValue) || 0,
        currency: input.currency || 'USD',
        exchange_rate_bdt: Number(input.exchangeRateBdt) || 122,
        incoterm: input.incoterm || 'CFR',
        quantity: Number(input.quantity) || 1,
        regime: input.regime || 'commercial',
        preferential_origin: input.preferentialOrigin || 'none',
        domestic_vat_mode: input.domesticVatMode || 'standard_15',
        tti_percent: Number(input.ttiPercent) || 0,
        total_tax_bdt: Number(input.totalTaxBdt) || 0,
        total_landed_bdt: Number(input.totalLandedBdt) || 0,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as any[];
    return rows && rows[0] ? mapDbSavedQuery(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function listUserSavedQueries(
  userId: string,
  limit = 40
): Promise<UserSavedQuery[]> {
  const cfg = getServiceSupabaseConfig();
  if (!cfg) {
    return (memoryUserQueries.get(userId) || []).slice(0, limit);
  }

  const res = await fetch(
    `${cfg.url}/rest/v1/user_saved_queries?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`,
    {
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
      },
      signal: AbortSignal.timeout(4000),
    }
  );
  if (!res.ok) return [];
  const rows = (await res.json()) as any[];
  return (rows || []).map(mapDbSavedQuery);
}

export async function deleteUserSavedQuery(userId: string, queryId: string): Promise<boolean> {
  const cfg = getServiceSupabaseConfig();
  if (!cfg) {
    const list = memoryUserQueries.get(userId) || [];
    const next = list.filter((q) => q.id !== queryId);
    memoryUserQueries.set(userId, next);
    return next.length !== list.length;
  }

  const res = await fetch(
    `${cfg.url}/rest/v1/user_saved_queries?id=eq.${encodeURIComponent(queryId)}&user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
      },
      signal: AbortSignal.timeout(4000),
    }
  );
  return res.ok;
}
