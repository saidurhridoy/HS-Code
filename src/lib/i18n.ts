import { AppLanguage, BusinessRole, DomesticVatMode, ImporterRegime } from '@shared/types';

export interface TechnicalTermExplanation {
  code: string;
  enTitle: string;
  bnTitle: string;
  enMeaning: string;
  bnMeaning: string;
}

export const TECHNICAL_TERMS_DICT: Record<string, TechnicalTermExplanation> = {
  HS: {
    code: 'HS Code',
    enTitle: 'Harmonized System (8-Digit BCT Code)',
    bnTitle: 'এইচএস কোড (৮-ডিজিট বাংলাদেশ কাস্টমস কোড)',
    enMeaning:
      'Internationally standardized 6-digit WCO product code extended to 8 digits by Bangladesh Customs (NBR) to determine exact import duty, VAT, and clearance rules.',
    bnMeaning:
      'বিশ্ব শুল্ক সংস্থা (WCO) ও বাংলাদেশ কাস্টমস (NBR) নির্ধারিত ৮-সংখ্যার পণ্যের পরিচিতি কোড। এই কোডের ওপর ভিত্তি করেই আপনার পণ্যের শুল্ক, ভ্যাট ও আমদানির শর্ত নির্ধারিত হয়।',
  },
  AV: {
    code: 'AV',
    enTitle: 'Assessable Value (Customs Tax Base)',
    bnTitle: 'শুল্কায়নযোগ্য মূল্য (Assessable Value — AV)',
    enMeaning:
      'The statutory BDT value on which Bangladesh Customs calculates duties: CIF Value (Cost + Freight + Insurance) plus mandatory 1% Landing Charge.',
    bnMeaning:
      'যে মূল্যের ওপর কাস্টমস কর্তৃপক্ষ শুল্ক ও কর হিসাব করে। সূত্র: পণ্যের দাম + জাহাজ ভাড়া (Freight) + বীমা (Insurance) + ১% ল্যান্ডিং চার্জ = AV।',
  },
  CD: {
    code: 'CD',
    enTitle: 'Customs Duty',
    bnTitle: 'কাস্টমস ডিউটি (মৌলিক আমদানি শুল্ক — CD)',
    enMeaning:
      'Basic import tariff (0%, 1%, 5%, 10%, 15%, or 25% of AV). Non-rebateable sunk cost unless imported under Bonded Warehouse or Capital Machinery SRO.',
    bnMeaning:
      'পণ্যের শুল্কায়নযোগ্য মূল্যের (AV) ওপর ধার্য মৌলিক আমদানি শুল্ক (সাধারণত ০%, ১%, ৫%, ১০%, ১৫% বা ২৫%)। এটি অফেরতযোগ্য খরচ।',
  },
  RD: {
    code: 'RD',
    enTitle: 'Regulatory Duty',
    bnTitle: 'রেগুলেটরি ডিউটি (নিয়ন্ত্রণমূলক শুল্ক — RD)',
    enMeaning:
      'Additional protective duty (typically 3% to 20% on AV) charged on finished consumer goods where CD is at the 25% ceiling.',
    bnMeaning:
      'দেশীয় শিল্প সুরক্ষায় তৈরি পণ্যের ওপর আরোপিত অতিরিক্ত শুল্ক (সাধারণত AV-এর ওপর ৩% থেকে ২০%)। এটিও অফেরতযোগ্য খরচ।',
  },
  SD: {
    code: 'SD',
    enTitle: 'Supplementary Duty',
    bnTitle: 'সম্পূরক শুল্ক (Supplementary Duty — SD)',
    enMeaning:
      'Compound duty charged on (AV + CD + RD) for luxury, non-essential, or domestically produced goods (20% to 500%).',
    bnMeaning:
      'বিলাসবহুল বা দেশে উৎপাদিত পণ্যের আমদানিতে (AV + CD + RD)-এর যোগফলের ওপর আরোপিত চক্রবৃদ্ধি শুল্ক (২০% থেকে ১০০%+)।',
  },
  VAT: {
    code: 'VAT',
    enTitle: 'Import Value Added Tax (15%)',
    bnTitle: 'আমদানি মূসক / ভ্যাট (Import VAT — ১৫%)',
    enMeaning:
      'Charged at 15% on (AV + CD + RD + SD). Fully 100% recoverable as Input Tax Credit on Mushak-9.1 if you sell under standard 15% Mushak-6.3 VAT!',
    bnMeaning:
      '(AV + CD + RD + SD)-এর ওপর ১৫% হারে প্রদেয় ভ্যাট। আপনি যদি ১৫% ভ্যাট নিবন্ধিত প্রতিষ্ঠানে মূসক-৬.৩ চালানে পণ্য বিক্রি করেন, তবে মূসক-৯.১ রিটার্নে এই পুরো ১৫% ভ্যাট ফেরত (রেয়াত) পাবেন!',
  },
  AIT: {
    code: 'AIT',
    enTitle: 'Advance Income Tax (u/s 120 Income Tax Act 2023)',
    bnTitle: 'অগ্রিম আয়কর (Advance Income Tax — AIT)',
    enMeaning:
      '5% (or 2% on select industrial inputs) collected at port on AV as advance corporate/personal income tax; adjustable against your annual tax return.',
    bnMeaning:
      'আমদানি পর্যায়ে AV-এর ওপর প্রদেয় অগ্রিম আয়কর (সাধারণত ৫%)। বছর শেষে আপনার বা প্রতিষ্ঠানের বার্ষিক আয়কর রিটার্নে এটি প্রদেয় করের সাথে সমন্বয় করা যায়।',
  },
  AT: {
    code: 'AT',
    enTitle: 'Advance Tax (VAT & SD Act 2012 s.31)',
    bnTitle: 'অগ্রিম কর (Advance Tax — AT)',
    enMeaning:
      '5% for Commercial importers or 3% for Industrial IRC manufacturers on (AV + CD + RD + SD). 100% adjustable/refundable in monthly Mushak-9.1 return.',
    bnMeaning:
      'বাণিজ্যিক আমদানিকারকদের জন্য ৫% এবং শিল্প (Industrial IRC) প্রতিষ্ঠানের জন্য ৩%। মাসিক মূসক-৯.১ ভ্যাট রিটার্নে এটি ১০০% সমন্বয় বা হ্রাসকারী সমন্বয় হিসেবে ফেরত পাওয়া যায়।',
  },
  TTI: {
    code: 'TTI',
    enTitle: 'Total Tax Incidence (%)',
    bnTitle: 'মোট করভার (Total Tax Incidence — TTI %)',
    enMeaning:
      'The combined compound percentage of all 6 customs taxes relative to Assessable Value (AV). Higher than the simple sum because SD, VAT, and AT are taxed on top of duties.',
    bnMeaning:
      'শুল্কায়নযোগ্য মূল্যের (AV) তুলনায় ৬টি শুল্ক ও করের সম্মিলিত শতকরা হার। শুল্কের ওপর পুনরায় SD ও ভ্যাট হিসাব হয় বলে সাধারণ যোগফলের চেয়ে TTI বেশি হয়।',
  },
  IRC: {
    code: 'IRC',
    enTitle: 'Import Registration Certificate (Commercial vs Industrial)',
    bnTitle: 'আমদানি নিবন্ধন সনদ (IRC — বাণিজ্যিক বনাম শিল্প)',
    enMeaning:
      'License issued by CCI&E. Commercial IRC is for trading/resale (5% AT); Industrial IRC is for factories importing machinery & raw materials (3% AT + SRO concessions).',
    bnMeaning:
      'আমদানির সরকারি লাইসেন্স (CCI&E প্রদত্ত)। ট্রেডিং ব্যবসার জন্য Commercial IRC (৫% AT) এবং কারখানার কাঁচামাল ও মেশিন আমদানির জন্য Industrial IRC (মাত্র ৩% AT ও বিশেষ শুল্ক ছাড়)।',
  },
  SRO: {
    code: 'SRO',
    enTitle: 'Statutory Regulatory Order (Gazette Tax Exemption)',
    bnTitle: 'এসআরও শুল্ক ছাড় (SRO — সরকারি প্রজ্ঞাপন)',
    enMeaning:
      'Official NBR legal notifications granting reduced duty/VAT—for example, Capital Machinery SRO reduces machinery duty to just 1% CD and 0% VAT/SD/AT.',
    bnMeaning:
      'এনবিআর (NBR) কর্তৃক জারিকৃত বিশেষ আইনগত প্রজ্ঞাপন যার মাধ্যমে শুল্ক ও ভ্যাট কমানো হয়—যেমন কারখানার মূলধনী যন্ত্রপাতি (Capital Machinery) আমদানিতে মাত্র ১% CD এবং ০% ভ্যাট সুবিধা।',
  },
  MUSHAK: {
    code: 'Mushak 6.3 / 9.1',
    enTitle: 'VAT Tax Invoice (6.3) & Monthly Return (9.1)',
    bnTitle: 'মূসক-৬.৩ চালান ও মূসক-৯.১ মাসিক ভ্যাট রিটার্ন',
    enMeaning:
      'Mushak-6.3 is the official VAT invoice issued on sales; Mushak-9.1 is the monthly return filed by the 15th of next month to claim back Import VAT (Note-14) and AT (Note-31).',
    bnMeaning:
      'পণ্য বিক্রির সরকারি ভ্যাট চালান হলো মূসক-৬.৩ এবং প্রতি মাসের ১৫ তারিখের মধ্যে দাখিলকৃত মাসিক রিটার্ন হলো মূসক-৯.১—যার মাধ্যমে আমদানির ১৫% ভ্যাট ও ৫%/৩% AT ফেরত নেওয়া হয়।',
  },
  FTA: {
    code: 'APTA / SAFTA',
    enTitle: 'Preferential Regional Trade Agreements',
    bnTitle: 'অগ্রাধিকারমূলক বাণিজ্য চুক্তি (APTA / SAFTA শুল্ক ছাড়)',
    enMeaning:
      'Imports from China, South Korea, India, Sri Lanka, or SAARC countries with a valid Certificate of Origin & direct Bill of Lading qualify for lower Customs Duty.',
    bnMeaning:
      'চীন, দক্ষিণ কোরিয়া, ভারত বা সার্কভুক্ত দেশ থেকে পণ্য আমদানির সময় নির্ধারিত Certificate of Origin (COO) দাখিল করলে কাস্টমস ডিউটিতে (CD) বিশেষ ছাড় পাওয়া যায়।',
  },
};

