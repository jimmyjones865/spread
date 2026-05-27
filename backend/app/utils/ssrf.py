import socket
import ipaddress
from urllib.parse import urlparse

PRIVATE_NETS = [
    ipaddress.ip_network(n) for n in [
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "169.254.0.0/16",
        "::1/128",
        "fc00::/7",
        "fe80::/10",
        "::ffff:0:0/96",
    ]
]


def is_safe_url(url: str) -> tuple[bool, str]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False, "scheme"
    if not parsed.hostname:
        return False, "no_host"

    try:
        resolved = socket.getaddrinfo(parsed.hostname, None)[0][4][0]
    except socket.gaierror:
        return False, "resolve_failed"

    addr = ipaddress.ip_address(resolved)
    if addr.is_unspecified or addr.is_multicast or any(addr in net for net in PRIVATE_NETS):
        return False, "private"

    return True, resolved
