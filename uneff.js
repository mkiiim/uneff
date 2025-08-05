// Uneff - A tool to remove BOM and problematic Unicode characters from files
const fs = require('fs');
const path = require('path');

/**
 * Generate default character mappings as a CSV string.
 * @returns {string} CSV content with default problematic character mappings
 */
function getDefaultMappingsCsv() {
  // Default problematic Unicode characters with Replacement column
  const defaultMappings = [
    ["Character", "Unicode", "Name", "Remove", "Replacement"],
    ["�", "\\ufffd", "Replacement Character", "True", ""],
    ["", "\\u0000", "NULL", "True", ""],
    ["", "\\u001a", "Substitute", "True", ""],
    ["", "\\u001c", "File Separator", "True", ""],
    ["", "\\u001d", "Group Separator", "True", ""],
    ["", "\\u001e", "Record Separator", "True", ""],
    ["", "\\u001f", "Unit Separator", "True", ""],
    ["", "\\u2028", "Line Separator", "True", " "],
    ["", "\\u2029", "Paragraph Separator", "True", "\n"],
    ["", "\\u200b", "Zero Width Space", "True", ""],
    ["", "\\u200c", "Zero Width Non-Joiner", "True", ""],
    ["", "\\u200d", "Zero Width Joiner", "True", ""],
    ["", "\\u200e", "Left-to-Right Mark", "True", ""],
    ["", "\\u200f", "Right-to-Left Mark", "True", ""],
    ["", "\\u202a", "Left-to-Right Embedding", "True", ""],
    ["", "\\u202b", "Right-to-Left Embedding", "True", ""],
    ["", "\\u202c", "Pop Directional Formatting", "True", ""],
    ["", "\\u202d", "Left-to-Right Override", "True", ""],
    ["", "\\u202e", "Right-to-Left Override", "True", ""],
    ["⁡", "\\u2061", "Function Application", "True", ""],
    ["⁢", "\\u2062", "Invisible Times", "True", ""],
    ["⁣", "\\u2063", "Invisible Separator", "True", ""],
    ["⁤", "\\u2064", "Invisible Plus", "True", ""],
    ["", "\\u2066", "Left-to-Right Isolate", "True", ""],
    ["", "\\u2067", "Right-to-Left Isolate", "True", ""],
    ["", "\\u2068", "First Strong Isolate", "True", ""],
    ["", "\\u2069", "Pop Directional Isolate", "True", ""],
    ["﻿", "\\ufeff", "BOM (in middle of file)", "True", ""],
    
    // Smart quotes and typographic characters
    ["'", "\\u2018", "Left Single Quotation Mark", "False", "'"],
    ["'", "\\u2019", "Right Single Quotation Mark", "False", "'"],
    ["\u201c", "\\u201c", "Left Double Quotation Mark", "False", "\""],
    ["\u201d", "\\u201d", "Right Double Quotation Mark", "False", "\""],
    ["‹", "\\u2039", "Single Left-Pointing Angle Quotation Mark", "False", "<"],
    ["›", "\\u203a", "Single Right-Pointing Angle Quotation Mark", "False", ">"],
    ["«", "\\u00ab", "Left-Pointing Double Angle Quotation Mark", "False", "<<"],
    ["»", "\\u00bb", "Right-Pointing Double Angle Quotation Mark", "False", ">>"],
    ["–", "\\u2013", "En Dash", "False", "-"],
    ["—", "\\u2014", "Em Dash", "False", "--"],
    ["…", "\\u2026", "Horizontal Ellipsis", "False", "..."],
    ["′", "\\u2032", "Prime", "False", "'"],
    ["″", "\\u2033", "Double Prime", "False", "\""],
    ["‐", "\\u2010", "Hyphen", "False", "-"],
    ["‑", "\\u2011", "Non-Breaking Hyphen", "False", "-"],
    ["‒", "\\u2012", "Figure Dash", "False", "-"],
    ["•", "\\u2022", "Bullet", "False", "*"],
    ["·", "\\u00b7", "Middle Dot", "False", "."]
    // Note: We're omitting the extended diacritic mappings to keep the JS version simpler
  ];
  
  // Convert to CSV and write to file
  return defaultMappings.map(row => 
    row.map(cell => 
      // Quote cells with commas
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n');
}

/**
 * Creates a default mapping file with common problematic characters.
 * @param {string} mappingFilePath - Path to save the mappings file
 * @param {boolean} verbose - Whether to print status messages
 */
function createDefaultMappings(mappingFilePath, verbose = true) {
  if (verbose) {
    console.log(`Mappings file not found at: ${mappingFilePath}`);
    console.log('Creating default mappings file...');
  }
  
  // Get default mappings CSV
  const csvContent = getDefaultMappingsCsv();
  
  fs.writeFileSync(mappingFilePath, csvContent, 'utf8');
  if (verbose) {
    console.log(`Default mappings saved to: ${mappingFilePath}`);
  }
}

/**
 * Parse character mappings from CSV content string.
 * @param {string} csvContent - Content of the mappings CSV
 * @returns {Array} List of objects with char, name, and replacement properties
 */
function parseMappingCsv(csvContent) {
  const mappings = [];
  const rows = csvContent.split('\n');
  
  // Get header row
  const header = rows[0].split(',');
  
  // Check if we have the Replacement column
  const hasReplacementCol = 
    header && 
    header.length >= 5 && 
    header[4].trim().toLowerCase() === "replacement";
  
  // Skip header row, parse each mapping
  for (let i = 1; i < rows.length; i++) {
    // Handle quoted fields with commas
    let row = rows[i].trim();
    if (!row) continue;
    
    let fields = [];
    let inQuotes = false;
    let currentField = '';
    
    for (let j = 0; j < row.length; j++) {
      const char = row[j];
      
      if (char === '"' && (j === 0 || row[j-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    fields.push(currentField); // Add the last field
    
    // Get values from fields
    if (fields.length < 4) continue;
    const unicodeStr = (fields[1] || '').trim();
    const name = (fields[2] || '').trim();
    const remove = (fields[3] || '').trim().toLowerCase() === 'true';
    
    // Get replacement character if available
    let replacement = "";
    if (hasReplacementCol && fields.length >= 5) {
      replacement = fields[4];
      
      // Handle special escape sequences in replacement
      replacement = replacement
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');
    }
    
    // Only add to mappings if set to remove
    if (remove) {
      // Convert unicode escape sequence to the actual character
      try {
        const char = eval(`"${unicodeStr}"`);
        mappings.push({ char, name, replacement });
      } catch (e) {
        continue;
      }
    }
  }
  
  return mappings;
}

/**
 * Read problematic character mappings from a CSV file.
 * Creates default file if it doesn't exist.
 * @param {string} mappingFilePath - Path to the mappings file
 * @param {boolean} verbose - Whether to print status messages
 * @returns {Array} List of objects with char, name, and replacement properties
 */
function readCharMappings(mappingFilePath, verbose = true) {
  try {
    // Check if mapping file exists, if not, create with defaults
    if (!fs.existsSync(mappingFilePath)) {
      createDefaultMappings(mappingFilePath, verbose);
    }
    
    // Read file content
    const csvContent = fs.readFileSync(mappingFilePath, 'utf8');
    
    // Parse the CSV content
    const mappings = parseMappingCsv(csvContent);
    
    if (verbose) {
      console.log(`Loaded ${mappings.length} problematic character mappings from: ${mappingFilePath}`);
    }
    
    return mappings;
    
  } catch (error) {
    if (verbose) {
      console.error(`Error reading mappings file: ${error.message}`);
      console.log('Using default mappings instead.');
    }
    
    // Parse the default mappings in memory
    return parseMappingCsv(getDefaultMappingsCsv());
  }
}

/**
 * Clean content by removing/replacing problematic Unicode characters.
 * @param {Buffer|string} content - Content to clean
 * @param {string} [mappingsCsv] - CSV content with character mappings
 * @returns {Array} Tuple of [cleaned_content, char_counts]
 */
function cleanContent(content, mappingsCsv = null) {
  // Process content based on type
  let textContent;
  
  if (Buffer.isBuffer(content)) {
    // Try to decode to text without removing BOM first
    try {
      textContent = content.toString('utf8');
    } catch (error) {
      // Fallback
      textContent = content.toString('latin1');
    }
  } else {
    textContent = content;
  }
  
  // Load character mappings
  if (!mappingsCsv) {
    mappingsCsv = getDefaultMappingsCsv();
  }
  
  const problematicChars = parseMappingCsv(mappingsCsv);
  
  // Use the full content for character mapping processing
  let cleanedContent = textContent;
  
  // Count and replace problematic characters
  const charCounts = {};
  
  for (const { char, name, replacement } of problematicChars) {
    // Use a regex to count all occurrences of the character
    const regex = new RegExp(char, 'g');
    const matches = cleanedContent.match(regex);
    const count = matches ? matches.length : 0;
    
    if (count > 0) {
      charCounts[name] = count;
      cleanedContent = cleanedContent.replace(regex, replacement);
    }
  }
  
  return [cleanedContent, charCounts];
}

/**
 * Analyze content for problematic Unicode characters without changing it.
 * @param {Buffer|string} content - Content to analyze
 * @param {string} [mappingsCsv] - CSV content with character mappings
 * @returns {Object} Analysis results with detailed line and column locations
 */
function analyzeContent(content, mappingsCsv = null) {
  // Process content based on type
  let textContent;
  let hasBom = false;
  let bomType = null;
  let encoding = "string (already decoded)";
  let encodingErrors = false;
  
  if (Buffer.isBuffer(content)) {
    // Check for BOM at start
    if (content.slice(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]))) {
      hasBom = true;
      bomType = "UTF-8 BOM";
    } else if (content.slice(0, 2).equals(Buffer.from([0xFE, 0xFF]))) {
      hasBom = true;
      bomType = "UTF-16 BE BOM";
    } else if (content.slice(0, 2).equals(Buffer.from([0xFF, 0xFE]))) {
      hasBom = true;
      bomType = "UTF-16 LE BOM";
    } else if (content.slice(0, 4).equals(Buffer.from([0x00, 0x00, 0xFE, 0xFF]))) {
      hasBom = true;
      bomType = "UTF-32 BE BOM";
    } else if (content.slice(0, 4).equals(Buffer.from([0xFF, 0xFE, 0x00, 0x00]))) {
      hasBom = true;
      bomType = "UTF-32 LE BOM";
    }
    
    // Try to decode to text
    try {
      textContent = content.toString('utf8');
      encoding = "utf-8";
      encodingErrors = false;
    } catch (error) {
      // Fallback
      textContent = content.toString('latin1');
      encoding = "latin-1 (fallback)";
      encodingErrors = true;
    }
  } else {
    textContent = content;
    hasBom = textContent && textContent.includes('\uFEFF');
    bomType = hasBom ? "UTF-8 BOM" : null;
  }
  
  // Load character mappings
  if (!mappingsCsv) {
    mappingsCsv = getDefaultMappingsCsv();
  }
  
  const problematicChars = parseMappingCsv(mappingsCsv);
  
  // Analyze problematic characters
  const charCounts = {};
  const characterDetails = [];
  
  // Split content into lines for location analysis
  const lines = textContent.split('\n');
  
  for (const { char, name, replacement } of problematicChars) {
    // Skip if character is not present
    if (!textContent.includes(char)) {
      continue;
    }
    
    // Use a regex to count all occurrences of the character
    const regex = new RegExp(char, 'g');
    const matches = textContent.match(regex);
    const count = matches ? matches.length : 0;
    
    charCounts[name] = count;
    
    // Find all occurrences with detailed location information
    const allLocations = [];
    
    // Track absolute position in the file
    let absolutePos = 0;
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      
      // Process each character in the line
      for (let colIdx = 0; colIdx < line.length; colIdx++) {
        if (line[colIdx] === char) {
          // Calculate context (15 chars before and after)
          const contextStart = Math.max(0, colIdx - 15);
          const contextEnd = Math.min(line.length, colIdx + 15);
          const context = line.substring(contextStart, contextEnd).replace(char, "↯");
          
          const locationInfo = {
            line: lineIdx + 1,  // 1-based line number
            column: colIdx + 1,  // 1-based column number
            absolute_position: absolutePos,
            context: context
          };
          allLocations.push(locationInfo);
        }
        
        absolutePos++;
      }
      
      // Account for newline character in absolute position
      absolutePos++;
    }
    
    // Limit sample locations to first 10 for display
    const sampleLocations = allLocations.slice(0, 10);
    
    characterDetails.push({
      character: char,
      unicode: `U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
      name: name,
      replacement: replacement,
      count: count,
      sample_locations: sampleLocations,
      all_locations: allLocations  // Include all locations for potential use
    });
  }
  
  // Compile results
  const results = {
    has_bom: hasBom,
    bom_type: bomType,
    encoding: encoding,
    encoding_errors: encodingErrors,
    total_length: textContent.length,
    line_count: lines.length,
    problematic_char_count: Object.values(charCounts).reduce((sum, count) => sum + count, 0),
    character_counts: charCounts,
    character_details: characterDetails
  };
  
  return results;
}

/**
 * Analyze a file for problematic Unicode characters.
 * @param {string} filePath - Path to the file to analyze
 * @param {string} [mappingFile] - Path to character mappings file
 * @param {boolean} [verbose=true] - Whether to print status messages
 * @returns {Object} Analysis results with detailed line and column locations
 */
function analyzeFile(filePath, mappingFile = null, verbose = true) {
  if (verbose) {
    console.log(`Analyzing file: ${filePath}`);
  }
  
  try {
    // Use default mapping file if none provided
    if (!mappingFile) {
      const scriptDir = path.dirname(process.argv[1] || '.');
      mappingFile = path.join(scriptDir, 'uneff_mappings.csv');
    }
    
    // Ensure mapping file exists (this will create it if it doesn't)
    readCharMappings(mappingFile, verbose);
    
    // Now it's safe to read the file
    const mappingsCsv = fs.readFileSync(mappingFile, 'utf8');
    
    // Read the file content as binary
    const binaryContent = fs.readFileSync(filePath);
    
    // Analyze the content
    const results = analyzeContent(binaryContent, mappingsCsv);
    
    // Add file info
    results.file_path = filePath;
    results.file_size = fs.statSync(filePath).size;
    
    // Print results if verbose
    if (verbose) {
      console.log(`\nFile: ${filePath}`);
      console.log(`Size: ${results.file_size} bytes`);
      console.log(`Encoding: ${results.encoding}`);
      console.log(`Lines: ${results.line_count}`);
      
      if (results.has_bom) {
        console.log(`BOM: ${results.bom_type} detected at start`);
      }
      
      if (results.problematic_char_count > 0) {
        console.log(`\nFound ${results.problematic_char_count} problematic characters:`);
        
        for (const detail of results.character_details) {
          console.log(`\n  Character: '${detail.name}' [Unicode: ${detail.unicode}]`);
          console.log(`  Count: ${detail.count} instances`);
          
          // Print detailed location information
          console.log("  Locations (showing up to 10 instances):");
          detail.sample_locations.forEach((loc, idx) => {
            console.log(`    #${idx + 1}: Line ${loc.line}, Column ${loc.column} (Pos: ${loc.absolute_position})`);
            console.log(`        Context: ...${loc.context}...`);
          });
          
          if (detail.count > 10) {
            console.log(`    ... and ${detail.count - 10} more instances`);
          }
        }
      } else {
        console.log("\nNo problematic characters found.");
      }
    }
    
    return results;
    
  } catch (error) {
    if (verbose) {
      console.error(`Error analyzing file: ${error.message}`);
    }
    return { error: error.message };
  }
}

