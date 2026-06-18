import re
from datetime import datetime, timezone

_URL_RE = re.compile(r"https?://[^\s'\"]+")

def build_ioc(session_id: str, ip_address: str, commands: list) -> dict:
    cmd_strings = [c["command"] for c in commands]
    urls = []
    for c in cmd_strings:
        urls.extend(_URL_RE.findall(c))
    return {
        "type": "honeymind.ioc",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "source_ip": ip_address,
        "confidence": "high",
        "indicators": {
            "source_ip": ip_address,
            "urls": sorted(set(urls)),
            "commands": cmd_strings,
        },
        "suggested_block_rule": f"iptables -A INPUT -s {ip_address} -j DROP",
    }
