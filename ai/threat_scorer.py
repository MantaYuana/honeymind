# In-memory store for session scores
# NOTE: should use Redis/DB in prod
session_scores = {}

# heuristic weights
THREAT_WEIGHTS = {
    'ls': 1,
    'pwd': 1,
    'whoami': 1,
    'ping': 2,
    'cat': 5,
    'wget': 10,
    'curl': 10,
    'chmod': 8,
    'rm': 8,
    'nc': 15,
    'nmap': 15,
    'ssh': 5
}

def calculate_score(session_id: str, command: str) -> int:
    if session_id not in session_scores:
        session_scores[session_id] = 0
        
    cmd_base = command.strip().split(' ')[0] if command else ''
    
    score_increment = THREAT_WEIGHTS.get(cmd_base, 2) # default 2 for unknown
    
    session_scores[session_id] += score_increment
    
    return session_scores[session_id]
