#!/usr/bin/env bash
# Supplementary capture targeting the fine-tuned model's residual weak spots:
#  - low-rate / spread-out benign from MANY sources (b_browse_slow/benign_browse/multiuser ~0.6)
#  - DoS concurrency gradient so the siege/ab ambiguity shrinks
# Assumes lab2 up (atk netns + vetgt in root + nginx:80). Own-LAN only.
set -uo pipefail
VET=vetgt; TGT=10.200.0.2; PCAP=/tmp/more; REPO=/home/vboxuser/Project_ict
PY=$REPO/.venv/bin/python; REC=$REPO/backend/sensors/flow_recorder.py
# ensure lab up
ip netns exec atk curl -s -m3 -o /dev/null http://$TGT/ 2>/dev/null || {
  ip netns del atk 2>/dev/null; ip link del vetgt 2>/dev/null; sleep 1
  ip netns add atk; ip link add veatk type veth peer name vetgt; ip link set veatk netns atk
  ip netns exec atk ip addr add 10.200.0.1/24 dev veatk; ip netns exec atk ip link set veatk up
  ip netns exec atk ip link set lo up
  for i in $(seq 11 30); do ip netns exec atk ip addr add 10.200.0.$i/24 dev veatk; done
  ip addr add 10.200.0.2/24 dev vetgt 2>/dev/null; ip link set vetgt up; sleep 1; }
for i in $(seq 21 30); do ip netns exec atk ip addr add 10.200.0.$i/24 dev veatk 2>/dev/null; done
rm -rf "$PCAP"; mkdir -p "$PCAP"
cap(){ echo "[$(date +%H:%M:%S)] $1 ($2)"
  tcpdump -i "$VET" -s 96 -w "$PCAP/$1.pcap" 'ip and not arp' >/dev/null 2>&1 & local td=$!
  sleep 2; ip netns exec atk bash -c "$4" >/dev/null 2>&1 || true
  sleep 2; kill "$td" 2>/dev/null; sleep 1
  "$PY" "$REC" --source "$PCAP/$1.pcap" --tool "$1" --label "$2" --attacker "$3" 2>&1 | tail -1; }

# ---- low-rate benign from 20 sources (>=12 flows/src), varied think-time ----
cap b_users20_slow BENIGN "" 'for ip in $(seq 11 30); do ( for n in $(seq 1 14); do curl -s -m2 --interface 10.200.0.$ip "http://'$TGT'/?u=$RANDOM" >/dev/null; sleep 0.$((2+RANDOM%7)); done ) & done; wait'
cap b_users20_paths BENIGN "" 'for ip in $(seq 11 30); do ( for n in $(seq 1 14); do curl -s -m2 --interface 10.200.0.$ip "http://'$TGT'/page$((RANDOM%20))" >/dev/null; sleep 0.$((RANDOM%5)); done ) & done; wait'
# ---- single-user realistic browsing sessions, long think-time ----
cap b_session1 BENIGN "" 'for n in $(seq 1 60); do curl -s -m2 http://'$TGT'/ >/dev/null; sleep 0.$((3+RANDOM%6)); done'
cap b_session2 BENIGN "" 'for n in $(seq 1 60); do curl -s -m2 -X POST -d "q=$RANDOM" http://'$TGT'/ >/dev/null; sleep 0.$((2+RANDOM%7)); done'
cap b_keepalive2 BENIGN "" 'ab -k -n 3000 -c 8 http://'$TGT'/ 2>/dev/null; ab -k -n 2000 -c 3 http://'$TGT'/ 2>/dev/null'
# ---- DoS concurrency gradient (helps siege/ab separability) ----
cap d_ab_c30  DoS 10.200.0.1 'ab -n 2000 -c 30 http://'$TGT'/ 2>/dev/null'
cap d_ab_c250 DoS 10.200.0.1 'ab -n 8000 -c 250 http://'$TGT'/ 2>/dev/null'
cap d_siege_c120 DoS 10.200.0.1 'siege -b -c 120 -t 45S http://'$TGT'/ 2>/dev/null'
cap d_slowread DoS 10.200.0.1 'slowhttptest -c 1000 -X -r 200 -u http://'$TGT'/ -l 45 2>/dev/null'
echo DONE; ls "$REPO/data/captures/"{b_users,b_session,b_keepalive2,d_ab_c,d_siege_c,d_slowread}*_$(date +%Y%m%d)*.csv 2>/dev/null | wc -l