export function formatRegimeLabel(regime: ImporterRegime, lang: AppLanguage): string {
  if (lang === 'bn') {
    switch (regime) {
      case 'commercial':
        return 'বাণিজ্যিক আমদানিকারক (Commercial IRC)';
      case 'industrial':
        return 'শিল্প কারখানা (Industrial IRC — ৩% AT)';
      case 'capital_machinery':
        return 'মূলধনী যন্ত্রপাতি (Capital Machinery ১% SRO)';
      case 'export_bonded':
        return 'রপ্তানিমুখী বন্ডেড ওয়্যারহাউস (০% শুল্ক)';
    }
  }
  switch (regime) {
    case 'commercial':
      return 'Commercial Importer (IRC)';
    case 'industrial':
      return 'Industrial IRC (Factory)';
    case 'capital_machinery':
      return 'Capital Machinery SRO';
    case 'export_bonded':
      return 'Export Bonded Warehouse';
  }
}

export function formatBusinessRoleLabel(role: BusinessRole, lang: AppLanguage): string {
  if (lang === 'bn') {
    switch (role) {
      case 'importer':
        return 'আমদানিকারক (Importer)';
      case 'exporter':
        return 'রপ্তানিকারক (Exporter)';
      case 'both':
        return 'আমদানিকারক ও রপ্তানিকারক (Both)';
    }
  }
  switch (role) {
    case 'importer':
      return 'Importer';
    case 'exporter':
      return 'Exporter';
    case 'both':
      return 'Importer & Exporter';
  }
}

