import { ComplianceRequirement, IpoStatus, NbrTaxRates } from '../../shared/types.js';

export interface ChapterTariffProfile {
  rates: NbrTaxRates;
  unit: string;
  ipoStatus?: IpoStatus;
  sroEligibleCapitalMachinery?: boolean;
  sroNotes?: string[];
  compliance?: ComplianceRequirement[];
  keywords?: string[];
}

const PLANT_QUARANTINE: ComplianceRequirement = {
  authority: 'DAE (Plant Quarantine Wing)',
  title: 'Import Permit (IP) & Phytosanitary Certificate',
  description: 'Mandatory prior Import Permit from Department of Agricultural Extension and exporting country Phytosanitary Certificate.',
  mandatory: true,
};

const LIVESTOCK_QUARANTINE: ComplianceRequirement = {
  authority: 'DLS (Department of Livestock Services)',
  title: 'NOC & Veterinary Health Certificate',
  description: 'Requires prior NOC from DLS, halal slaughter certificate (where applicable), and radiation/health clearance.',
  mandatory: true,
};

const RADIATION_TEST: ComplianceRequirement = {
  authority: 'BAERA (Atomic Energy Regulatory Authority)',
  title: 'Radioactivity Free Test Certificate',
  description: 'Mandatory port-arrival radiation level test under Import Policy Order for food and milk products.',
  mandatory: true,
};

const BSTI_CERT: ComplianceRequirement = {
  authority: 'BSTI',
  title: 'BSTI Compulsory Standards Clearance',
  description: 'Items covered under BSTI mandatory list require lab testing and clearance certificate prior to final customs release.',
  mandatory: true,
};

const DGDA_CERT: ComplianceRequirement = {
  authority: 'DGDA (Drug Administration)',
  title: 'DGDA Block List / Registration NOC',
  description: 'Pharmaceutical raw materials, finished drugs, and regulated medical devices require prior DGDA approval.',
  mandatory: true,
};

const BTRC_CERT: ComplianceRequirement = {
  authority: 'BTRC',
  title: 'BTRC NOC & Spectrum / IMEI Approval',
  description: 'Radio, Wi-Fi, cellular, Bluetooth, and telecom equipment require BTRC prior NOC before shipment/clearance.',
  mandatory: true,
};

const EXPLOSIVES_CERT: ComplianceRequirement = {
  authority: 'Department of Explosives / Narcotics',
  title: 'Hazardous Chemical / Precursor Permit',
  description: 'Regulated acids, compressed gases, precursors, and flammable chemicals require license/NOC.',
  mandatory: false,
};

const CAPITAL_MACHINERY_SRO: ComplianceRequirement = {
  authority: 'NBR Capital Machinery SRO',
  title: 'Industrial IRC Capital Machinery Concession (1% CD)',
  description: 'Registered industrial manufacturers importing listed capital machinery for factory installation qualify for 1% CD, 0% VAT, 0% AT.',
  mandatory: false,
};

const RMG_BOND_NOTE = 'Eligible for 100% duty-free import under NBR Export-Oriented Bonded Warehouse license against back-to-back LC.';

/**
 * Baseline NBR Operative Tariff Schedule (OTS) profiles for all 97 WCO Chapters.
 * Heading-level and 6/8-digit curated profiles override these defaults where specific slabs apply.
 */
