"""
Catalog parser — extract status and year from catalog.md edition strings.
Used by import_catalog.py (Phase 2).
"""
import re


def parse_status(edition: str) -> str:
    ed = edition.strip().lower()
    if not ed:
        return "owned"
    if "ordered" in ed or ed.startswith("preorder"):
        return "on_order"
    return "owned"


def parse_year(edition: str) -> int | None:
    match = re.search(r"\b(19|20)\d{2}\b", edition)
    return int(match.group()) if match else None
