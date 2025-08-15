#!/usr/bin/env node

/**
 * Console Log Cleanup Script
 * Removes all console.log statements from production code while preserving intentional logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConsoleLogCleaner {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      logsRemoved: 0,
      logsPreserved: 0,
      errors: 0
    };
    
    // Patterns to identify console logs that should be removed
    this.removePatterns = [
      /^\s*console\.log\s*\([^)]*\)\s*;?\s*$/gm,
      /^\s*console\.debug\s*\([^)]*\)\s*;?\s*$/gm,
      /^\s*console\.info\s*\([^)]*\)\s*;?\s*$/gm,
      /^\s*console\.trace\s*\([^)]*\)\s*;?\s*$/gm
    ];
    
    // Patterns to preserve (intentional logging)
    this.preservePatterns = [
      /console\.error/,
      /console\.warn/,
      /console\.assert/,
      /console\.time/,
      /console\.group/,
      // Preserve logs with specific comments
      /\/\*\s*keep\s*\*\/.*console\./i,
      /\/\/\s*keep.*console\./i,
      // Preserve logs in error handling
      /catch.*console\./,
      // Preserve startup/initialization logs
      /startup|initialization|server.*start/i
    ];
    
    // Directories to process
    this.targetDirs = [
      path.join(__dirname, '../src'),
      path.join(__dirname, '../server'),
      path.join(__dirname, '../scripts')
    ];
    
    // Files to exclude
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.test\./,
      /\.spec\./,
      /test/,
      /tests/,
      /cleanup-console-logs\.js$/
    ];
  }

  /**
   * Main cleanup function
   */
  async cleanup() {
    console.log('🧹 Starting console log cleanup...\n');
    
    for (const dir of this.targetDirs) {
      if (fs.existsSync(dir)) {
        await this.processDirectory(dir);
      }
    }
    
    this.printSummary();
  }

  /**
   * Process a directory recursively
   */
  async processDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (this.shouldExclude(fullPath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.processDirectory(fullPath);
        } else if (entry.isFile() && this.isJavaScriptFile(entry.name)) {
          await this.processFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${dirPath}:`, error.message);
      this.stats.errors++;
    }
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = originalContent;
      let removedCount = 0;
      let preservedCount = 0;
      
      // Split content into lines for analysis
      const lines = originalContent.split('\n');
      const modifiedLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const shouldRemove = this.shouldRemoveConsoleLine(line);
        const shouldPreserve = this.shouldPreserveLine(line);
        
        if (shouldRemove && !shouldPreserve) {
          // Check if it's a multi-line console statement
          if (this.isMultiLineConsoleStart(line)) {
            const endIndex = this.findMultiLineConsoleEnd(lines, i);
            if (endIndex > i) {
              // Skip all lines of the multi-line console statement
              i = endIndex;
              removedCount++;
              continue;
            }
          }
          
          // Remove single-line console statement
          removedCount++;
          continue;
        } else if (line.includes('console.')) {
          preservedCount++;
        }
        
        modifiedLines.push(line);
      }
      
      modifiedContent = modifiedLines.join('\n');
      
      // Only write if content changed
      if (modifiedContent !== originalContent) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✅ ${relativePath}: Removed ${removedCount} console logs, preserved ${preservedCount}`);
      }
      
      this.stats.filesProcessed++;
      this.stats.logsRemoved += removedCount;
      this.stats.logsPreserved += preservedCount;
      
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error.message);
      this.stats.errors++;
    }
  }

  /**
   * Check if a line should be removed
   */
  shouldRemoveConsoleLine(line) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return false;
    }
    
    return this.removePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if a line should be preserved
   */
  shouldPreserveLine(line) {
    return this.preservePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if line starts a multi-line console statement
   */
  isMultiLineConsoleStart(line) {
    const trimmed = line.trim();
    return (
      (trimmed.includes('console.log(') || trimmed.includes('console.debug(') || 
       trimmed.includes('console.info(') || trimmed.includes('console.trace(')) &&
      !trimmed.includes(');') &&
      !trimmed.endsWith(');')
    );
  }

  /**
   * Find the end of a multi-line console statement
   */
  findMultiLineConsoleEnd(lines, startIndex) {
    let openParens = 0;
    let inString = false;
    let stringChar = null;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const prevChar = j > 0 ? line[j - 1] : null;
        
        // Handle string literals
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = null;
          }
        }
        
        if (!inString) {
          if (char === '(') {
            openParens++;
          } else if (char === ')') {
            openParens--;
            if (openParens === 0) {
              return i;
            }
          }
        }
      }
    }
    
    return startIndex; // Fallback if no end found
  }

  /**
   * Check if file should be excluded
   */
  shouldExclude(filePath) {
    return this.excludePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if file is a JavaScript file
   */
  isJavaScriptFile(filename) {
    return /\.(js|jsx|ts|tsx)$/.test(filename);
  }

  /**
   * Print cleanup summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🧹 CONSOLE LOG CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
    console.log(`🗑️  Console logs removed: ${this.stats.logsRemoved}`);
    console.log(`✅ Console logs preserved: ${this.stats.logsPreserved}`);
    console.log(`❌ Errors encountered: ${this.stats.errors}`);
    console.log('='.repeat(60));
    
    if (this.stats.logsRemoved > 0) {
      console.log('✨ Cleanup completed successfully!');
      console.log('💡 Preserved logs include error/warn statements and intentionally marked logs.');
    } else {
      console.log('✨ No console logs found to remove - codebase is already clean!');
    }
    
    if (this.stats.errors > 0) {
      console.log(`⚠️  ${this.stats.errors} errors occurred during cleanup. Please review manually.`);
    }
  }

  /**
   * Dry run mode - analyze without making changes
   */
  async analyze() {
    console.log('🔍 Analyzing console log usage (dry run)...\n');
    
    const originalProcessFile = this.processFile.bind(this);
    this.processFile = async (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let removableCount = 0;
        let preservableCount = 0;
        
        for (const line of lines) {
          if (line.includes('console.')) {
            if (this.shouldRemoveConsoleLine(line) && !this.shouldPreserveLine(line)) {
              removableCount++;
            } else {
              preservableCount++;
            }
          }
        }
        
        if (removableCount > 0 || preservableCount > 0) {
          const relativePath = path.relative(process.cwd(), filePath);
          console.log(`📄 ${relativePath}: ${removableCount} removable, ${preservableCount} preserved`);
        }
        
        this.stats.filesProcessed++;
        this.stats.logsRemoved += removableCount;
        this.stats.logsPreserved += preservableCount;
        
      } catch (error) {
        console.error(`❌ Error analyzing file ${filePath}:`, error.message);
        this.stats.errors++;
      }
    };
    
    for (const dir of this.targetDirs) {
      if (fs.existsSync(dir)) {
        await this.processDirectory(dir);
      }
    }
    
    this.printSummary();
  }
}

// Command line interface
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-n');
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
Console Log Cleanup Script

Usage:
  node cleanup-console-logs.js [options]

Options:
  --dry-run, -n    Analyze console logs without removing them
  --help, -h       Show this help message

Examples:
  node cleanup-console-logs.js           # Remove console logs
  node cleanup-console-logs.js --dry-run # Analyze only
`);
  process.exit(0);
}

// Run the cleanup
const cleaner = new ConsoleLogCleaner();

if (isDryRun) {
  cleaner.analyze().catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
} else {
  cleaner.cleanup().catch(error => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
}
