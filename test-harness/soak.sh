#!/usr/bin/env bash
# 5-minute soak test for the Dockerised MasterNode-App.
# Drives a mix of read endpoints in parallel, samples container memory/CPU
# every 15s, and verifies the container stays up the whole time.
set -u

BASE="${BASE:-http://localhost:3568}"
DURATION="${DURATION:-300}"      # seconds
WORKERS="${WORKERS:-8}"
CONTAINER="${CONTAINER:-masternode-app-test}"
RESULTS_DIR="${RESULTS_DIR:-/tmp/masternode-soak}"

mkdir -p "$RESULTS_DIR"
: > "$RESULTS_DIR/stats.tsv"
echo -e "ts\tcpu\tmem_usage\tmem_pct\tnet\tblock\tpids" >> "$RESULTS_DIR/stats.tsv"

start_epoch=$(date +%s)
end_epoch=$((start_epoch + DURATION))

# Worker that loops over a basket of endpoints until the deadline.
worker () {
    local id=$1
    local out="$RESULTS_DIR/worker-$id.tsv"
    : > "$out"
    while [ "$(date +%s)" -lt "$end_epoch" ]; do
        for path in /api/config / /api/candidates /api/transactions; do
            local code
            code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE$path")
            echo -e "$(date +%s)\t$path\t$code" >> "$out"
        done
    done
}

# Spawn workers.
for i in $(seq 1 "$WORKERS"); do
    worker "$i" &
done

# Sample docker stats every 15s.
while [ "$(date +%s)" -lt "$end_epoch" ]; do
    line=$(docker stats --no-stream --format '{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}' "$CONTAINER" 2>/dev/null)
    echo -e "$(date +%s)\t$line" >> "$RESULTS_DIR/stats.tsv"
    sleep 15
done

wait

# Aggregate.
echo
echo "=== SOAK SUMMARY (duration=${DURATION}s, workers=$WORKERS) ==="
total=0; ok=0; limited=0; bad=0; conn_err=0
for f in "$RESULTS_DIR"/worker-*.tsv; do
    while IFS=$'\t' read -r _ts _path code; do
        total=$((total+1))
        case "$code" in
            200) ok=$((ok+1));;
            429) limited=$((limited+1));;
            000) conn_err=$((conn_err+1));;
            *)   bad=$((bad+1));;
        esac
    done < "$f"
done
echo "total requests: $total"
echo "  200          : $ok"
echo "  429          : $limited (expected — readLimiter on /api/candidates etc. trips at 240 req/min/IP)"
echo "  5xx/4xx-other: $bad"
echo "  conn errors  : $conn_err"
echo
echo "=== Container status after soak ==="
docker ps --filter "name=$CONTAINER" --format '{{.Names}}\t{{.Status}}'
echo
echo "=== docker stats samples (first/last) ==="
head -2 "$RESULTS_DIR/stats.tsv"
tail -2 "$RESULTS_DIR/stats.tsv"
echo
echo "=== Last 20 lines of container log ==="
docker logs --tail 20 "$CONTAINER" 2>&1
