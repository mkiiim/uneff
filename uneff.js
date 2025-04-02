// Uneff - A tool to remove BOM and problematic Unicode characters from files
const fs = require('fs');
const path = require('path');

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
  
  // Default problematic Unicode characters
  const defaultMappings = [
    ['Character', 'Unicode', 'Name', 'Remove'],
    ['\ufffd', '\\ufffd', 'Replacement Character', 'true'],
    ['\u0000', '\\u0000', 'NULL', 'true'],
    ['\u001a', '\\u001a', 'Substitute', 'true'],
    ['\u001c', '\\u001c', 'File Separator', 'true'],
    ['\u001d', '\\u001d', 'Group Separator', 'true'],
    ['\u001e', '\\u001e', 'Record Separator', 'true'],
    ['\u001f', '\\u001f', 'Unit Separator', 'true'],
    ['\u2028', '\\u2028', 'Line Separator', 'true'],
    ['\u2029', '\\u2029', 'Paragraph Separator', 'true'],
    ['\u200b', '\\u200b', 'Zero Width Space', 'true'],
    ['\u200c', '\\u200c', 'Zero Width Non-Joiner', 'true'],
    ['\u200d', '\\u200d', 'Zero Width Joiner', 'true'],
    ['\u200e', '\\u200e', 'Left-to-Right Mark', 'true'],
    ['\u200f', '\\u200f', 'Right-to-Left Mark', 'true'],
    ['\u202a', '\\u202a', 'Left-to-Right Embedding', 'true'],
    ['\u202b', '\\u202b', 'Right-to-Left Embedding', 'true'],
    ['\u202c', '\\u202c', 'Pop Directional Formatting', 'true'],
    ['\u202d', '\\u202d', 'Left-to-Right Override', 'true'],
    ['\u202e', '\\u202e', 'Right-to-Left Override', 'true'],
    ['\u2061', '\\u2061', 'Function Application', 'true'],
    ['\u2062', '\\u2062', 'Invisible Times', 'true'],
    ['\u2063', '\\u2063', 'Invisible Separator', 'true'],
    ['\u2064', '\\u2064', 'Invisible Plus', 'true'],
    ['\u2066', '\\u2066', 'Left-to-Right Isolate', 'true'],
    ['\u2067', '\\u2067', 'Right-to-Left Isolate', 'true'],
    ['\u2068', '\\u2068', 'First Strong Isolate', 'true'],
    ['\u2069', '\\u2069', 'Pop Directional Isolate', 'true'],
    ['\ufeff', '\\ufeff', 'BOM (in middle of file)', 'true']
  ];
  
  // Convert to CSV and write to file
  const csvContent = defaultMappings.map(row => 
    row.map(cell => 
      // Quote cells with commas
      cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n');
  
  fs.writeFileSync(mappingFilePath, csvContent, 'utf8');
  if (verbose) {
    console.log(`Default mappings saved to: ${mappingFilePath}`);
  }
}

/**
 * Read problematic character mappings from a CSV file.
 * @param {string} mappingFilePath - Path to the mappings file
 * @param {boolean} verbose - Whether to print status messages
 * @returns {Array<Object>} - Array of objects with char and name properties
 */
function readCharMappings(mappingFilePath, verbose = true) {
  try {
    // Check if mapping file exists, if not, create with defaults
    if (!fs.existsSync(mappingFilePath)) {
      createDefaultMappings(mappingFilePath, verbose);
    }
    
    // Read and parse the mappings file
    const mappingData = fs.readFileSync(mappingFilePath, 'utf8');
    const rows = mappingData.split('\n');
    
    // Skip header row, parse each mapping
    const mappings = [];
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
      const unicodeStr = fields[1].trim();
      const name = fields[2].trim();
      const remove = fields[3].trim().toLowerCase() === 'true';
      
      // Only add to mappings if set to remove
      if (remove) {
        // Convert unicode escape sequence to the actual character
        // For the JavaScript version, we can evaluate unicode directly:
        let char;
        try {
          char = eval(`"${unicodeStr}"`);
        } catch (e) {
          if (verbose) {
            console.warn(`Error parsing unicode sequence: ${unicodeStr}`);
          }
          continue;
        }
        
        mappings.push({ char, name });
      }
    }
    
    if (verbose) {
      console.log(`Loaded ${mappings.length} problematic character mappings from: ${mappingFilePath}`);
    }
    return mappings;
    
  } catch (error) {
    if (verbose) {
      console.error(`Error reading mappings file: ${error.message}`);
      console.log('Using default mappings instead.');
    }
    
    // Return default mappings if there's an error
    return [
      { char: '\ufffd', name: 'Replacement Character' },
      { char: '\ufeff', name: 'BOM (in middle of file)' }
    ];
  }
}

