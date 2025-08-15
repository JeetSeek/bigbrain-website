// Demo Manual Service - simulates manual finder API responses
// This allows the app to work without requiring Supabase access

// Mock data for boiler manuals
const DEMO_MANUALS = [
  {
    id: 1,
    make: 'Worcester Bosch',
    model: 'Greenstar 30i',
    fuel_type: 'Gas',
    upload_date: '2023-12-15T10:30:00Z',
    description:
      'Installation and servicing instructions for the Greenstar 30i condensing combi boiler',
    file_url: 'https://example.com/manuals/worcester-greenstar-30i.pdf',
    file_size: 4521984,
    year: 2022,
    downloads: 1254,
    page_count: 68,
  },
  {
    id: 2,
    make: 'Vaillant',
    model: 'ecoTEC plus 835',
    fuel_type: 'Gas',
    upload_date: '2023-11-22T14:45:00Z',
    description:
      'User manual and installation guide for Vaillant ecoTEC plus 835 high efficiency combi boiler',
    file_url: 'https://example.com/manuals/vaillant-ecotec-plus-835.pdf',
    file_size: 3845120,
    year: 2021,
    downloads: 938,
    page_count: 54,
  },
  {
    id: 3,
    make: 'Baxi',
    model: 'Platinum 28',
    fuel_type: 'Gas',
    upload_date: '2024-01-05T09:15:00Z',
    description: 'Complete user and service guide for Baxi Platinum 28 combi boiler',
    file_url: 'https://example.com/manuals/baxi-platinum-28.pdf',
    file_size: 5242880,
    year: 2023,
    downloads: 756,
    page_count: 72,
  },
  {
    id: 4,
    make: 'Ideal',
    model: 'Logic+ 30',
    fuel_type: 'Gas',
    upload_date: '2023-10-18T16:20:00Z',
    description: 'Installation and service manual for Ideal Logic+ 30 combi boiler',
    file_url: 'https://example.com/manuals/ideal-logic-plus-30.pdf',
    file_size: 4194304,
    year: 2022,
    downloads: 1089,
    page_count: 64,
  },
  {
    id: 5,
    make: 'Viessmann',
    model: 'Vitodens 100-W',
    fuel_type: 'Gas',
    upload_date: '2024-02-20T11:10:00Z',
    description:
      'Technical and user guide for Viessmann Vitodens 100-W wall-mounted gas condensing boiler',
    file_url: 'https://example.com/manuals/viessmann-vitodens-100w.pdf',
    file_size: 6291456,
    year: 2023,
    downloads: 625,
    page_count: 84,
  },
  {
    id: 6,
    make: 'Glow-worm',
    model: 'Energy 30C',
    fuel_type: 'Gas',
    upload_date: '2023-09-05T13:40:00Z',
    description:
      'Installation and servicing instructions for Glow-worm Energy 30C condensing combination boiler',
    file_url: 'https://example.com/manuals/glowworm-energy-30c.pdf',
    file_size: 3670016,
    year: 2021,
    downloads: 712,
    page_count: 58,
  },
  {
    id: 7,
    make: 'Potterton',
    model: 'Gold 28',
    fuel_type: 'Gas',
    upload_date: '2023-08-14T15:55:00Z',
    description: 'User and installation guide for Potterton Gold 28 high efficiency combi boiler',
    file_url: 'https://example.com/manuals/potterton-gold-28.pdf',
    file_size: 4718592,
    year: 2022,
    downloads: 543,
    page_count: 62,
  },
  {
    id: 8,
    make: 'Alpha',
    model: 'E-Tec Plus 28',
    fuel_type: 'Gas',
    upload_date: '2024-03-30T10:05:00Z',
    description:
      'Installation and service manual for Alpha E-Tec Plus 28 condensing combination boiler',
    file_url: 'https://example.com/manuals/alpha-etec-plus-28.pdf',
    file_size: 5033164,
    year: 2023,
    downloads: 318,
    page_count: 70,
  },
  {
    id: 9,
    make: 'Ariston',
    model: 'Clas HE EVO 30',
    fuel_type: 'Gas',
    upload_date: '2023-11-08T14:25:00Z',
    description: 'User and installation guide for Ariston Clas HE EVO 30 high efficiency boiler',
    file_url: 'https://example.com/manuals/ariston-clas-he-evo-30.pdf',
    file_size: 3932160,
    year: 2021,
    downloads: 429,
    page_count: 60,
  },
  {
    id: 10,
    make: 'Worcester Bosch',
    model: 'Greenstar 8000 Life 30kW',
    fuel_type: 'Gas',
    upload_date: '2024-01-25T08:50:00Z',
    description:
      'Technical and user guide for Worcester Bosch Greenstar 8000 Life 30kW gas-fired condensing boiler',
    file_url: 'https://example.com/manuals/worcester-greenstar-8000-life.pdf',
    file_size: 7340032,
    year: 2023,
    downloads: 892,
    page_count: 90,
  },
  {
    id: 11,
    make: 'Grant',
    model: 'Vortex Pro 26',
    fuel_type: 'Oil',
    upload_date: '2023-10-02T09:30:00Z',
    description:
      'Installation and servicing instructions for Grant Vortex Pro 26 oil-fired condensing boiler',
    file_url: 'https://example.com/manuals/grant-vortex-pro-26.pdf',
    file_size: 5767168,
    year: 2022,
    downloads: 276,
    page_count: 76,
  },
  {
    id: 12,
    make: 'Navien',
    model: 'NCB 40',
    fuel_type: 'Gas',
    upload_date: '2024-04-10T13:15:00Z',
    description:
      'Installation and operation manual for Navien NCB 40 condensing combination boiler',
    file_url: 'https://example.com/manuals/navien-ncb-40.pdf',
    file_size: 4980736,
    year: 2023,
    downloads: 187,
    page_count: 68,
  },
];

