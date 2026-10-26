import { BatchItemInput, ImporterRegime } from '@shared/types';

export interface SampleProductPreset {
  label: string;
  category: string;
  query: string;
  defaultInvoiceUsd: number;
  defaultQty: number;
  suggestedRegime?: ImporterRegime;
}

export const SAMPLE_PRODUCT_PRESETS: SampleProductPreset[] = [
  {
    label: 'MacBook Air Laptop',
    category: 'IT Hardware',
    query: 'Apple MacBook Air 13-inch M3 portable laptop aluminum chassis 16GB RAM 512GB SSD weighing 1.24 kg',
    defaultInvoiceUsd: 11500,
    defaultQty: 10,
  },
  {
    label: '5G Smartphone (CBU)',
    category: 'Telecom',
    query: 'iPhone 16 Pro 256GB 5G cellular smartphone handset finished CBU retail box',
    defaultInvoiceUsd: 9500,
    defaultQty: 10,
  },
  {
    label: '550W Solar PV Panel',
    category: 'Renewable',
    query: 'Monocrystalline bifacial 550W solar photovoltaic PV panel module for rooftop power',
    defaultInvoiceUsd: 18000,
    defaultQty: 200,
  },
  {
    label: 'Hybrid SUV 1800cc',
    category: 'Automotive',
    query: 'Toyota Corolla Cross 1800cc petrol-electric hybrid SUV reconditioned 2023',
    defaultInvoiceUsd: 21500,
    defaultQty: 1,
  },
  {
    label: 'RMG Sewing Machine',
    category: 'Capital Machinery',
    query: 'Industrial single-needle direct drive lockstitch sewing machine for garments factory',
    defaultInvoiceUsd: 14000,
    defaultQty: 25,
    suggestedRegime: 'capital_machinery',
  },
  {
    label: 'Cotton Knitted T-Shirt',
    category: 'Apparel',
    query: '100% cotton knitted mens crew-neck t-shirt 180 GSM retail packed',
    defaultInvoiceUsd: 4000,
    defaultQty: 1000,
  },
  {
    label: 'PP Plastic Granules',
    category: 'Raw Material',
    query: 'Polypropylene (PP) homopolymer virgin plastic granules injection molding grade in 25kg bags',
    defaultInvoiceUsd: 24000,
    defaultQty: 20000,
    suggestedRegime: 'industrial',
  },
  {
    label: 'Skincare Serum',
    category: 'Cosmetics',
    query: 'Korean facial niacinamide 10% skincare serum in 30ml retail glass dropper bottle',
    defaultInvoiceUsd: 3500,
    defaultQty: 500,
  },
  {
    label: '25kg Bulk Milk Powder',
    category: 'Dairy / Food',
    query: 'Full cream whole milk powder unsweetened in 25kg bulk industrial kraft bag',
    defaultInvoiceUsd: 38000,
    defaultQty: 10000,
    suggestedRegime: 'industrial',
  },
  {
    label: 'সুইং মেশিন (বাংলা)',
    category: 'Bangla Input',
    query: 'গার্মেন্টস ফ্যাক্টরির জন্য ইন্ডাস্ট্রিয়াল সুইং মেশিন এবং ওভারলক মেশিন',
    defaultInvoiceUsd: 12000,
    defaultQty: 20,
    suggestedRegime: 'capital_machinery',
  },
];

export const DEFAULT_BATCH_ITEMS: BatchItemInput[] = [
  {
    id: 'item-1',
    description: 'Portable business laptop 14-inch Intel Core Ultra 16GB RAM 512GB SSD',
    invoiceValue: 8500,
    quantity: 10,
  },
  {
    id: 'item-2',
    description: 'Enterprise gigabit Wi-Fi 6 wireless router & PoE Ethernet switch',
    invoiceValue: 2200,
    quantity: 15,
  },
  {
    id: 'item-3',
    description: '27-inch 4K IPS LED computer monitor with HDMI/USB-C',
    invoiceValue: 3000,
    quantity: 10,
  },
  {
    id: 'item-4',
    description: '65W USB-C GaN fast power charger adapter',
    invoiceValue: 600,
    quantity: 40,
  },
];