/**
 * Strip problematic characters from a file.
 * @param {string} filePath - Path to the file to clean
 * @param {string} [mappingFilePath] - Path to character mappings file
 * @param {string} [outputPath] - Path to save the cleaned file
 * @param {boolean} [verbose=true] - Whether to print status messages
 * @param {boolean} [returnContent=false] - Whether to return the cleaned content
 * @returns {boolean|string} - True if successful, false if error, or the cleaned content
 */
function cleanFile(filePath, mappingFilePath, outputPath, verbose = true, returnContent = false) {
  if (verbose) {
    console.log(`Processing file: ${filePath}`);
  }
  
  try {
    // Handle default mapping file path
    if (!mappingFilePath) {
      // Determine script directory
      const scriptDir = path.dirname(process.argv[1] || '.');
      mappingFilePath = path.join(scriptDir, 'uneff_mappings.csv');
    }
    
    // Read the character mappings
    const problematicChars = readCharMappings(mappingFilePath, verbose);
    
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Create output filename if not provided
    if (!outputPath) {
      const fileExt = filePath.lastIndexOf('.');
      outputPath = fileExt !== -1 
        ? filePath.substring(0, fileExt) + '_clean' + filePath.substring(fileExt) 
        : filePath + '_clean';
    }
    
    // Check if file has BOM character (FEFF) at the start
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    let modifiedContent = content;
    let changesFound = false;
    
    if (hasBOM) {
      if (verbose) {
        console.log('BOM character detected at start of file. Removing...');
      }
      // Remove BOM character
      modifiedContent = modifiedContent.slice(1);
      changesFound = true;
    } else if (verbose) {
      console.log('No BOM character detected at start of file.');
    }
    
    // Count and remove problematic characters
    let charCount = {};
    
    for (const { char, name } of problematicChars) {
      const regex = new RegExp(char, 'g');
      const count = (modifiedContent.match(regex) || []).length;
      
      if (count > 0) {
        charCount[name] = count;
        modifiedContent = modifiedContent.replace(regex, '');
        changesFound = true;
      }
    }
    
    // Write to new file without problematic characters
    fs.writeFileSync(outputPath, modifiedContent, 'utf8');
    
    // Log results with more detailed information
    if (verbose) {
      if (changesFound) {
        console.log('\nProblematic characters found and removed:');
        for (const [name, count] of Object.entries(charCount)) {
          console.log(`  - ${name}: ${count} instance(s)`);
        }
        
        // Find locations of problematic characters for more detailed reporting
        console.log('\nCharacter locations (showing up to 10 instances per character):');
        const lines = content.split('\n');
        
        for (const { char, name } of problematicChars) {
          if (content.includes(char)) {
            console.log(`\n  Character: '${name}' [Unicode: ${char.codePointAt(0).toString(16)}]`);
            let count = 0;
            
            for (let lineNum = 0; lineNum < lines.length; lineNum++) {
              const line = lines[lineNum];
              if (line.includes(char)) {
                // Find all positions of the character in this line
                let pos = line.indexOf(char);
                while (pos !== -1) {
                  count++;
                  if (count <= 10) { // Limit to 10 examples per character
                    const contextStart = Math.max(0, pos - 15);
                    const contextEnd = Math.min(line.length, pos + 15);
                    // Replace with visible symbol for display
                    const context = line.substring(contextStart, contextEnd).replace(char, '↯');
                    console.log(`    Line ${lineNum + 1}, Position ${pos + 1}: ...${context}...`);
                  } else if (count === 11) {
                    console.log(`    ... and ${(modifiedContent.match(new RegExp(char, 'g')) || []).length - 10} more instances`);
                    break;
                  }
                  pos = line.indexOf(char, pos + 1);
                }
              }
              if (count > 10) break;
            }
          }
        }
        
        console.log(`\nCleaned file saved to: ${outputPath}`);
      } else {
        console.log('No problematic characters found.');
        console.log(`Clean copy saved to: ${outputPath}`);
      }
    }
    
    if (returnContent) {
      return modifiedContent;
    }
    return true;
  } catch (error) {
    if (verbose) {
      console.error(`Error processing file: ${error.message}`);
    }
    return false;
  }
}

