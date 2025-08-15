/**
 * Fault Code Repository
 * Handles database operations for boiler fault codes
 */

import BaseRepository from './BaseRepository.js';

class FaultCodeRepository extends BaseRepository {
  constructor() {
    super('boiler_fault_codes');
  }

  /**
   * Find fault codes by manufacturer
   */
  async findByManufacturer(manufacturer, options = {}) {
    if (!manufacturer) return [];
    
    const cacheKey = `manufacturer_${manufacturer.toLowerCase()}`;
    return this._getCached(cacheKey, async () => {
      return this.findBy(
        { manufacturer: manufacturer.toLowerCase() },
        {
          orderBy: { field: 'fault_code', ascending: true },
          ...options
        }
      );
    });
  }

  /**
   * Find specific fault code for manufacturer
   */
  async findByManufacturerAndCode(manufacturer, faultCode, options = {}) {
    if (!manufacturer || !faultCode) return null;
    
    const cacheKey = `fault_${manufacturer.toLowerCase()}_${faultCode.toUpperCase()}`;
    return this._getCached(cacheKey, async () => {
      return this.findOneBy({
        manufacturer: manufacturer.toLowerCase(),
        fault_code: faultCode.toUpperCase()
      }, options);
    });
  }

  /**
   * Search fault codes by description
   */
  async searchByDescription(searchTerm, options = {}) {
    if (!searchTerm) return [];
    
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(options.select || '*')
        .textSearch('description', searchTerm, {
          type: 'websearch',
          config: 'english'
        })
        .limit(options.limit || 20);

      if (error) {
        console.error('Fault code search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Repository searchByDescription error:', error);
      throw error;
    }
  }

  /**
   * Get all supported manufacturers
   */
  async getSupportedManufacturers() {
    const cacheKey = 'supported_manufacturers';
    return this._getCached(cacheKey, async () => {
      try {
        const { data, error } = await this.supabase
          .from(this.tableName)
          .select('manufacturer')
          .order('manufacturer');

        if (error) {
          console.error('Get manufacturers error:', error);
          throw new Error(`Failed to get manufacturers: ${error.message}`);
        }

        // Return unique manufacturers
        const manufacturers = [...new Set(data.map(row => row.manufacturer))];
        return manufacturers.filter(Boolean);
      } catch (error) {
        console.error('Repository getSupportedManufacturers error:', error);
        throw error;
      }
    });
  }

  /**
   * Get fault code statistics
   */
  async getStatistics() {
    const cacheKey = 'fault_code_stats';
    return this._getCached(cacheKey, async () => {
      try {
        const [totalCount, manufacturerStats] = await Promise.all([
          this.count(),
          this._getManufacturerStats()
        ]);

        return {
          totalFaultCodes: totalCount,
          manufacturerBreakdown: manufacturerStats,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error('Repository getStatistics error:', error);
        throw error;
      }
    });
  }

  /**
   * Get manufacturer statistics
   * @private
   */
  async _getManufacturerStats() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('manufacturer')
        .order('manufacturer');

      if (error) {
        throw new Error(`Failed to get manufacturer stats: ${error.message}`);
      }

      // Count fault codes per manufacturer
      const stats = {};
      data.forEach(row => {
        const manufacturer = row.manufacturer;
        if (manufacturer) {
          stats[manufacturer] = (stats[manufacturer] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Get manufacturer stats error:', error);
      throw error;
    }
  }

  /**
   * Bulk import fault codes
   */
  async bulkImport(faultCodes) {
    if (!Array.isArray(faultCodes) || faultCodes.length === 0) {
      throw new Error('Invalid fault codes array for bulk import');
    }

    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(faultCodes)
        .select();

      if (error) {
        console.error('Bulk import error:', error);
        throw new Error(`Bulk import failed: ${error.message}`);
      }

      // Clear cache after bulk import
      this.clearCache();

      return data;
    } catch (error) {
      console.error('Repository bulkImport error:', error);
      throw error;
    }
  }
}

export default FaultCodeRepository;
