import axios from 'axios';

// Dynamic import of pdf-parse to avoid test file issues
let pdfParse;

class PDFIntelligenceExtractor {
  constructor() {
    this.gcNumberPatterns = [
      /GC\s*(?:No\.?|Number)?\s*:?\s*([\d\s]+[A-Z]?)/gi,
      /Gas\s*Council\s*(?:No\.?|Number)?\s*:?\s*([\d\s]+[A-Z]?)/gi,
      /(?:^|\n)([\d]{2}\s*[\d]{3}\s*[\d]{2}[A-Z]?)(?:\s|$)/gmi
    ];
    
    this.faultCodePatterns = [
      /(?:fault|error)\s*code\s*([A-Z]\d{1,2})/gi,
      /\b([A-Z]\d{1,2})\s*[-:]\s*[A-Z]/gi
    ];
  }

  async init() {
    if (!pdfParse) {
      const module = await import('pdf-parse/lib/pdf-parse.js');
      pdfParse = module.default;
    }
  }

  async downloadAndParsePDF(pdfUrl) {
    try {
      await this.init();
      console.log(`   Downloading: ${pdfUrl.substring(0, 80)}...`);
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024
      });
      
      const data = await pdfParse(response.data);
      
      return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractGCNumbers(text) {
    const gcNumbers = new Set();
    
    this.gcNumberPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        let gcNumber = match[1].replace(/\s+/g, ' ').trim();
        if (gcNumber.length >= 8 && gcNumber.length <= 12) {
          gcNumbers.add(gcNumber);
        }
      }
    });
    
    return Array.from(gcNumbers);
  }

  extractFaultCodes(text) {
    const faultCodes = new Set();
    
    this.faultCodePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        faultCodes.add(match[1].toUpperCase());
      }
    });
    
    return Array.from(faultCodes);
  }

  extractModelInfo(text, filename) {
    const models = new Set();
    
    // Extract from filename - improved pattern
    const filenamePatterns = [
      /DELTA[_\s]+([A-Z0-9_\s]+?)(?:_COMBI|_installation|\.pdf)/i,
      /([A-Za-z]+[-\s]+[A-Za-z0-9]+[-\s]*\d+)/
    ];
    
    filenamePatterns.forEach(pattern => {
      const match = filename.match(pattern);
      if (match) {
        models.add(match[1].trim().replace(/_/g, ' '));
      }
    });
    
    // Extract from text
    const modelPatterns = [
      /Model:\s*([A-Za-z0-9\s\-+]+)/gi,
      /Combination\s+boiler\s+([0-9\s/]+)/gi,
      /(Logic|Greenstar|ecoTEC|Vogue|Mexico|Response|DELTA)\s*\+?\s*[A-Z0-9\s]+/gi
    ];
    
    modelPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const model = match[1] || match[0];
        if (model && model.trim().length > 2) {
          models.add(model.trim());
        }
      }
    });
    
    return Array.from(models);
  }

  chunkText(text, chunkSize = 1000) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;
    let currentPage = 1;
    
    for (const para of paragraphs) {
      if (para.includes('\f')) currentPage++;
      
      const cleanPara = para.replace(/\f/g, '').trim();
      if (!cleanPara) continue;
      
      if ((currentChunk + cleanPara).length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          page: currentPage,
          faultCodes: this.extractFaultCodes(currentChunk)
        });
        currentChunk = cleanPara;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + cleanPara;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        page: currentPage,
        faultCodes: this.extractFaultCodes(currentChunk)
      });
    }
    
    return chunks;
  }

  async processPDF(pdfUrl, manufacturer, filename) {
    const parseResult = await this.downloadAndParsePDF(pdfUrl);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error };
    }
    
    const { text, pages } = parseResult;
    const gcNumbers = this.extractGCNumbers(text);
    const models = this.extractModelInfo(text, filename);
    const chunks = this.chunkText(text);
    
    return {
      success: true,
      metadata: {
        manufacturer,
        modelName: models[0] || null,
        gcNumbers,
        pageCount: pages,
        chunkCount: chunks.length
      },
      chunks,
      gcMappings: gcNumbers.map(gc => ({
        gcNumber: gc,
        modelName: models[0] || null
      }))
    };
  }
}

export default PDFIntelligenceExtractor;
