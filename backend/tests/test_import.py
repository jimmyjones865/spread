import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scripts.catalog_parser import parse_status, parse_year


# ── Status detection ──────────────────────────────────────────────────────────

def test_status_plain_owned():
    assert parse_status("1st 2023") == "owned"

def test_status_empty_owned():
    assert parse_status("") == "owned"

def test_status_ordered():
    assert parse_status("ordered") == "on_order"

def test_status_ordered_with_publisher():
    assert parse_status("ordered Debatable Publishing") == "on_order"

def test_status_preorder():
    assert parse_status("preorder 2026") == "on_order"

def test_status_bare_year_owned():
    assert parse_status("2006") == "owned"

def test_status_signed_numbered_owned():
    assert parse_status("1st (500) 2025 signed numbered 83") == "owned"


# ── Year extraction ───────────────────────────────────────────────────────────

def test_year_present():
    assert parse_year("1st 2023 signed") == 2023

def test_year_preorder():
    assert parse_year("preorder 2026") == 2026

def test_year_bare():
    assert parse_year("2006") == 2006

def test_year_absent():
    assert parse_year("1st signed") is None

def test_year_absent_ordered():
    assert parse_year("ordered") is None

def test_year_edition_number_not_matched():
    # "500" in "(500)" should not be matched — not a valid year
    assert parse_year("1st (500) signed") is None