export function formatDomesticVatLabel(mode: DomesticVatMode, lang: AppLanguage): string {
  if (lang === 'bn') {
    switch (mode) {
      case 'standard_15':
        return '১৫% আদর্শ ভ্যাট (সম্পূর্ণ ১৫% আমদানি ভ্যাট ও AT রেয়াতযোগ্য)';
      case 'trade_5':
        return '৫% ট্রেডিং ভ্যাট (১৫% আমদানি ভ্যাট রেয়াত বাতিল, শুধু AT ফেরতযোগ্য)';
      case 'unregistered_exempt':
        return 'ভ্যাট অব্যাহতিপ্রাপ্ত / অনিবন্ধিত (কোনো ভ্যাট রেয়াত নেই)';
    }
  }
  switch (mode) {
    case 'standard_15':
      return '15% Standard VAT (Full Import VAT + AT Rebate)';
    case 'trade_5':
      return '5% Trade VAT (Forfeits 15% Import VAT Credit)';
    case 'unregistered_exempt':
      return 'Unregistered / VAT-Exempt Supply';
  }
}

export function formatIpoStatusLabel(status: string, lang: AppLanguage): string {
  if (lang !== 'bn') return status;
  if (status === 'Freely Importable') return 'অবাধে আমদানিযোগ্য (Freely Importable)';
  if (status === 'Conditional Import') return 'শর্তসাপেক্ষে আমদানিযোগ্য (Conditional Import)';
  if (status === 'Restricted') return 'নিয়ন্ত্রিত / বিশেষ অনুমতি সাপেক্ষ (Restricted)';
  return status;
}

