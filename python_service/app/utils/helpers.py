"""
Helper utilities for the data processing service.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import re
import hashlib


def format_currency(value: float, currency: str = "INR") -> str:
    """Format a numeric value as currency."""
    symbols = {
        "INR": "₹",
        "USD": "$",
        "EUR": "€",
        "GBP": "£"
    }
    symbol = symbols.get(currency, "₹")
    return f"{symbol}{value:,.2f}"


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format a numeric value as percentage."""
    return f"{value:.{decimals}f}%"


def truncate_string(s: str, max_length: int = 50) -> str:
    """Truncate a string to max length with ellipsis."""
    if len(s) <= max_length:
        return s
    return s[:max_length - 3] + "..."


def generate_hash(data: str) -> str:
    """Generate MD5 hash for a string."""
    return hashlib.md5(data.encode()).hexdigest()


def get_week_range(date: datetime = None) -> tuple[datetime, datetime]:
    """Get start and end of the week for a given date."""
    if date is None:
        date = datetime.utcnow()
    
    # Get Monday of the week
    days_since_monday = date.weekday()
    start = date - timedelta(days=days_since_monday)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get Sunday of the week
    end = start + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    return start, end


def get_month_range(date: datetime = None) -> tuple[datetime, datetime]:
    """Get start and end of the month for a given date."""
    if date is None:
        date = datetime.utcnow()
    
    start = date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get last day of month
    if date.month == 12:
        next_month = start.replace(year=date.year + 1, month=1)
    else:
        next_month = start.replace(month=date.month + 1)
    
    end = next_month - timedelta(seconds=1)
    
    return start, end


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


def clean_dict(d: Dict[str, Any]) -> Dict[str, Any]:
    """Remove None values from a dictionary."""
    return {k: v for k, v in d.items() if v is not None}


def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """Flatten a nested dictionary."""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def parse_bool(value: Any) -> bool:
    """Parse various representations of boolean values."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', 'yes', '1', 'on')
    if isinstance(value, (int, float)):
        return value != 0
    return False


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """Split a list into chunks of specified size."""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """Merge multiple dictionaries, later values override earlier ones."""
    result = {}
    for d in dicts:
        result.update(d)
    return result


def calculate_percentage_change(old_value: float, new_value: float) -> float:
    """Calculate percentage change between two values."""
    if old_value == 0:
        return 100.0 if new_value > 0 else 0.0
    return ((new_value - old_value) / old_value) * 100


def is_valid_object_id(id_str: str) -> bool:
    """Check if string is a valid MongoDB ObjectId."""
    if not isinstance(id_str, str):
        return False
    if len(id_str) != 24:
        return False
    try:
        int(id_str, 16)
        return True
    except ValueError:
        return False


def format_timedelta(td: timedelta) -> str:
    """Format a timedelta as a human-readable string."""
    total_seconds = int(td.total_seconds())
    
    if total_seconds < 60:
        return f"{total_seconds}s"
    elif total_seconds < 3600:
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes}m {seconds}s"
    else:
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours}h {minutes}m"