/**
 * Clean a text string by removing problematic characters.
 * @param {string} text - Text to clean
 * @param {string} [mappingFile] - Path to character mappings file
 * @param {boolean} [verbose=false] - Whether to print status messages
 * @returns {string} - Cleaned text
 */
function cleanText(text, mappingFile = null, verbose = false) {
  try {
    // Use default mapping file if none provided
    if (!mappingFile) {
      const scriptDir = path.dirname(process.argv[1] || '.');
      mappingFile = path.join(scriptDir, 'uneff_mappings.csv');
    }
    
    // Ensure mapping file exists (this will create it if it doesn't)
    readCharMappings(mappingFile, verbose);
    
    // Now it's safe to read the file
    const mappingsCsv = fs.readFileSync(mappingFile, 'utf8');
    
    // Clean the content
    const [cleanedText, charCounts] = cleanContent(text, mappingsCsv);
    
    // Log results
    if (verbose && Object.keys(charCounts).length > 0) {
      console.log('Problematic characters found and processed:');
      for (const [name, count] of Object.entries(charCounts)) {
        console.log(`  - ${name}: ${count} instance(s)`);
      }
    }
    
    return cleanedText;
    
  } catch (error) {
    if (verbose) {
      console.error(`Error cleaning text: ${error.message}`);
    }
    // Return original text if there's an error
    return text;
  }
}

