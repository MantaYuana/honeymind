# Per-command danger weights (heuristic). Cumulative session score now lives in Postgres.
THREAT_WEIGHTS = {
    'ls': 1, 'pwd': 1, 'whoami': 1, 'ping': 2,
    'cat': 5, 'wget': 10, 'curl': 10, 'chmod': 8,
    'rm': 8, 'nc': 15, 'nmap': 15, 'ssh': 5,
}

def command_weight(command: str) -> int:
    """Return the danger weight for a single command. 0 if empty, 2 if unknown."""
    if not command or not command.strip():
        return 0
    cmd_base = command.strip().split(' ')[0]
    return THREAT_WEIGHTS.get(cmd_base, 2)
