# Uneff

A versatile tool to remove BOM (Byte Order Mark) and problematic Unicode characters from text files.

## Overview

Uneff is designed to clean text files by removing BOM markers and other invisible Unicode characters that can cause issues when processing data files. It's especially useful for:

- Cleaning CSV files before data processing
- Fixing encoding issues in text files
- Removing invisible control characters that break parsers
- Normalizing text data from various sources

## Features

- Removes UTF-8, UTF-16, and UTF-32 BOM markers
- Handles invisible and problematic Unicode characters
- Configurable via a simple CSV file - no code changes needed
- Can be used as a command-line tool or as a library in your projects
- Available in both Python and JavaScript versions
- Preserves original files by creating clean copies
- Detailed reporting of changes made

## Installation

### Python Version

1. Download `uneff.py` to your project directory
2. Make it executable (optional, for Unix-like systems):
   ```
   chmod +x uneff.py
   ```

### JavaScript Version

1. Download `uneff.js` to your project directory
2. Ensure you have Node.js installed

## Usage

### Command Line

#### Python Version

```bash
python uneff.py myfile.csv
```

Options:
```
python uneff.py myfile.csv [--mapping mappings.csv] [--output output.csv] [--quiet]
```

#### JavaScript Version

```bash
node uneff.js myfile.csv
```

Options:
```
node uneff.js myfile.csv [-m|--mapping mappings.csv] [-o|--output output.csv] [-q|--quiet]
```

### In Your Code

#### Python Version

```python
import uneff

# Clean a file
uneff.clean_file('myfile.csv')

# Clean text directly without file I/O
dirty_text = '﻿Hello�World with invisible\u200bspaces'
clean_text = uneff.clean_text(dirty_text)

# Use with custom options
uneff.clean_file(
    file_path='myfile.csv',
    mapping_file='custom_mappings.csv',
    output_path='cleaned.csv',
    verbose=False
)
```

#### JavaScript Version

```javascript
const uneff = require('./uneff');

// Clean a file
uneff.cleanFile('myfile.csv');

// Clean text directly without file I/O
const dirtyText = '﻿Hello�World with invisible\u200bspaces';
const cleanText = uneff.cleanText(dirtyText);

// Use with custom options
uneff.cleanFile(
    'myfile.csv',
    'custom_mappings.csv',
    'cleaned.csv',
    false  // verbose mode off
);
```

## Configuring Problematic Characters

On first run, Uneff creates a default `uneff_mappings.csv` file with common problematic characters. You can edit this file to customize which characters are removed:

| Character | Unicode  | Name                     | Remove |
|-----------|----------|--------------------------|--------|
| �         | \ufffd   | Replacement Character    | True   |
| [empty]   | \u0000   | NULL                     | True   |
| [empty]   | \u200b   | Zero Width Space         | True   |
| ﻿          | \ufeff    | BOM (in middle of file)   | True   |
| ...       | ...      | ...                      | ...    |

- To stop removing a specific character, change `True` to `False`
- To add new characters, add a new row with the appropriate Unicode escape sequence

## What Characters are Removed?

By default, Uneff removes these types of characters:

- BOM (Byte Order Mark) characters
- Replacement Character (�)
- Control characters (NULL, SUB, FS, GS, RS, US)
- Zero-width spaces and joiners
- Bidirectional text control characters
- Line and paragraph separators
- Other invisible formatting characters

## Why Remove These Characters?

### Common Problems Caused by Invisible Characters

1. **Parser Failures**: Many data processing systems and parsers fail when encountering unexpected Unicode characters
2. **Data Processing Errors**: Characters like zero-width spaces break tokenization, field detection, and data extraction
3. **Database Import Issues**: ETL processes often reject data with control characters
4. **Inconsistent Behavior**: The same file might work in one system but fail in another
5. **Hard-to-Debug Problems**: Since these characters are invisible, problems they cause can be extremely difficult to diagnose

### Specific Use Cases

- **CSV Processing**: BOM markers can cause the first column name to be misread
- **Data Analysis**: Invisible characters can cause misalignment in data processing
- **API Integrations**: Data passed between systems can accumulate problematic characters
- **Text Mining**: Control characters can corrupt text analysis 

## Safe vs. Unsafe: When to Use Uneff

### When It's Safe to Remove These Characters

- **Data Processing Pipelines**: Before feeding data into analysis tools or databases
- **Plain Text Content**: Regular text documents, logs, configuration files
- **Data Exchange**: Files being transferred between different systems
- **CSV Files**: Almost always safe to remove BOM and control characters
- **Legacy Data Cleanup**: Fixing old files with encoding issues

### When to Be Cautious

- **Rich Text Documents**: Some zero-width characters have specific formatting purposes in RTF, HTML, or Word docs
- **Bidirectional Text**: Languages like Arabic or Hebrew sometimes use special Unicode control characters
- **Source Code**: Some IDEs and development tools might use BOM markers intentionally
- **XML/HTML**: These formats sometimes use control characters with specific meanings

### Potential Risks When Removing Characters

- **Text Layout Changes**: Removing bidirectional controls might affect text rendering in some languages
- **Formatting Loss**: Some invisible characters serve legitimate formatting purposes
- **Semantic Change**: In rare cases, removing zero-width joiners could change how text is displayed

## Where These Characters Are Used/Tolerated

### Commonly Used/Tolerated

- **Word Processors**: Microsoft Word, Google Docs handle these characters properly
- **Modern Web Browsers**: Most invisible characters display correctly
- **Unicode-Aware Text Editors**: VS Code, Sublime Text, etc.
- **Desktop Publishing Software**: InDesign and similar tools use these characters for fine control
- **Internationalized Applications**: Apps supporting multiple languages often use bidirectional markers

### Typically Not Tolerated

- **Database Systems**: Most databases have restrictions on control characters
- **CSV Parsers**: Many CSV processing libraries have issues with BOM and zero-width characters
- **Legacy Systems**: Older software often can't handle these Unicode characters
- **Command-Line Tools**: Many CLI tools interpret control characters in unwanted ways
- **Programming Language Parsers**: Many compilers and interpreters reject certain control characters
- **Data Analysis Tools**: R, pandas, and similar frameworks may misinterpret invisible characters

## Examples

### Cleaning a CSV with BOM

Before:
```
﻿ID,Name,Value
1,Test,100
```

After:
```
ID,Name,Value
1,Test,100
```

### Removing Zero-Width Spaces

Before (invisible spaces shown as `[ZWS]`):
```
Name[ZWS],Address[ZWS],Phone
John[ZWS] Doe,123 Main St,[ZWS]555-1234
```

After:
```
Name,Address,Phone
John Doe,123 Main St,555-1234
```

## License

MIT
