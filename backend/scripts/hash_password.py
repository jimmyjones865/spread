#!/usr/bin/env python3
"""
Generate a bcrypt hash for the admin password.

Usage:
    python scripts/hash_password.py

Copy the output into .env as ADMIN_PASSWORD_HASH=<hash>
To reset a forgotten password: run again, update .env, docker compose restart.
"""
import getpass
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

password = getpass.getpass("Password: ")
confirm = getpass.getpass("Confirm: ")

if password != confirm:
    print("Passwords do not match.")
    raise SystemExit(1)

if len(password) < 8:
    print("Password must be at least 8 characters.")
    raise SystemExit(1)

print(pwd_context.hash(password))