/**
 * Strip problematic characters from a file.
 * @param {string} filePath - Path to the file to clean
 * @param {string} [mappingFile] - Path to character mappings file
 * @param {string} [outputPath] - Path to save the cleaned file
 * @param {boolean} [verbose=true] - Whether to print status messages
 * @param {boolean} [returnContent=false] - Whether to return the cleaned content
 * @returns {boolean|string} - True if successful, false if error, or the cleaned content
 */
function cleanFile(filePath, mappingFile = null, outputPath = null, verbose = true, returnContent = false) {
  if (verbose) {
    console.log(`Processing file: ${filePath}`);
  }
  
  try {
    // Use default mapping file if none provided
    if (!mappingFile) {
      const scriptDir = path.dirname(process.argv[1] || '.');
      mappingFile = path.join(scriptDir, 'uneff_mappings.csv');
    }
    
    // Ensure mapping file exists (this will create it if it doesn't)
    readCharMappings(mappingFile, verbose);
    
    // Now it's safe to read the file
    const mappingsCsv = fs.readFileSync(mappingFile, 'utf8');
    
    // Read the file content as binary
    const binaryContent = fs.readFileSync(filePath);
    
    // Create output filename if not provided
    if (!outputPath) {
      const fileDir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      outputPath = path.join(fileDir, `uneffd_${fileName}`);
    }
    
    // Clean the content
    const [cleanedContent, charCounts] = cleanContent(binaryContent, mappingsCsv);
    
    // Write to new file without problematic characters
    fs.writeFileSync(outputPath, cleanedContent, 'utf8');
    
    // Log results
    if (verbose) {
      if (Object.keys(charCounts).length > 0) {
        console.log("\nProblematic characters found and processed:");
        for (const [name, count] of Object.entries(charCounts)) {
          console.log(`  - ${name}: ${count} instance(s)`);
        }
        console.log(`\nCleaned file saved to: ${outputPath}`);
      } else {
        console.log("No problematic characters found.");
        console.log(`Clean copy saved to: ${outputPath}`);
      }
    }
    
    // Return content if requested
    if (returnContent) {
      return cleanedContent;
    }
    return true;
    
  } catch (error) {
    if (verbose) {
      console.error(`Error processing file: ${error.message}`);
    }
    return false;
  }
}