export const UI_STRINGS = {
  en: {
    brandSubtitle: 'AI HS Code Classifier, Duty Reduction & VAT Rebate Engine',
    tabClassifier: 'AI HS Finder',
    tabOptimizer: 'Tax Saving & Rebate',
    tabExplorer: 'Tariff Schedule',
    tabBatch: 'Batch Invoice',
    cloudLive: 'Cloud DB Live',
    loginSignup: 'Log In / Sign Up',
    myProfile: 'Profile',
    describeTitle: 'Describe Your Import or Export Product (English or বাংলা)',
    describeSubtitle:
      'Include material, function, and specs (e.g. engine cc, wattage, GSM, bulk vs retail pack) for exact 8-digit NBR HS code, VAT/Duty breakdown & legal tax-saving options.',
    ctrlEnterHint: 'Ctrl + Enter to classify',
    trySample: 'Try sample:',
    classifyBtn: 'Find HS Code & Import Tax',
    analyzingBtn: 'Analyzing Tariff...',
    recentLabel: 'Recent:',
    savedInProfileBadge: 'Auto-saved to your profile',
    liveCloudLabel: 'Live Cloud:',
    summarizeBtnBottom: 'Summarize & Explain Terms',
    summarizeSubtext: 'Save time: view plain-language summary & technical customs terms in English or বাংলা',
    glossaryBtn: 'Technical Terms in বাংলা / EN',
    footerTitle:
      'DutyLens BD — WCO HS2022 + Bangladesh Customs (NBR) Import VAT, Duty & Rebate Intelligence',
    footerNote:
      'Note: Final customs & rebate eligibility is governed by active NBR Operative Tariff Schedule (OTS), VAT & SD Act 2012 & Finance Act SROs.',
  },
  bn: {
    brandSubtitle: 'এআই এইচএস কোড নির্ণয়, শুল্ক সাশ্রয় ও ভ্যাট রেয়াত প্ল্যাটফর্ম',
    tabClassifier: 'এআই এইচএস কোড',
    tabOptimizer: 'কর সাশ্রয় ও রেয়াত',
    tabExplorer: 'শুল্ক তালিকা',
    tabBatch: 'ব্যাচ ইনভয়েস',
    cloudLive: 'ক্লাউড ডাটাবেস সচল',
    loginSignup: 'লগইন / সাইন আপ',
    myProfile: 'প্রোফাইল',
    describeTitle: 'আপনার আমদানি বা রপ্তানি পণ্যের বিবরণ লিখুন (বাংলা বা English)',
    describeSubtitle:
      'সঠিক ৮-ডিজিট এনবিআর (NBR) এইচএস কোড, ভ্যাট-শুল্ক হিসাব এবং বৈধভাবে কর কমানোর উপায় জানতে পণ্যের উপাদান, কাজ ও স্পেসিফিকেশন (যেমন সিসি, ওয়াট, GSM, বাল্ক/রিটেইল প্যাক) উল্লেখ করুন।',
    ctrlEnterHint: 'দ্রুত খুঁজতে Ctrl + Enter চাপুন',
    trySample: 'নমুনা পণ্য:',
    classifyBtn: 'এইচএস কোড ও শুল্ক হিসাব দেখুন',
    analyzingBtn: 'শুল্ক বিশ্লেষণ হচ্ছে...',
    recentLabel: 'সাম্প্রতিক:',
    savedInProfileBadge: 'আপনার প্রোফাইলে সংরক্ষিত হচ্ছে',
    liveCloudLabel: 'লাইভ ক্লাউড:',
    summarizeBtnBottom: 'সংক্ষেপে সারসংক্ষেপ ও শব্দের অর্থ বুঝুন (Summarize)',
    summarizeSubtext: 'সময় বাঁচান: পুরো শুল্ক হিসাব ও জটিল কাস্টমস শব্দের সহজ বাংলা ব্যাখ্যা এক নজরে দেখুন',
    glossaryBtn: 'টেকনিক্যাল শব্দের বাংলা অর্থ',
    footerTitle:
      'DutyLens BD — WCO HS2022 এবং বাংলাদেশ কাস্টমস (NBR) আমদানি ভ্যাট, শুল্ক ও রেয়াত সহায়তা',
    footerNote:
      'দ্রষ্টব্য: চূড়ান্ত শুল্কায়ন ও ভ্যাট রেয়াত বাংলাদেশ কাস্টমসের কার্যকর ট্যারিফ তফসিল, মূসক ও সম্পূরক শুল্ক আইন ২০১২ এবং সংশ্লিষ্ট SRO দ্বারা নির্ধারিত হবে।',
  },
} as const;
