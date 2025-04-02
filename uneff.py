#!/usr/bin/env python3
"""
Uneff - A tool to remove BOM and problematic Unicode characters from files

This module can be used both as a command-line script and as an imported package.
"""

import sys
import os
import csv
from typing import List, Tuple, Dict, Optional, Union


def create_default_mappings(mapping_file: str) -> None:
    """
    Create a default mapping file with common problematic characters.
    
    Args:
        mapping_file (str): Path to save the mappings file
    """
    print(f"Mappings file not found at: {mapping_file}")
    print("Creating default mappings file...")
    
    # Default problematic Unicode characters
    default_mappings = [
        ["Character", "Unicode", "Name", "Remove"],
        ["�", "\\ufffd", "Replacement Character", "True"],
        ["", "\\u0000", "NULL", "True"],
        ["", "\\u001a", "Substitute", "True"],
        ["", "\\u001c", "File Separator", "True"],
        ["", "\\u001d", "Group Separator", "True"],
        ["", "\\u001e", "Record Separator", "True"],
        ["", "\\u001f", "Unit Separator", "True"],
        ["", "\\u2028", "Line Separator", "True"],
        ["", "\\u2029", "Paragraph Separator", "True"],
        ["", "\\u200b", "Zero Width Space", "True"],
        ["", "\\u200c", "Zero Width Non-Joiner", "True"],
        ["", "\\u200d", "Zero Width Joiner", "True"],
        ["", "\\u200e", "Left-to-Right Mark", "True"],
        ["", "\\u200f", "Right-to-Left Mark", "True"],
        ["", "\\u202a", "Left-to-Right Embedding", "True"],
        ["", "\\u202b", "Right-to-Left Embedding", "True"],
        ["", "\\u202c", "Pop Directional Formatting", "True"],
        ["", "\\u202d", "Left-to-Right Override", "True"],
        ["", "\\u202e", "Right-to-Left Override", "True"],
        ["⁡", "\\u2061", "Function Application", "True"],
        ["⁢", "\\u2062", "Invisible Times", "True"],
        ["⁣", "\\u2063", "Invisible Separator", "True"],
        ["⁤", "\\u2064", "Invisible Plus", "True"],
        ["", "\\u2066", "Left-to-Right Isolate", "True"],
        ["", "\\u2067", "Right-to-Left Isolate", "True"],
        ["", "\\u2068", "First Strong Isolate", "True"],
        ["", "\\u2069", "Pop Directional Isolate", "True"],
        ["﻿", "\\ufeff", "BOM (in middle of file)", "True"]
    ]
    
    # Write to file using CSV writer to handle quoting properly
    with open(mapping_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        for row in default_mappings:
            writer.writerow(row)
    
    print(f"Default mappings saved to: {mapping_file}")


def read_char_mappings(mapping_file: str, verbose: bool = True) -> List[Tuple[str, str]]:
    """
    Read character mappings from CSV file.
    Creates default file if it doesn't exist.
    
    Args:
        mapping_file (str): Path to the mappings file
        verbose (bool): Whether to print status messages
        
    Returns:
        list: List of tuples with (char, name) for chars to remove
    """
    try:
        # Create default file if it doesn't exist
        if not os.path.exists(mapping_file):
            if verbose:
                create_default_mappings(mapping_file)
            else:
                # Create silently if not verbose
                with open(mapping_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
                    writer.writerow(["Character", "Unicode", "Name", "Remove"])
                    writer.writerow(["�", "\\ufffd", "Replacement Character", "True"])
                    writer.writerow(["﻿", "\\ufeff", "BOM (in middle of file)", "True"])
        
        # Read and parse the mappings file
        mappings = []
        with open(mapping_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # Skip header row
            
            for row in reader:
                if len(row) < 4:
                    continue
                    
                # Get values from fields
                unicode_str = row[1].strip()
                name = row[2].strip()
                remove = row[3].strip().lower() == 'true'
                
                # Only add to mappings if set to remove
                if remove:
                    # Convert unicode escape sequence to the actual character
                    try:
                        # Handle the unicode escape sequence
                        char = bytes(unicode_str, 'utf-8').decode('unicode_escape')
                        mappings.append((char, name))
                    except Exception as e:
                        if verbose:
                            print(f"Warning: Error parsing unicode sequence: {unicode_str}")
                        continue
        
        if verbose:
            print(f"Loaded {len(mappings)} problematic character mappings from: {mapping_file}")
        return mappings
        
    except Exception as e:
        if verbose:
            print(f"Error reading mappings file: {str(e)}")
            print("Using default mappings instead.")
        
        # Return minimal default mappings if there's an error
        return [
            ('\ufffd', 'Replacement Character'),
            ('\ufeff', 'BOM (in middle of file)')
        ]


def clean_file(file_path: str, mapping_file: Optional[str] = None, 
              output_path: Optional[str] = None, verbose: bool = True,
              return_content: bool = False) -> Union[bool, str]:
    """
    Remove BOM and other problematic Unicode characters from a file.
    
    Args:
        file_path (str): Path to the file to clean
        mapping_file (str, optional): Path to character mappings file. If None, uses default.
        output_path (str, optional): Path to save cleaned file. If None, adds 'uneffd_' prefix.
        verbose (bool): Whether to print status messages
        return_content (bool): Whether to return the cleaned content as string
        
    Returns:
        bool or str: True if successful, False if error, or the cleaned content if return_content=True
    """
    if verbose:
        print(f"Processing file: {file_path}")
    
    try:
        # Use default mapping file if none provided
        if mapping_file is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            mapping_file = os.path.join(script_dir, 'uneff_mappings.csv')
        
        # Read problematic character mappings
        problematic_chars = read_char_mappings(mapping_file, verbose)
        
        # Read the file content as binary first
        with open(file_path, 'rb') as file:
            binary_content = file.read()
        
        # Create output filename if not provided
        if output_path is None:
            file_name, file_ext = os.path.splitext(file_path)
            output_path = f"uneffd_{file_name}{file_ext}"
        
        # Check and remove BOM if present at start
        changes_found = False
        if binary_content.startswith(b'\xef\xbb\xbf'):  # UTF-8 BOM
            if verbose:
                print("UTF-8 BOM character detected at start. Removing...")
            binary_content = binary_content[3:]
            changes_found = True
        elif binary_content.startswith(b'\xfe\xff') or binary_content.startswith(b'\xff\xfe'):  # UTF-16 BOM
            if verbose:
                print("UTF-16 BOM character detected at start. Removing...")
            if binary_content.startswith(b'\xfe\xff'):
                binary_content = binary_content[2:]
            else:
                binary_content = binary_content[2:]
            changes_found = True
        elif binary_content.startswith(b'\x00\x00\xfe\xff') or binary_content.startswith(b'\xff\xfe\x00\x00'):  # UTF-32 BOM
            if verbose:
                print("UTF-32 BOM character detected at start. Removing...")
            if binary_content.startswith(b'\x00\x00\xfe\xff'):
                binary_content = binary_content[4:]
            else:
                binary_content = binary_content[4:]
            changes_found = True
        elif verbose:
            print("No BOM character detected at start.")
        
        # Try to decode to text, handling errors
        try:
            text_content = binary_content.decode('utf-8')
        except UnicodeDecodeError:
            # If UTF-8 fails, try other common encodings
            try:
                text_content = binary_content.decode('utf-8', errors='replace')
                if verbose:
                    print("Warning: Used replacement characters during decoding. File might have encoding issues.")
            except:
                # Last resort
                text_content = binary_content.decode('latin-1')
                if verbose:
                    print("Warning: Forced Latin-1 decoding. Character representation may be incorrect.")
        
        # Count and remove problematic characters
        char_counts = {}
        cleaned_content = text_content
        
        for char, name in problematic_chars:
            count = cleaned_content.count(char)
            if count > 0:
                char_counts[name] = count
                cleaned_content = cleaned_content.replace(char, '')
                changes_found = True
        
        # Write to new file without problematic characters
        with open(output_path, 'w', encoding='utf-8') as file:
            file.write(cleaned_content)
        
        # Log results with more detailed information
        if verbose:
            if changes_found:
                print("\nProblematic characters found and removed:")
                for name, count in char_counts.items():
                    print(f"  - {name}: {count} instance(s)")
                
                # Find locations of problematic characters for more detailed reporting
                print("\nCharacter locations (showing up to 10 instances per character):")
                lines = text_content.split('\n')
                for char, name in problematic_chars:
                    if char in text_content:
                        count = 0
                        print(f"\n  Character: '{name}' [Unicode: {hex(ord(char))}]")
                        for line_num, line in enumerate(lines, 1):
                            if char in line:
                                positions = [pos for pos, c in enumerate(line, 1) if c == char]
                                for pos in positions:
                                    count += 1
                                    if count <= 10:  # Limit to 10 examples per character
                                        context_start = max(0, pos - 15)
                                        context_end = min(len(line), pos + 15)
                                        context = line[context_start:context_end].replace(char, "↯")  # Replace with visible symbol
                                        print(f"    Line {line_num}, Position {pos}: ...{context}...")
                                    elif count == 11:
                                        print(f"    ... and {text_content.count(char) - 10} more instances")
                                        break
                            if count > 10:
                                break
                
                print(f"\nCleaned file saved to: {output_path}")
            else:
                print("No problematic characters found.")
                print(f"Clean copy saved to: {output_path}")
        
        # Return content if requested
        if return_content:
            return cleaned_content
        return True
    
    except Exception as e:
        if verbose:
            print(f"Error processing file: {str(e)}")
        return False


def clean_text(text: str, mapping_file: Optional[str] = None, 
              verbose: bool = False) -> str:
    """
    Remove problematic Unicode characters from a text string.
    
    Args:
        text (str): Text string to clean
        mapping_file (str, optional): Path to character mappings file
        verbose (bool): Whether to print status messages
        
    Returns:
        str: Cleaned text
    """
    try:
        # Use default mapping file if none provided
        if mapping_file is None:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            mapping_file = os.path.join(script_dir, 'uneff_mappings.csv')
        
        # Read problematic character mappings
        problematic_chars = read_char_mappings(mapping_file, verbose)
        
        # Check and remove BOM if present at start
        cleaned_text = text
        if text and ord(text[0]) == 0xFEFF:
            if verbose:
                print("BOM character detected at start. Removing...")
            cleaned_text = text[1:]
        
        # Count and remove problematic characters
        char_counts = {}
        
        for char, name in problematic_chars:
            count = cleaned_text.count(char)
            if count > 0:
                char_counts[name] = count
                cleaned_text = cleaned_text.replace(char, '')
        
        # Log results
        if verbose and char_counts:
            print("Problematic characters found and removed:")
            for name, count in char_counts.items():
                print(f"  - {name}: {count} instance(s)")
        
        return cleaned_text
    
    except Exception as e:
        if verbose:
            print(f"Error cleaning text: {str(e)}")
        # Return original text if there's an error
        return text


def main():
    """
    Main function to handle command line arguments and call clean_file function.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Remove BOM and problematic Unicode characters from files.')
    parser.add_argument('file', help='Path to the file to clean')
    parser.add_argument('-m', '--mapping', help='Path to custom character mappings file')
    parser.add_argument('-o', '--output', help='Path to save the cleaned file (default: adds uneffd_ prefix)')
    parser.add_argument('-q', '--quiet', action='store_true', help='Suppress status messages')
    
    args = parser.parse_args()
    
    file_path = args.file
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return 1
    
    clean_file(
        file_path=file_path, 
        mapping_file=args.mapping,
        output_path=args.output,
        verbose=not args.quiet
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())