export const CHAPTER_PROFILES: Record<string, ChapterTariffProfile> = {
  // Section I: Live Animals; Animal Products (01-05)
  '01': {
    rates: { cd: 5, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 },
    unit: 'u',
    ipoStatus: 'Conditional Import',
    compliance: [LIVESTOCK_QUARANTINE],
    sroNotes: ['Pure-bred breeding stock often enjoys 0% CD exemption under Livestock SRO.'],
  },
  '02': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    ipoStatus: 'Conditional Import',
    compliance: [LIVESTOCK_QUARANTINE, RADIATION_TEST],
    sroNotes: ['Swine meat (0203) is restricted; bovine/poultry meat requires Halal certificate & DLS prior permission.'],
  },
  '03': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [RADIATION_TEST],
  },
  '04': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    ipoStatus: 'Conditional Import',
    compliance: [BSTI_CERT, RADIATION_TEST, LIVESTOCK_QUARANTINE],
    sroNotes: ['Bulk milk powder (>2.5 kg industrial pack) carries lower CD (10%) & 0% SD vs retail tin pack (25% CD + 20% SD).'],
  },
  '05': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [LIVESTOCK_QUARANTINE],
  },

  // Section II: Vegetable Products (06-14)
  '06': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE],
  },
  '07': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE, RADIATION_TEST],
    sroNotes: ['Essential vegetables (onion, garlic, potato, pulses/lentils) frequently receive seasonal NBR tariff reductions.'],
  },
  '08': {
    rates: { cd: 25, rd: 20, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE, RADIATION_TEST],
    sroNotes: ['Fresh imported fruits (apples, oranges, grapes) carry 25% CD + 20% RD + 20% SD under luxury/local protection slab; dates have concessionary rates during Ramadan.'],
  },
  '09': {
    rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE, BSTI_CERT],
    sroNotes: ['Basic spices (ginger, turmeric, chili, cumin) carry specific CD/RD rates depending on whole vs ground retail pack.'],
  },
  '10': {
    rates: { cd: 0, rd: 0, sd: 0, vat: 0, ait: 2, at: 0 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE, RADIATION_TEST],
    sroNotes: ['Food grains (wheat, maize) enjoy 0% CD & 0% VAT; rice duty fluctuates per NBR food security SROs.'],
  },
  '11': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE, BSTI_CERT],
  },
  '12': {
    rates: { cd: 0, rd: 0, sd: 0, vat: 0, ait: 0, at: 0 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE],
    sroNotes: ['Oilseeds (soybean, mustard/rapeseed) and agricultural planting seeds are largely 0% CD & VAT exempt.'],
  },
  '13': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },
  '14': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },

  // Section III: Fats and Oils (15)
  '15': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 0, at: 0 },
    unit: 'kg',
    compliance: [BSTI_CERT, RADIATION_TEST],
    sroNotes: ['Edible soybean & palm oil often carry reduced 5%–10% VAT and 0% CD under NBR essential commodity SROs.'],
  },

  // Section IV: Prepared Foodstuffs, Beverages, Tobacco (16-24)
  '16': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT, RADIATION_TEST],
  },
  '17': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
    sroNotes: ['Raw/refined cane sugar is assessed under specific BDT/MT duty + RD + SD; confectionery carries 25% CD + 20%/45% SD.'],
  },
  '18': {
    rates: { cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
    sroNotes: ['Finished chocolates carry 45% SD; industrial cocoa powder in bulk >2.5kg qualifies for lower SD.'],
  },
  '19': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT, RADIATION_TEST],
    sroNotes: ['Biscuits, pasta, cereals, and infant formula require Bengali statutory labeling and BSTI clearance.'],
  },
  '20': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
  },
  '21': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
  },
  '22': {
    rates: { cd: 25, rd: 3, sd: 150, vat: 15, ait: 5, at: 5 },
    unit: 'l',
    ipoStatus: 'Conditional Import',
    compliance: [BSTI_CERT],
    sroNotes: ['Non-alcoholic energy/carbonated drinks carry 100%-150% SD; alcoholic beverages carry 200%-350% SD & require Narcotics license.'],
  },
  '23': {
    rates: { cd: 0, rd: 0, sd: 0, vat: 0, ait: 2, at: 0 },
    unit: 'kg',
    compliance: [LIVESTOCK_QUARANTINE],
    sroNotes: ['Poultry, dairy, and fish feed ingredients enjoy 0%-5% CD and VAT exemption to support local agriculture.'],
  },
  '24': {
    rates: { cd: 25, rd: 3, sd: 350, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    ipoStatus: 'Conditional Import',
    sroNotes: ['Cigarettes and tobacco products carry the highest NBR Supplementary Duty (up to 350%) and require statutory health warnings in Bangla.'],
  },

  // Section V: Mineral Products (25-27)
  '25': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Cement clinker, limestone, gypsum, and industrial minerals are often assessed on specific BDT/MT tariff values.'],
  },
  '26': {
    rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },
  '27': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    ipoStatus: 'Conditional Import',
    compliance: [EXPLOSIVES_CERT, BSTI_CERT],
    sroNotes: ['Petroleum oils, lubricants, LNG, coal, and bitumen follow BPC/Energy Division & NBR specific tariff schedules.'],
  },

  // Section VI: Chemical & Allied Industries (28-38)
  '28': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [EXPLOSIVES_CERT],
    sroNotes: ['Basic inorganic industrial chemicals typically fall in the 5%–10% CD raw material slab.'],
  },
  '29': {
    rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [EXPLOSIVES_CERT],
    sroNotes: ['Active Pharmaceutical Ingredients (APIs) imported by DGDA-approved pharma manufacturers enjoy 0% CD & 0% VAT under Pharma SRO.'],
  },
  '30': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 },
    unit: 'kg',
    ipoStatus: 'Conditional Import',
    compliance: [DGDA_CERT],
    sroNotes: ['Life-saving drugs (insulin, vaccines, oncology medicines) carry 0% CD & 0% VAT; finished medicines must be on DGDA importable list.'],
  },
  '31': {
    rates: { cd: 0, rd: 0, sd: 0, vat: 0, ait: 0, at: 0 },
    unit: 'kg',
    sroNotes: ['Agricultural fertilizers (Urea, TSP, DAP, MOP) are 0% duty & 0% VAT exempt.'],
  },
  '32': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Textile dyes and pigments carry 5%–10% CD; finished decorative paints & varnishes carry 25% CD + 20% SD.'],
  },
  '33': {
    rates: { cd: 25, rd: 20, sd: 45, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
    sroNotes: ['Perfumes, skincare, makeup, and toiletries carry 25% CD + 20% RD + 20%–45% SD and minimum customs assessment value per kg, plus mandatory BSTI certification.'],
  },
  '34': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
    sroNotes: ['Industrial organic surface-active agents (3402 raw materials) carry 10%–15% CD, while retail soaps/detergents carry 25% CD + 20%–45% SD.'],
  },
  '35': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },
  '36': {
    rates: { cd: 25, rd: 3, sd: 30, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    ipoStatus: 'Restricted',
    compliance: [EXPLOSIVES_CERT],
  },
  '37': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },
  '38': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [EXPLOSIVES_CERT],
    sroNotes: ['Textile finishing agents & industrial chemical preparations generally attract 5%–10% CD; retail insecticides attract 25% CD.'],
  },

  // Section VII: Plastics & Rubber (39-40)
  '39': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Primary polymer granules/resins (3901–3914: PP, PE, PVC, PET) carry only 5% CD & 0% SD as industrial raw materials; finished plastic household articles (3923–3926) carry 25% CD + 20%–45% SD.'],
  },
  '40': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
    sroNotes: ['Natural/synthetic raw rubber (4001–4002) carries 5% CD; pneumatic tires (4011) carry 15%–25% CD + RD/SD depending on rim size (bus/truck vs car).'],
  },

  // Section VIII: Leather, Handbags, Travel Goods (41-43)
  '41': {
    rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: [RMG_BOND_NOTE],
  },
  '42': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: ['Luggage, suitcases, handbags, belts, and wallets carry 25% CD + 3% RD + 20% SD.'],
  },
  '43': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },

  // Section IX: Wood & Articles of Wood (44-46)
  '44': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [PLANT_QUARANTINE],
    sroNotes: ['Rough timber/logs carry 5% CD; MDF, particle board, and plywood carry 15%–25% CD + SD.'],
  },
  '45': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },
  '46': {
    rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
  },

  // Section X: Pulp, Paper & Paperboard (47-49)
  '47': {
    rates: { cd: 0, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Wood pulp and recovered waste paper carry 0% CD as paper mill raw material.'],
  },
  '48': {
    rates: { cd: 25, rd: 3, sd: 10, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: [RMG_BOND_NOTE, 'Duplex board, kraft liner, art card, and A4 paper carry 15%–25% CD; tissue/packaging cartons carry 25% CD + SD.'],
  },
  '49': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 },
    unit: 'kg',
    sroNotes: ['Printed educational/academic textbooks (4901) enjoy reduced/exempt VAT; commercial brochures & labels attract 25% CD + SD.'],
  },

  // Section XI: Textiles & Textile Articles (50-63)
  '50': { rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '51': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '52': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Raw cotton (5201) is 0% CD & 0% VAT; cotton yarn (5205–5207) is 10% CD; woven cotton fabrics (5208–5212) carry 25% CD + 20% SD unless imported under RMG Bonded Warehouse.', RMG_BOND_NOTE],
  },
  '53': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '54': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: ['Synthetic filament yarn (5402) carries 10% CD; woven synthetic fabrics (5407) carry 25% CD + 20% SD for commercial import.', RMG_BOND_NOTE] },
  '55': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: ['Staple fibers (5503–5504) carry 0%–5% CD; spun yarns carry 10% CD; woven staple fabrics carry 25% CD + 20% SD.', RMG_BOND_NOTE] },
  '56': { rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '57': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'sqm' },
  '58': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '59': { rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '60': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },
  '61': {
    rates: { cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: ['Finished knitted/crocheted garments carry 25% CD + 3% RD + 45% SD to protect domestic RMG industry.'],
  },
  '62': {
    rates: { cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: ['Finished woven apparel (shirts, trousers, suits, panjabis, sarees) carries 25% CD + 3% RD + 45% SD.'],
  },
  '63': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Worn clothing (6309) is strictly restricted/quota-controlled under Bangladesh Import Policy Order.'],
  },

  // Section XII: Footwear, Headgear, Umbrellas (64-67)
  '64': {
    rates: { cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 },
    unit: '2u',
    sroNotes: ['Finished footwear carries 25% CD + 3% RD + 45% SD; footwear uppers/soles (6406) carry lower intermediate rates for export factories.'],
  },
  '65': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'u', compliance: [BSTI_CERT] },
  '66': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'u' },
  '67': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, unit: 'kg' },

  // Section XIII: Stone, Ceramic, Glass (68-70)
  '68': { rates: { cd: 25, rd: 3, sd: 10, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '69': {
    rates: { cd: 25, rd: 3, sd: 60, vat: 15, ait: 5, at: 5 },
    unit: 'sqm',
    compliance: [BSTI_CERT],
    sroNotes: ['Ceramic & porcelain tiles (6907), sanitaryware (6910), and tableware (6911–6912) attract 45%–60% SD + tariff value per sqm/kg; refractory bricks (6902) carry only 10% CD & 0% SD.'],
  },
  '70': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Float glass, mirrors, and glassware attract 25% CD + 20%–30% SD; lab/pharma glass ampoules (7010/7017) carry lower 10%–15% CD.'],
  },

  // Section XIV: Pearls, Precious Metals, Jewellery (71)
  '71': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    ipoStatus: 'Conditional Import',
    sroNotes: ['Gold bars/bullion require Bangladesh Bank Gold Policy authorization; imitation jewellery (7117) carries 25% CD + 20% SD.'],
  },

  // Section XV: Base Metals & Articles (72-83)
  '72': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    compliance: [BSTI_CERT],
    sroNotes: ['Scrap/billet/HRC steel inputs carry specific BDT/MT or 5%–10% CD; finished GP/CI corrugated sheets & rebar carry 25% CD + RD.'],
  },
  '73': {
    rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Pipes, tubes, structures, screws, bolts, and kitchenware of iron/steel typically carry 15%–25% CD.'],
  },
  '74': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: ['Refined copper cathodes/wire rods carry 5% CD; finished copper articles carry 25% CD.'] },
  '75': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '76': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'kg',
    sroNotes: ['Unwrought aluminum ingots (7601) carry 5% CD; extruded profiles, doors/windows & kitchenware carry 25% CD + 20% SD.'],
  },
  '78': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '79': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '80': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '81': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '82': { rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, unit: 'kg' },
  '83': { rates: { cd: 25, rd: 3, sd: 10, vat: 15, ait: 5, at: 5 }, unit: 'kg', sroNotes: [RMG_BOND_NOTE] },

  // Section XVI: Machinery & Electrical Equipment (84-85)
  '84': {
    rates: { cd: 1, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroEligibleCapitalMachinery: true,
    compliance: [CAPITAL_MACHINERY_SRO],
    sroNotes: [
      'Most Chapter 84 industrial machines qualify as Capital Machinery: 1% CD, 0% VAT, 0% AT for Industrial IRC holders under NBR Capital Machinery SRO.',
      'Consumer appliances (ACs 8415, refrigerators 8418, domestic washing machines 8450) are excluded from Capital Machinery SRO and carry 25% CD + SD.',
    ],
  },
  '85': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: [
      'Industrial electrical switchgear/generators may qualify under Capital Machinery SRO; consumer electronics (TVs, smartphones, speakers, home appliances) carry 25% CD + RD/SD.',
    ],
  },

  // Section XVII: Vehicles, Aircraft, Vessels (86-89)
  '86': {
    rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
  },
  '87': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    ipoStatus: 'Conditional Import',
    sroNotes: [
      'Passenger cars/SUVs (8703) carry 25% CD + 3% RD + tiered Supplementary Duty from 20% up to 500% based on engine CC & hybrid/ICE type.',
      'Reconditioned vehicles must not exceed 5 years of age under Bangladesh Import Policy Order and are valued via NBR Yellow Book depreciation schedule.',
    ],
  },
  '88': {
    rates: { cd: 1, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    ipoStatus: 'Conditional Import',
    sroNotes: ['Drones/UAVs (8806) require prior Ministry of Defence / CAAB & BTRC clearance before import.'],
  },
  '89': {
    rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
  },

  // Section XVIII: Optical, Medical, Measuring, Watches, Musical (90-92)
  '90': {
    rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroEligibleCapitalMachinery: true,
    sroNotes: ['Medical, surgical, diagnostic & laboratory instruments (9018–9027) carry low 1%–5% CD; hospital referral equipment enjoys SRO concessions.'],
  },
  '91': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'u',
  },
  '92': {
    rates: { cd: 25, rd: 3, sd: 10, vat: 15, ait: 5, at: 5 },
    unit: 'u',
  },

  // Section XIX: Arms & Ammunition (93)
  '93': {
    rates: { cd: 25, rd: 3, sd: 100, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    ipoStatus: 'Restricted',
    sroNotes: ['Strictly restricted; requires Ministry of Home Affairs clearance and authorized arms dealer license.'],
  },

  // Section XX: Miscellaneous Manufactured Articles (94-96)
  '94': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: ['Furniture, mattresses, chandeliers, and decorative LED luminaires carry 25% CD + 3% RD + 20%–45% SD.'],
  },
  '95': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: ['Children toys (9503) carry 25% CD + 20% SD + minimum customs assessment value per kg; sports/gym equipment carries 10%–25% CD.'],
  },
  '96': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    unit: 'u',
    sroNotes: ['Zippers & buttons (9606–9607) are duty-free under RMG Bonded Warehouse; baby diapers & sanitary pads (9619) carry 25% CD + 45% SD.', RMG_BOND_NOTE],
  },

  // Section XXI: Works of Art & Special (97-99)
  '97': {
    rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
  },
  '99': {
    rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
    unit: 'u',
  },
};

