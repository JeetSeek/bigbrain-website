/**
 * Environment Variable Validation Utility
 * Provides comprehensive validation for all environment variables used across the application
 */

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validated = false;
  }

  /**
   * Validate all required environment variables
   * @param {boolean} throwOnError - Whether to throw an error if validation fails
   * @returns {Object} Validation results
   */
  validateAll(throwOnError = true) {
    this.errors = [];
    this.warnings = [];

    // Core application variables
    this.validateRequired('SUPABASE_URL', 'string', 'https://');
    this.validateRequired('SUPABASE_ANON_KEY', 'string');
    this.validateRequired('SUPABASE_SERVICE_ROLE_KEY', 'string');

    // AI service variables
    this.validateOptional('OPENAI_API_KEY', 'string');
    this.validateOptional('OPENAI_API_KEY_2', 'string');
    this.validateOptional('OPENAI_API_KEY_3', 'string');
    this.validateOptional('OPENAI_API_KEY_4', 'string');
    this.validateOptional('OPENAI_API_KEY_5', 'string');
    this.validateOptional('DEEPSEEK_API_KEY', 'string');
    this.validateOptional('OPENAI_MODEL', 'string');

    // Server configuration
    this.validateOptional('PORT', 'number', null, { min: 1000, max: 65535 });
    this.validateOptional('NODE_ENV', 'string', null, { enum: ['development', 'production', 'test'] });

    // MCP and external service keys
    this.validateOptional('YOUTUBE_API_KEY', 'string');
    this.validateOptional('GOOGLE_SEARCH_API_KEY', 'string');
    this.validateOptional('GOOGLE_SEARCH_ENGINE_ID', 'string');

    this.validated = true;

    const results = {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: this.generateSummary()
    };

    if (throwOnError && this.errors.length > 0) {
      throw new Error(`Environment validation failed:\n${this.errors.join('\n')}`);
    }

    return results;
  }

  /**
   * Validate a required environment variable
   * @private
   */
  validateRequired(name, type, prefix = null, options = {}) {
    const value = process.env[name];

    if (!value) {
      this.errors.push(`❌ REQUIRED: ${name} is not set`);
      return false;
    }

    return this.validateValue(name, value, type, prefix, options, true);
  }

  /**
   * Validate an optional environment variable
   * @private
   */
  validateOptional(name, type, prefix = null, options = {}) {
    const value = process.env[name];

    if (!value) {
      this.warnings.push(`⚠️  OPTIONAL: ${name} is not set (using default if available)`);
      return true;
    }

    return this.validateValue(name, value, type, prefix, options, false);
  }

  /**
   * Validate the actual value
   * @private
   */
  validateValue(name, value, type, prefix, options, isRequired) {
    const severity = isRequired ? '❌' : '⚠️';

    // Type validation
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          this.errors.push(`${severity} ${name}: Expected string, got ${typeof value}`);
          return false;
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          this.errors.push(`${severity} ${name}: Expected number, got "${value}"`);
          return false;
        }
        
        // Range validation for numbers
        if (options.min !== undefined && numValue < options.min) {
          this.errors.push(`${severity} ${name}: Value ${numValue} is below minimum ${options.min}`);
          return false;
        }
        if (options.max !== undefined && numValue > options.max) {
          this.errors.push(`${severity} ${name}: Value ${numValue} is above maximum ${options.max}`);
          return false;
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          this.errors.push(`${severity} ${name}: Expected boolean (true/false/1/0), got "${value}"`);
          return false;
        }
        break;
    }

    // Prefix validation
    if (prefix && !value.startsWith(prefix)) {
      this.errors.push(`${severity} ${name}: Expected to start with "${prefix}", got "${value.substring(0, 20)}..."`);
      return false;
    }

    // Enum validation
    if (options.enum && !options.enum.includes(value)) {
      this.errors.push(`${severity} ${name}: Expected one of [${options.enum.join(', ')}], got "${value}"`);
      return false;
    }

    // Length validation
    if (options.minLength && value.length < options.minLength) {
      this.errors.push(`${severity} ${name}: Minimum length ${options.minLength}, got ${value.length}`);
      return false;
    }

    return true;
  }

  /**
   * Generate validation summary
   * @private
   */
  generateSummary() {
    const total = this.errors.length + this.warnings.length;
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      return '✅ All environment variables are properly configured';
    }

    let summary = `📊 Environment Validation Summary:\n`;
    summary += `   • ${this.errors.length} errors\n`;
    summary += `   • ${this.warnings.length} warnings\n`;
    
    if (this.errors.length === 0) {
      summary += '✅ No critical issues found';
    } else {
      summary += '❌ Critical issues require attention';
    }

    return summary;
  }

  /**
   * Get sanitized environment info for logging (removes sensitive values)
   */
  getSanitizedEnvInfo() {
    const sensitiveKeys = [
      'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
      'OPENAI_API_KEY', 'OPENAI_API_KEY_2', 'OPENAI_API_KEY_3', 'OPENAI_API_KEY_4', 'OPENAI_API_KEY_5',
      'DEEPSEEK_API_KEY', 'YOUTUBE_API_KEY', 'GOOGLE_SEARCH_API_KEY'
    ];

    const envInfo = {};
    
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('SUPABASE_') || key.startsWith('OPENAI_') || key.startsWith('DEEPSEEK_') || 
          key.startsWith('YOUTUBE_') || key.startsWith('GOOGLE_') || key === 'PORT' || key === 'NODE_ENV') {
        
        if (sensitiveKeys.includes(key)) {
          const value = process.env[key];
          envInfo[key] = value ? `${value.substring(0, 8)}...` : 'NOT_SET';
        } else {
          envInfo[key] = process.env[key] || 'NOT_SET';
        }
      }
    });

    return envInfo;
  }

  /**
   * Validate environment variables at startup
   * @static
   */
  static validateAtStartup() {
    const validator = new EnvironmentValidator();
    
    try {
      const results = validator.validateAll(false);
      
      
      if (results.errors.length > 0) {
        results.errors.forEach(error => console.log(`   ${error}`));
      }
      
      if (results.warnings.length > 0) {
        results.warnings.forEach(warning => console.log(`   ${warning}`));
      }

      // Log sanitized environment info in development
      if (process.env.NODE_ENV === 'development') {
        const sanitized = validator.getSanitizedEnvInfo();
        Object.entries(sanitized).forEach(([key, value]) => {
        });
      }

      return results;
      
    } catch (error) {
      console.error('❌ Environment validation failed:', error.message);
      throw error;
    }
  }
}

export default EnvironmentValidator;
