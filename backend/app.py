from flask import Flask, jsonify
from flask_cors import CORS
import psutil
import time
import platform
import subprocess
import re

app = Flask(__name__)
CORS(app)

simulation_mode = "congested"

previous = psutil.net_io_counters()
previous_time = time.time()


# ---------------------------------------------------
# NETWORK SPEED MONITOR
# ---------------------------------------------------

def get_network_speed():
    global previous, previous_time

    current = psutil.net_io_counters()
    current_time = time.time()

    elapsed = current_time - previous_time

    if elapsed <= 0:
        return 0, 0

    download_mbps = (
        (current.bytes_recv - previous.bytes_recv)
        * 8 / elapsed / 1_000_000
    )

    upload_mbps = (
        (current.bytes_sent - previous.bytes_sent)
        * 8 / elapsed / 1_000_000
    )

    previous = current
    previous_time = current_time

    return round(download_mbps, 2), round(upload_mbps, 2)


# ---------------------------------------------------
# LATENCY MONITOR
# ---------------------------------------------------

def get_latency():
    try:

        result = subprocess.run(
            ["ping", "-c", "1", "8.8.8.8"],
            capture_output=True,
            text=True,
            timeout=3
        )

        match = re.search(
            r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms",
            result.stdout
        )

        if match:
            return round(float(match.group(1)), 2)

        return None

    except Exception:
        return None


# ---------------------------------------------------
# HOME
# ---------------------------------------------------

@app.route("/")
def home():
    return "SmartQoS Backend Running"


# ---------------------------------------------------
# NETWORK API
# ---------------------------------------------------

@app.route("/api/network")
def network_status():

    download, upload = get_network_speed()
    latency = get_latency()

    return jsonify({
        "download_mbps": download,
        "upload_mbps": upload,
        "latency_ms": latency,
        "timestamp": time.time()
    })


# ---------------------------------------------------
# SIMULATION CONTROL
# ---------------------------------------------------

@app.route("/api/simulation/<mode>", methods=["POST"])
def change_simulation(mode):

    global simulation_mode

    if mode not in ["normal", "congested"]:
        return jsonify({
            "error": "Invalid simulation mode"
        }), 400

    simulation_mode = mode

    return jsonify({
        "simulation_mode": simulation_mode
    })


# ---------------------------------------------------
# ADAPTIVE QoS ENGINE
# ---------------------------------------------------

@app.route("/api/qos")
def qos_status():

    # Maximum network capacity
    available_bandwidth = 100

    # ------------------------------------------------
    # NORMAL NETWORK
    # ------------------------------------------------

    if simulation_mode == "normal":

        traffic = [
            {
                "application": "Video Call",
                "type": "Real-time",
                "priority": "HIGH",
                "weight": 5,
                "demand_mbps": 20
            },
            {
                "application": "Online Gaming",
                "type": "Real-time",
                "priority": "HIGH",
                "weight": 4,
                "demand_mbps": 15
            },
            {
                "application": "Web Browsing",
                "type": "Interactive",
                "priority": "MEDIUM",
                "weight": 2,
                "demand_mbps": 15
            },
            {
                "application": "File Download",
                "type": "Bulk Data",
                "priority": "LOW",
                "weight": 1,
                "demand_mbps": 20
            }
        ]

    # ------------------------------------------------
    # CONGESTED NETWORK
    # ------------------------------------------------

    else:

        traffic = [
            {
                "application": "Video Call",
                "type": "Real-time",
                "priority": "HIGH",
                "weight": 5,
                "demand_mbps": 35
            },
            {
                "application": "Online Gaming",
                "type": "Real-time",
                "priority": "HIGH",
                "weight": 4,
                "demand_mbps": 25
            },
            {
                "application": "Web Browsing",
                "type": "Interactive",
                "priority": "MEDIUM",
                "weight": 2,
                "demand_mbps": 20
            },
            {
                "application": "File Download",
                "type": "Bulk Data",
                "priority": "LOW",
                "weight": 1,
                "demand_mbps": 40
            }
        ]

    # ------------------------------------------------
    # CALCULATE TOTAL DEMAND
    # ------------------------------------------------

    total_demand = sum(
        item["demand_mbps"]
        for item in traffic
    )

    # ------------------------------------------------
    # CONGESTION DETECTION
    # ------------------------------------------------

    congestion = total_demand > available_bandwidth

    # ------------------------------------------------
    # PRIORITY WEIGHT
    # ------------------------------------------------

    total_weight = sum(
        item["weight"]
        for item in traffic
    )

    # ------------------------------------------------
    # ADAPTIVE BANDWIDTH ALLOCATION
    # ------------------------------------------------

    remaining_bandwidth = available_bandwidth
    remaining_weight = total_weight

    for item in traffic:

        if remaining_weight > 0:

            fair_share = (
                remaining_bandwidth
                * item["weight"]
                / remaining_weight
            )

        else:

            fair_share = 0

        allocation = min(
            item["demand_mbps"],
            fair_share
        )

        item["allocated_mbps"] = round(
            allocation,
            2
        )

        remaining_bandwidth -= allocation
        remaining_weight -= item["weight"]

    # ------------------------------------------------
    # RESPONSE
    # ------------------------------------------------

    return jsonify({
        "simulation_mode": simulation_mode,
        "available_bandwidth_mbps": available_bandwidth,
        "total_demand_mbps": total_demand,
        "congestion": congestion,
        "total_priority_weight": total_weight,
        "traffic": traffic
    })


# ---------------------------------------------------
# START SERVER
# ---------------------------------------------------

if __name__ == "__main__":

    import os

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )