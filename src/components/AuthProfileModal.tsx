import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { AppLanguage, BusinessRole, UserProfile, UserSavedQuery } from '@shared/types';
import { formatBdt, formatPct } from '@/lib/format';
import { formatBusinessRoleLabel, formatRegimeLabel } from '@/lib/i18n';

export type AuthModalMode = 'login' | 'signup' | 'profile';

interface AuthProfileModalProps {
  open: boolean;
  initialMode: AuthModalMode;
  lang: AppLanguage;
  user: UserProfile | null;
  savedQueries: UserSavedQuery[];
  onClose: () => void;
  onSignup: (params: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    businessRole: BusinessRole;
    mobileNumber: string;
  }) => Promise<void>;
  onLogin: (params: { email: string; password: string }) => Promise<void>;
  onUpdateProfile: (patch: {
    fullName: string;
    companyName: string;
    businessRole: BusinessRole;
    mobileNumber: string;
  }) => Promise<void>;
  onLogout: () => void;
  onLoadSavedQuery: (q: UserSavedQuery) => void;
  onDeleteSavedQuery: (id: string) => Promise<void>;
}

export const AuthProfileModal: React.FC<AuthProfileModalProps> = ({
  open,
  initialMode,
  lang,
  user,
  savedQueries,
  onClose,
  onSignup,
  onLogin,
  onUpdateProfile,
  onLogout,
  onLoadSavedQuery,
  onDeleteSavedQuery,
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessRole, setBusinessRole] = useState<BusinessRole>('importer');
  const [mobileNumber, setMobileNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSavedNotice(false);
    setEditingProfile(false);
    if (user) {
      setMode('profile');
      setFullName(user.fullName);
      setCompanyName(user.companyName);
      setBusinessRole(user.businessRole);
      setMobileNumber(user.mobileNumber);
    } else {
      setMode(initialMode === 'profile' ? 'login' : initialMode);
    }
  }, [open, initialMode, user]);

  if (!open) return null;

  const isBn = lang === 'bn';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await onSignup({
          email,
          password,
          fullName,
          companyName,
          businessRole,
          mobileNumber,
        });
      } else if (mode === 'login') {
        await onLogin({ email, password });
      }
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err?.message || (isBn ? 'অনুরোধ সম্পন্ন করা যায়নি।' : 'Authentication failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onUpdateProfile({
        fullName,
        companyName,
        businessRole,
        mobileNumber,
      });
      setEditingProfile(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
              {user ? <User className="h-4.5 w-4.5" /> : <UserPlus className="h-4.5 w-4.5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {user
                  ? isBn
                    ? 'আমার প্রোফাইল ও সংরক্ষিত এইচএস অনুসন্ধান'
                    : 'My Profile & Saved HS Queries'
                  : mode === 'signup'
                    ? isBn
                      ? 'নতুন অ্যাকাউন্ট তৈরি করুন (Sign Up)'
                      : 'Create Your Importer / Exporter Profile'
                    : isBn
                      ? 'আপনার অ্যাকাউন্টে লগইন করুন'
                      : 'Log In to DutyLens BD'}
              </h2>
              <p className="text-xs text-slate-500">
                {user
                  ? isBn
                    ? 'আপনার সকল পণ্য অনুসন্ধান ও শুল্ক হিসাব স্বয়ংক্রিয়ভাবে এখানে সংরক্ষিত থাকে'
                    : 'Every HS classification you run is automatically saved to your profile'
                  : isBn
                    ? 'প্রোফাইল খুললে আপনার সকল পণ্যের এইচএস কোড ও শুল্ক হিসাব ক্লাউডে সংরক্ষিত থাকবে'
                    : 'Save all your product classifications & customs duty sheets in your cloud profile'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Logged-Out Login / Sign Up Form */}
        {!user && (
          <div className="p-6">
            {/* Mode Switch Tabs */}
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition sm:text-sm ${
                  mode === 'signup'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isBn ? 'সাইন আপ (নতুন প্রোফাইল)' : 'Sign Up (Create Profile)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`rounded-lg py-2 text-xs font-bold transition sm:text-sm ${
                  mode === 'login'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isBn ? 'লগইন (Log In)' : 'Log In'}
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        {isBn ? 'আপনার পূর্ণ নাম *' : 'Full Name *'}
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={isBn ? 'যেমন: মো: সাইদুর রহমান' : 'e.g. Md. Saidur Rahman'}
                          className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        {isBn ? 'প্রতিষ্ঠানের নাম (Company Name) *' : 'Company Name *'}
                      </label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder={
                            isBn ? 'যেমন: ঢাকা ট্রেড ইন্টারন্যাশনাল' : 'e.g. Dhaka Trade International Ltd.'
                          }
                          className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Role: Importer / Exporter / Both */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      {isBn
                        ? 'ব্যবসার ধরন (Importer / Exporter) *'
                        : 'Business Activity (Importer / Exporter) *'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['importer', 'exporter', 'both'] as BusinessRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setBusinessRole(role)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                            businessRole === role
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/30'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {role === 'importer'
                            ? isBn
                              ? 'আমদানিকারক (Importer)'
                              : 'Importer'
                            : role === 'exporter'
                              ? isBn
                                ? 'রপ্তানিকারক (Exporter)'
                                : 'Exporter'
                              : isBn
                                ? 'উভয়ই (Both)'
                                : 'Both (Imp/Exp)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      {isBn ? 'মোবাইল নম্বর (Mobile Number) *' : 'Mobile Number *'}
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder={isBn ? '+880 17XX-XXXXXX' : '+880 17XX-XXXXXX'}
                        className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  {isBn ? 'ইমেইল ঠিকানা (Email) *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  {isBn ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *' : 'Password (min 6 characters) *'}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>
                  {mode === 'signup'
                    ? isBn
                      ? 'প্রোফাইল তৈরি করুন ও শুরু করুন'
                      : 'Create Profile & Save Queries'
                    : isBn
                      ? 'লগইন করুন'
                      : 'Log In to Profile'}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* Logged-In Profile & Saved Query History */}
        {user && (
          <div className="space-y-5 p-6">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            {/* Business Profile Summary / Edit Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {!editingProfile ? (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{user.fullName}</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        {formatBusinessRoleLabel(user.businessRole, lang)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        {user.companyName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {user.mobileNumber}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {savedNotice && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        {isBn ? 'সংরক্ষিত' : 'Saved'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingProfile(true)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {isBn ? 'তথ্য সম্পাদনা' : 'Edit Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{isBn ? 'লগআউট' : 'Log Out'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileSave} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        {isBn ? 'পূর্ণ নাম' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        {isBn ? 'প্রতিষ্ঠানের নাম' : 'Company Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        {isBn ? 'ব্যবসার ধরন' : 'Importer / Exporter'}
                      </label>
                      <select
                        value={businessRole}
                        onChange={(e) => setBusinessRole(e.target.value as BusinessRole)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                      >
                        <option value="importer">
                          {isBn ? 'আমদানিকারক (Importer)' : 'Importer'}
                        </option>
                        <option value="exporter">
                          {isBn ? 'রপ্তানিকারক (Exporter)' : 'Exporter'}
                        </option>
                        <option value="both">
                          {isBn ? 'আমদানিকারক ও রপ্তানিকারক (Both)' : 'Both (Importer & Exporter)'}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        {isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      {isBn ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Saved Queries List */}
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-700 uppercase">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    {isBn
                      ? `সংরক্ষিত পণ্য অনুসন্ধান (${savedQueries.length})`
                      : `Saved Product Queries (${savedQueries.length})`}
                  </span>
                </h3>
              </div>

              {savedQueries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500">
                  {isBn
                    ? 'এখনো কোনো অনুসন্ধান সংরক্ষিত হয়নি। যেকোনো পণ্যের নাম লিখে খুঁজলে তা স্বয়ংক্রিয়ভাবে আপনার প্রোফাইলে জমা হবে।'
                    : 'No saved queries yet. Classify any product while logged in and it will automatically be saved here.'}
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {savedQueries.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-emerald-300 hover:bg-emerald-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
                            {q.formattedHs8}
                          </span>
                          <span className="truncate text-xs font-bold text-slate-900">
                            {q.commercialName}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-600">
                            TTI {formatPct(q.ttiPercent)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-600">
                          “{q.query}” · {q.incoterm} {q.currency} {q.invoiceValue.toLocaleString()} ·{' '}
                          {formatRegimeLabel(q.regime, lang)} · Tax {formatBdt(q.totalTaxBdt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadSavedQuery(q);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          <span>{isBn ? 'লোড করুন' : 'Open'}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSavedQuery(q.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title={isBn ? 'মুছে ফেলুন' : 'Delete saved query'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