// Main function to handle command line arguments
function main() {
  // Check if this is being run directly or imported
  if (require.main !== module) {
    return;
  }
  
  // Parse arguments
  const args = process.argv.slice(2);
  let filePath, mappingFile, outputPath;
  let verbose = true;
  let analyze = false;
  
  // Process command-line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-m' || args[i] === '--mapping') {
      mappingFile = args[i + 1];
      i++;
    } else if (args[i] === '-o' || args[i] === '--output') {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '-q' || args[i] === '--quiet') {
      verbose = false;
    } else if (args[i] === '-a' || args[i] === '--analyze') {
      analyze = true;
    } else if (!filePath) {
      filePath = args[i];
    }
  }
  
  // Check if file path is provided
  if (!filePath) {
    console.error('Error: Please provide a filename.');
    console.log('Usage: node uneff.js <filename> [-m|--mapping <mapping_file>] [-o|--output <output_file>] [-q|--quiet] [-a|--analyze]');
    return;
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File '${filePath}' not found.`);
    return;
  }
  
  // Either analyze or clean the file
  if (analyze) {
    analyzeFile(filePath, mappingFile, verbose);
  } else {
    cleanFile(filePath, mappingFile, outputPath, verbose);
  }
}

// Run the script if called directly, otherwise export functions
if (require.main === module) {
  main();
} else {
  module.exports = {
    cleanFile,
    cleanText,
    cleanContent,
    analyzeFile,
    analyzeContent,
    readCharMappings,
    createDefaultMappings,
    getDefaultMappingsCsv,
    parseMappingCsv
  };
}