/**
 * Clean a text string by removing problematic characters.
 * @param {string} text - Text to clean
 * @param {string} [mappingFilePath] - Path to character mappings file
 * @param {boolean} [verbose=false] - Whether to print status messages
 * @returns {string} - Cleaned text
 */
function cleanText(text, mappingFilePath, verbose = false) {
  try {
    // Handle default mapping file path
    if (!mappingFilePath) {
      // Determine script directory
      const scriptDir = path.dirname(process.argv[1] || '.');
      mappingFilePath = path.join(scriptDir, 'uneff_mappings.csv');
    }
    
    // Read the character mappings
    const problematicChars = readCharMappings(mappingFilePath, verbose);
    
    // Check if text starts with BOM character (FEFF)
    let cleanedText = text;
    if (text && text.charCodeAt(0) === 0xFEFF) {
      if (verbose) {
        console.log('BOM character detected at start of text. Removing...');
      }
      cleanedText = text.slice(1);
    }
    
    // Count and remove problematic characters
    let charCount = {};
    
    for (const { char, name } of problematicChars) {
      const regex = new RegExp(char, 'g');
      const count = (cleanedText.match(regex) || []).length;
      
      if (count > 0) {
        charCount[name] = count;
        cleanedText = cleanedText.replace(regex, '');
      }
    }
    
    // Log results
    if (verbose && Object.keys(charCount).length > 0) {
      console.log('Problematic characters found and removed:');
      for (const [name, count] of Object.entries(charCount)) {
        console.log(`  - ${name}: ${count} instance(s)`);
      }
    }
    
    return cleanedText;
  } catch (error) {
    if (verbose) {
      console.error(`Error cleaning text: ${error.message}`);
    }
    return text; // Return original text if there's an error
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
  let filePath, mappingFilePath, outputPath, verbose = true;
  
  // Process command-line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-m' || args[i] === '--mapping') {
      mappingFilePath = args[i + 1];
      i++;
    } else if (args[i] === '-o' || args[i] === '--output') {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '-q' || args[i] === '--quiet') {
      verbose = false;
    } else if (!filePath) {
      filePath = args[i];
    }
  }
  
  // Check if file path is provided
  if (!filePath) {
    console.error('Error: Please provide a filename.');
    console.log('Usage: node uneff.js <filename> [-m|--mapping <mapping_file>] [-o|--output <output_file>] [-q|--quiet]');
    return;
  }
  
  // Clean the file
  cleanFile(filePath, mappingFilePath, outputPath, verbose);
}

// Run the script if called directly, otherwise export functions
if (require.main === module) {
  main();
} else {
  module.exports = {
    cleanFile,
    cleanText,
    readCharMappings,
    createDefaultMappings
  };
}