#!/usr/bin/env bash
# Expanded, DIVERSE own-LAN capture to fix the fine-tuned model's weak spots (benign_curl FA,
# siege-DoS). Rebuilds lab2 (atk netns + vetgt in root netns; targets = root nginx:80 + a
# disposable PASSWORD-auth sshd on :2222 so hydra can actually brute force). Many benign patterns
# incl multi-user >=12 flows/src, and DoS/DDoS variety incl high-concurrency siege. Own-LAN only.
set -uo pipefail
VET=vetgt; TGT=10.200.0.2
PCAP=/tmp/exp; REPO=/home/vboxuser/Project_ict
PY=$REPO/.venv/bin/python; REC=$REPO/backend/sensors/flow_recorder.py
sudo_rm(){ rm -rf "$@" 2>/dev/null; }

echo "== rebuild lab2 (atk netns + vetgt in root) =="
ip netns del atk 2>/dev/null; ip link del vetgt 2>/dev/null; sleep 1
ip netns add atk
ip link add veatk type veth peer name vetgt
ip link set veatk netns atk
ip netns exec atk ip addr add 10.200.0.1/24 dev veatk
ip netns exec atk ip link set veatk up; ip netns exec atk ip link set lo up
for i in $(seq 11 20); do ip netns exec atk ip addr add 10.200.0.$i/24 dev veatk; done
ip addr add 10.200.0.2/24 dev vetgt 2>/dev/null; ip link set vetgt up
sleep 1
ip netns exec atk curl -s -m3 -o /dev/null -w "http %{http_code}\n" http://$TGT/ || echo "http FAIL"

echo "== disposable password-auth sshd on :2222 (for real hydra brute force) =="
mkdir -p /tmp/sshd
[ -f /tmp/sshd/hk ] || ssh-keygen -q -t ed25519 -f /tmp/sshd/hk -N ""
cat > /tmp/sshd/cfg <<CFG
Port 2222
ListenAddress 10.200.0.2
HostKey /tmp/sshd/hk
PidFile /tmp/sshd/pid
UsePAM yes
PasswordAuthentication yes
PermitRootLogin no
LogLevel QUIET
CFG
pkill -f "sshd -f /tmp/sshd/cfg" 2>/dev/null; sleep 1
/usr/sbin/sshd -f /tmp/sshd/cfg && echo "sshd:2222 up"

rm -rf "$PCAP"; mkdir -p "$PCAP"
cap(){ # $1 name $2 label $3 attacker $4 cmd
  echo "[$(date +%H:%M:%S)] $1 ($2)"
  tcpdump -i "$VET" -s 96 -w "$PCAP/$1.pcap" 'ip and not arp' >/dev/null 2>&1 & local td=$!
  sleep 2; ip netns exec atk bash -c "$4" >/dev/null 2>&1 || true
  sleep 2; kill "$td" 2>/dev/null; sleep 1
  "$PY" "$REC" --source "$PCAP/$1.pcap" --tool "$1" --label "$2" --attacker "$3" 2>&1 | tail -1
}

# ---------- BENIGN (diverse; fixes benign-looks-like-attack) ----------
cap b_browse_slow BENIGN "" 'for n in $(seq 1 180); do curl -s -m2 http://'$TGT'/ >/dev/null; sleep 0.$((RANDOM%9)); done'
cap b_browse_paths BENIGN "" 'for n in $(seq 1 150); do curl -s -m2 "http://'$TGT'/?p=$RANDOM" >/dev/null; sleep 0.$((RANDOM%5)); done'
cap b_mixed BENIGN "" 'for n in $(seq 1 120); do curl -s -m2 -X POST -d "a=$n" http://'$TGT'/ >/dev/null; curl -s -m2 http://'$TGT'/ >/dev/null; sleep 0.1; done'
cap b_keepalive BENIGN "" 'ab -k -n 2500 -c 5 http://'$TGT'/ 2>/dev/null'
cap b_moderate BENIGN "" 'ab -n 1200 -c 4 http://'$TGT'/ 2>/dev/null'
cap b_multiuser BENIGN "" 'for ip in $(seq 11 20); do ( for n in $(seq 1 15); do curl -s -m2 --interface 10.200.0.$ip http://'$TGT'/ >/dev/null; sleep 0.$((RANDOM%4)); done ) & done; wait'
cap b_bursts BENIGN "" 'for r in 1 2 3 4 5; do for n in $(seq 1 25); do curl -s -m2 http://'$TGT'/ >/dev/null; done; sleep 1; done'

# ---------- DoS (variety; siege at HIGH concurrency so it is clearly abnormal) ----------
cap d_abflood DoS 10.200.0.1 'ab -n 6000 -c 150 http://'$TGT'/ 2>/dev/null'
cap d_slowloris DoS 10.200.0.1 'slowhttptest -c 800 -H -i 10 -r 100 -t GET -u http://'$TGT'/ -l 50 2>/dev/null'
cap d_slowbody DoS 10.200.0.1 'slowhttptest -c 800 -B -i 10 -r 100 -u http://'$TGT'/ -l 50 2>/dev/null'
cap d_siege_heavy DoS 10.200.0.1 'siege -b -c 255 -t 50S http://'$TGT'/ 2>/dev/null'
cap d_synflood DoS 10.200.0.1 'timeout 25 hping3 -S --flood -p 80 '$TGT' 2>/dev/null'

# ---------- DDoS (>=12 flows/src so windows form) ----------
cap dd_http DDoS "$(seq -s, -f 10.200.0.%g 11 20)" 'for ip in $(seq 11 20); do ( for n in $(seq 1 25); do curl -s -m2 --interface 10.200.0.$ip http://'$TGT'/ >/dev/null; done ) & done; wait'
cap dd_fast DDoS "$(seq -s, -f 10.200.0.%g 11 20)" 'for ip in $(seq 11 20); do ( ab -n 30 -c 5 http://'$TGT'/ 2>/dev/null ) & done; wait'

# ---------- BruteForce (real hydra on password-auth :2222) ----------
cap bf_hydra BruteForce 10.200.0.1 'WL=/tmp/wl.txt; { for i in $(seq 1 80); do echo pw$RANDOM$i; done; echo changeme; } > $WL; hydra -l vboxuser -P $WL -t 4 -W 1 -s 2222 ssh://'$TGT' 2>/dev/null'
cap bf_burst22 BruteForce 10.200.0.1 'for n in $(seq 1 40); do (exec 3<>/dev/tcp/'$TGT'/22; head -c 10 <&3 >/dev/null) 2>/dev/null; done'

echo "DONE"; ls "$REPO/data/captures/"{b_,d_,dd_,bf_}*_$(date +%Y%m%d)*.csv 2>/dev/null | wc -l