/**
 * 4-digit Heading-level overrides where NBR tariff structure differs substantially from chapter baseline!
 * (For example, primary plastic resins 3901-3914 at 5% CD vs plastic tableware 3924 at 25% CD + 45% SD;
 * consumer ACs/fridges in Ch. 84 at 25% CD + SD vs industrial machinery at 1% CD!)
 */
export const HEADING_PROFILES: Record<string, Partial<ChapterTariffProfile>> = {
  // Primary Polymers / Resins (Raw Materials in Ch. 39 -> 5% CD, 0% RD, 0% SD!)
  '3901': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polyethylene', 'pe', 'hdpe', 'ldpe', 'lldpe', 'plastic granule', 'resin', 'plastic dana'] },
  '3902': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polypropylene', 'pp', 'copolymer', 'homopolymer', 'plastic granule', 'plastic dana'] },
  '3903': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polystyrene', 'gpps', 'hips', 'abs', 'eps', 'resin'] },
  '3904': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['pvc', 'polyvinyl chloride', 'pvc resin', 'suspension grade'] },
  '3905': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '3906': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['acrylic polymer', 'pmma'] },
  '3907': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['pet chips', 'polycarbonate', 'epoxy resin', 'polyester resin', 'polyacetal'] },
  '3908': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polyamide', 'nylon resin'] },
  '3909': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polyurethane', 'melamine resin', 'urea resin'] },
  '3910': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['silicone'] },
  '3911': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '3912': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '3913': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '3914': { rates: { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '3924': { rates: { cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 }, keywords: ['plastic tableware', 'kitchenware', 'tupperware', 'food container'] },

  // Cotton & Yarns in Ch. 52/54/55
  '5201': { rates: { cd: 0, rd: 0, sd: 0, vat: 0, ait: 0, at: 0 }, keywords: ['raw cotton', 'cotton bale'] },
  '5205': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['cotton yarn', 'carded yarn', 'combed yarn'] },
  '5206': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['cotton yarn'] },
  '5402': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polyester yarn', 'dty', 'fdy', 'poy', 'nylon yarn', 'spandex', 'elastane'] },
  '5503': { rates: { cd: 0, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['polyester staple fiber', 'psf'] },
  '5504': { rates: { cd: 0, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, keywords: ['viscose staple fiber', 'vsf', 'rayon'] },

  // Consumer Appliances inside Chapter 84 (NOT Capital Machinery!)
  '8414': { rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 }, sroEligibleCapitalMachinery: false, compliance: [BSTI_CERT] },
  '8415': {
    rates: { cd: 25, rd: 3, sd: 100, vat: 15, ait: 5, at: 5 },
    sroEligibleCapitalMachinery: false,
    compliance: [BSTI_CERT],
    sroNotes: ['CBU Split/Window Air Conditioners carry 25% CD + 3% RD + 100% SD; industrial central chillers >200,000 BTU qualify for much lower industrial rates.'],
  },
  '8418': {
    rates: { cd: 25, rd: 3, sd: 30, vat: 15, ait: 5, at: 5 },
    sroEligibleCapitalMachinery: false,
    compliance: [BSTI_CERT],
    sroNotes: ['Household refrigerators & freezers carry 25% CD + 3% RD + 30% SD; industrial cold-storage/medical blood bank freezers qualify for concessionary rates.'],
  },
  '8450': {
    rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
    sroEligibleCapitalMachinery: false,
    compliance: [BSTI_CERT],
    sroNotes: ['Household washing machines (≤10 kg) carry 25% CD + 3% RD + 20% SD; industrial laundry machines (>10 kg) carry 1% CD.'],
  },
  '8471': {
    rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
    sroEligibleCapitalMachinery: false,
    sroNotes: ['Laptops & computers carry 15% CD + 15% VAT + 5% AIT + 5% AT under recent NBR Finance Act adjustments to encourage local IT assembly.'],
  },

  // Key Chapter 85 Electronics & Telecom Headings
  '8501': { rates: { cd: 1, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, sroEligibleCapitalMachinery: true, compliance: [CAPITAL_MACHINERY_SRO] },
  '8502': { rates: { cd: 1, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, sroEligibleCapitalMachinery: true, compliance: [CAPITAL_MACHINERY_SRO] },
  '8504': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 }, sroEligibleCapitalMachinery: false },
  '8507': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, compliance: [BSTI_CERT] },
  '8508': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 } },
  '8509': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 } },
  '8516': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, compliance: [BSTI_CERT] },
  '8517': {
    rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
    ipoStatus: 'Conditional Import',
    compliance: [BTRC_CERT],
    sroNotes: ['Smartphones, routers, switches & wireless devices require prior BTRC NOC and IMEI registration (for cellular handsets).'],
  },
  '8518': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 } },
  '8525': { rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '8528': { rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 }, compliance: [BSTI_CERT] },
  '8539': { rates: { cd: 25, rd: 3, sd: 10, vat: 15, ait: 5, at: 5 }, compliance: [BSTI_CERT] },
  '8541': { rates: { cd: 1, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 }, sroNotes: ['Solar PV cells & modules carry low 1% CD and 0% VAT under Renewable Energy policy.'] },
  '8544': { rates: { cd: 25, rd: 3, sd: 10, vat: 15, ait: 5, at: 5 }, compliance: [BSTI_CERT] },

  // Vehicles inside Chapter 87
  '8701': { rates: { cd: 1, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 }, sroNotes: ['Agricultural tractors carry 1% CD & 0% VAT; prime movers carry 10% CD.'] },
  '8702': { rates: { cd: 15, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 } },
  '8703': { rates: { cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 } },
  '8704': { rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 } },
  '8708': { rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 } },
  '8711': { rates: { cd: 25, rd: 3, sd: 60, vat: 15, ait: 5, at: 5 }, sroNotes: ['CBU motorcycles carry 60%–100% SD; CKDkits for local motorcycle manufacturers carry much lower SRO rates (10% CD + 20% SD).'] },

  // Medical & Diagnostic Instruments in Ch. 90
  '9018': { rates: { cd: 5, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 }, compliance: [DGDA_CERT] },
  '9019': { rates: { cd: 5, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 }, compliance: [DGDA_CERT] },
  '9021': { rates: { cd: 0, rd: 0, sd: 0, vat: 0, ait: 0, at: 0 }, compliance: [DGDA_CERT], sroNotes: ['Cardiac stents, pacemakers, artificial joints & hearing aids are 0% CD & 0% VAT exempt.'] },
  '9022': { rates: { cd: 1, rd: 0, sd: 0, vat: 0, ait: 5, at: 0 }, compliance: [DGDA_CERT, RADIATION_TEST] },
};