export const demoManualService = {
  // Get all unique manufacturers from the data
  async getManufacturers() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get unique manufacturer names
    const manufacturers = [...new Set(DEMO_MANUALS.map(manual => manual.make))].sort();
    return manufacturers;
  },

  // Search and filter manuals
  async searchManuals({ query = '', manufacturer = '', sortBy = 'upload_date', order = 'desc' }) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    let results = [...DEMO_MANUALS];

    // Apply text search filter
    if (query) {
      const searchLower = query.toLowerCase();
      results = results.filter(
        manual =>
          manual.model.toLowerCase().includes(searchLower) ||
          manual.make.toLowerCase().includes(searchLower) ||
          manual.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply manufacturer filter
    if (manufacturer) {
      results = results.filter(manual => manual.make === manufacturer);
    }

    // Apply sorting
    results.sort((a, b) => {
      // Handle different sort fields
      if (sortBy === 'upload_date') {
        return order === 'desc'
          ? new Date(b.upload_date) - new Date(a.upload_date)
          : new Date(a.upload_date) - new Date(b.upload_date);
      }

      if (sortBy === 'downloads') {
        return order === 'desc' ? b.downloads - a.downloads : a.downloads - b.downloads;
      }

      if (sortBy === 'year') {
        return order === 'desc' ? b.year - a.year : a.year - b.year;
      }

      // Default sort by make/model
      if (sortBy === 'make') {
        const makeCompare = a.make.localeCompare(b.make);
        return order === 'desc' ? -makeCompare : makeCompare;
      }

      if (sortBy === 'model') {
        const modelCompare = a.model.localeCompare(b.model);
        return order === 'desc' ? -modelCompare : modelCompare;
      }

      return 0;
    });

    return results;
  },

  // Simulate downloading a manual
  async downloadManual(id) {
    // Simulate network delay for "download"
    await new Promise(resolve => setTimeout(resolve, 2000));

    const manual = DEMO_MANUALS.find(m => m.id === id);
    if (!manual) {
      throw new Error('Manual not found');
    }

    // In a real app, this would trigger a file download
    // In demo mode, we just return success
    return {
      success: true,
      message: `Downloaded ${manual.make} ${manual.model} manual successfully!`,
      manual,
    };
  },

  // Track manual views (simulated)
  async trackManualView(id) {
    // Quick operation, just simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // In demo mode, no actual tracking occurs
    return { success: true };
  },
};
