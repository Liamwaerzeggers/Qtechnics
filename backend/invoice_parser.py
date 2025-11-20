"""
Simple invoice parser for Dutch invoices using pdfplumber.
Extracts total amounts including and excluding VAT.
"""

import pdfplumber
import re
from decimal import Decimal
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)


class InvoiceParser:
    """Parse Dutch invoices and extract financial data."""
    
    # Patterns for Dutch invoices
    AMOUNT_PATTERN = r'€?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})'
    
    def __init__(self):
        self.debug = False
    
    def parse_invoice(self, pdf_path: str) -> Dict[str, Decimal]:
        """
        Parse invoice PDF and extract amounts.
        
        Returns:
            Dict with 'total_excl_vat', 'total_incl_vat', 'vat_amount'
        """
        try:
            with pdfplumber.open(pdf_path) as pdf:
                # Extract text from all pages
                full_text = ""
                for page in pdf.pages:
                    full_text += page.extract_text() + "\n"
                
                if self.debug:
                    logger.info(f"Extracted text: {full_text[:500]}...")
                
                # Extract amounts
                amounts = self._extract_amounts(full_text)
                
                return amounts
                
        except Exception as e:
            logger.error(f"Error parsing invoice: {str(e)}")
            raise
    
    def _extract_amounts(self, text: str) -> Dict[str, Decimal]:
        """Extract financial amounts from invoice text."""
        amounts = {
            'total_excl_vat': Decimal('0'),
            'total_incl_vat': Decimal('0'),
            'vat_amount': Decimal('0')
        }
        
        # Search for total including VAT (various Dutch terms)
        incl_patterns = [
            r'(?:totaal|total)\s+(?:incl(?:usief)?|met)\s+(?:btw|vat)[:\s]*' + self.AMOUNT_PATTERN,
            r'(?:te\s+betalen|te betalen|totaal)[:\s]*' + self.AMOUNT_PATTERN,
            r'(?:totaalbedrag|totaal bedrag)[:\s]*' + self.AMOUNT_PATTERN,
        ]
        
        for pattern in incl_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amounts['total_incl_vat'] = self._parse_amount(match.group(1))
                if self.debug:
                    logger.info(f"Found total incl VAT: €{amounts['total_incl_vat']}")
                break
        
        # Search for total excluding VAT
        excl_patterns = [
            r'(?:totaal|total)\s+(?:excl(?:usief)?|zonder)\s+(?:btw|vat)[:\s]*' + self.AMOUNT_PATTERN,
            r'(?:subtotaal|sub-totaal)[:\s]*' + self.AMOUNT_PATTERN,
            r'(?:netto|netto bedrag)[:\s]*' + self.AMOUNT_PATTERN,
        ]
        
        for pattern in excl_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amounts['total_excl_vat'] = self._parse_amount(match.group(1))
                if self.debug:
                    logger.info(f"Found total excl VAT: €{amounts['total_excl_vat']}")
                break
        
        # Search for VAT amount
        vat_patterns = [
            r'(?:btw|vat)\s*(?:bedrag)?[:\s]*' + self.AMOUNT_PATTERN,
            r'(?:belasting|tax)[:\s]*' + self.AMOUNT_PATTERN,
        ]
        
        for pattern in vat_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amounts['vat_amount'] = self._parse_amount(match.group(1))
                if self.debug:
                    logger.info(f"Found VAT amount: €{amounts['vat_amount']}")
                break
        
        # Calculate missing values if we have two out of three
        if amounts['total_excl_vat'] > 0 and amounts['vat_amount'] > 0 and amounts['total_incl_vat'] == 0:
            amounts['total_incl_vat'] = amounts['total_excl_vat'] + amounts['vat_amount']
        elif amounts['total_incl_vat'] > 0 and amounts['vat_amount'] > 0 and amounts['total_excl_vat'] == 0:
            amounts['total_excl_vat'] = amounts['total_incl_vat'] - amounts['vat_amount']
        elif amounts['total_incl_vat'] > 0 and amounts['total_excl_vat'] > 0 and amounts['vat_amount'] == 0:
            amounts['vat_amount'] = amounts['total_incl_vat'] - amounts['total_excl_vat']
        
        # If we only found total incl VAT, try to find it at the end of document
        if amounts['total_incl_vat'] == 0:
            # Last resort: find largest number that looks like a total
            all_amounts = re.findall(self.AMOUNT_PATTERN, text)
            if all_amounts:
                parsed_amounts = [self._parse_amount(a) for a in all_amounts]
                # Take the largest amount as likely total
                amounts['total_incl_vat'] = max(parsed_amounts)
                if self.debug:
                    logger.info(f"Using largest amount as total: €{amounts['total_incl_vat']}")
        
        return amounts
    
    def _parse_amount(self, amount_str: str) -> Decimal:
        """
        Parse Dutch number format to Decimal.
        Dutch: 1.234,56 (dot=thousands, comma=decimal)
        """
        # Remove currency symbols and whitespace
        cleaned = re.sub(r'[€$\s]', '', amount_str)
        
        # Handle Dutch formatting
        if ',' in cleaned and '.' in cleaned:
            # Has both separators
            last_comma = cleaned.rfind(',')
            last_dot = cleaned.rfind('.')
            
            if last_comma > last_dot:
                # Dutch format: 1.234,56
                cleaned = cleaned.replace('.', '').replace(',', '.')
            else:
                # English format: 1,234.56
                cleaned = cleaned.replace(',', '')
        elif ',' in cleaned:
            # Only comma - check position
            comma_pos = cleaned.rfind(',')
            if len(cleaned) - comma_pos == 3:  # x,xx format
                cleaned = cleaned.replace(',', '.')
            else:
                # Likely thousands separator, remove it
                cleaned = cleaned.replace(',', '')
        elif '.' in cleaned:
            # Only dot - check if decimal or thousands
            dot_pos = cleaned.rfind('.')
            if len(cleaned) - dot_pos == 3:  # x.xx format
                # Could be decimal, keep it
                pass
            # Otherwise assume it's already correct
        
        try:
            return Decimal(cleaned)
        except:
            logger.warning(f"Could not parse amount: {amount_str}")
            return Decimal('0')
