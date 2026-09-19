import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import "./App.css";

function App() {
  const [network, setNetwork] = useState(null);
  const [qos, setQos] = useState(null);
  const [error, setError] = useState("");
  const [trafficHistory, setTrafficHistory] = useState([]);

  const getData = async () => {
    try {
      const networkResponse = await axios.get(
        "https://smartqos.onrender.com/api/network"
      );

      const qosResponse = await axios.get(
        "https://smartqos.onrender.com/api/qos"
      );

     setNetwork(networkResponse.data);
setQos(qosResponse.data);
setError("");

const newPoint = {
  time: new Date().toLocaleTimeString(),
  demand: qosResponse.data.total_demand_mbps,
};

setTrafficHistory((prev) => {
  const updated = [...prev, newPoint];

  // Keep only the latest 20 points
  return updated.slice(-20);
});
    } catch (err) {
      console.error("SmartQoS Error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to connect to SmartQoS backend"
      );
    }
  };
  const changeSimulation = async (mode) => {
  try {
    await axios.post(
      `https://smartqos.onrender.com/api/simulation/${mode}`
    );

    await getData();
  } catch (err) {
    console.error("Simulation Error:", err);

    setError(
      err.response?.data?.message ||
      err.message ||
      "Unable to change simulation mode"
    );
  }
};

  useEffect(() => {
    getData();

    const interval = setInterval(getData, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">

      {/* HEADER */}
      <div className="header">
        <h1>SmartQoS</h1>
        <p>Adaptive Network Quality of Service System</p>
      </div>

      {/* NETWORK STATISTICS */}
      {network && (
        <div className="stats">

          <div className="card">
            <h3>Download Speed</h3>
            <div className="value">
              {network.download_mbps} Mbps
            </div>
          </div>

          <div className="card">
            <h3>Upload Speed</h3>
            <div className="value">
              {network.upload_mbps} Mbps
            </div>
          </div>

          <div className="card">
            <h3>Network Latency</h3>
            <div className="value">
              {network.latency_ms ?? "N/A"} ms
            </div>
          </div>

        </div>
      )}

      {/* REAL-TIME TRAFFIC CHART */}
<div className="main-card">

  <h2>Real-Time Traffic Demand</h2>

  <p>
    Live network traffic demand monitored by SmartQoS.
  </p>

  <div className="traffic-chart">
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={trafficHistory}>

        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="time"
        />

        <YAxis
          domain={[0, 140]}
          label={{
            value: "Mbps",
            angle: -90,
            position: "insideLeft",
          }}
        />

        <Tooltip />

        <Legend />

        <ReferenceLine
          y={100}
          stroke="#dc2626"
          strokeDasharray="5 5"
          label="Network Capacity (100 Mbps)"
        />

        <Line
          type="monotone"
          dataKey="demand"
          name="Traffic Demand"
          stroke="#2563eb"
          strokeWidth={3}
          dot={false}
          animationDuration={500}
        />

      </LineChart>
    </ResponsiveContainer>
  </div>

</div>
      {/* SIMULATION CONTROLS */}

<div className="main-card">

  <h2>Network Simulation</h2>

  <p>
    Test how SmartQoS responds to changing network traffic.
  </p>

  <button
    onClick={() => changeSimulation("normal")}
    className="simulation-button normal-button"
  >
    🟢 Normal Network
  </button>

  <button
    onClick={() => changeSimulation("congested")}
    className="simulation-button congestion-button"
  >
    🚨 Simulate Congestion
  </button>

</div>
      {/* NETWORK STATUS */}
      <div className="main-card">
        <h2>Network Status</h2>

        {error ? (
          <p>{error}</p>
        ) : (
          <span className="status">
            ● Connected
          </span>
        )}
      </div>

        {/* QoS BANDWIDTH ALLOCATION CHART */}
<div className="main-card">

  <h2>QoS Bandwidth Allocation</h2>

  <p>
    Adaptive bandwidth allocation based on application priority.
  </p>

  {qos && (
    <div className="traffic-chart">

      <ResponsiveContainer width="100%" height={350}>

        <BarChart
          data={qos.traffic}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="application"
          />

          <YAxis
            label={{
              value: "Mbps",
              angle: -90,
              position: "insideLeft",
            }}
          />

          <Tooltip />

          <Legend />

          <Bar
            dataKey="allocated_mbps"
            name="Allocated Bandwidth"
            fill="#2563eb"
          />

        </BarChart>

      </ResponsiveContainer>

    </div>
  )}

</div>
      {/* TRAFFIC MONITORING */}
      <div className="main-card">

        <h2>Traffic Monitoring</h2>

        {qos && (
          <>
            <p>
              Available Bandwidth:{" "}
              <strong>
                {qos.available_bandwidth_mbps} Mbps
              </strong>
            </p>

            <p>
              Current Traffic Demand:{" "}
              <strong>
                {qos.total_demand_mbps} Mbps
              </strong>
            </p>

            {/* CONGESTION STATUS */}

            {qos.congestion ? (
              <div className="congestion">
                🚨 Network Congestion Detected
              </div>
            ) : (
              <div className="normal">
                🟢 Network Operating Normally
              </div>
            )}
            {qos.congestion ? (
  <div className="qos-action">
    🛡️ <strong>QoS Active:</strong>{" "}
    High-priority real-time traffic is protected.
    Low-priority traffic has been reduced to prevent
    network overload.
  </div>
) : (
  <div className="qos-action-normal">
    🟢 <strong>QoS Standby:</strong>{" "}
    Network capacity is sufficient.
    Applications are receiving their requested bandwidth.
  </div>
)}
          </>
        )}

        {/* TRAFFIC TABLE */}

        <table className="traffic-table">

          <thead>
            <tr>
              <th>Application</th>
              <th>Traffic Type</th>
              <th>Priority</th>
              <th>Allocated Bandwidth</th>
              <th>Usage</th>
            </tr>
          </thead>

          <tbody>

            {qos &&
              qos.traffic.map((item) => (

                <tr key={item.application}>

                  <td>
                    {item.application}
                  </td>

                  <td>
                    {item.type}
                  </td>

                  <td
                    className={
                      item.priority === "HIGH"
                        ? "priority-high"
                        : item.priority === "MEDIUM"
                        ? "priority-medium"
                        : "priority-low"
                    }
                  >
                    {item.priority}
                  </td>

                  <td>
                    <strong>
                      {item.allocated_mbps} Mbps
                    </strong>
                  </td>

                  {/* BANDWIDTH BAR */}

                  <td>

                    <div className="bandwidth-container">

                      <div className="bandwidth-bar">

                        <div
                          className="bandwidth-fill"
                          style={{
                            width: `${
                              (item.allocated_mbps /
                                qos.available_bandwidth_mbps) *
                              100
                            }%`,
                          }}
                        />

                      </div>

                      <div className="bandwidth-text">
                        {Math.round(
                          (item.allocated_mbps /
                            qos.available_bandwidth_mbps) *
                            100
                        )}
                        % of network
                      </div>

                    </div>

                  </td>

                </tr>

              ))}

          </tbody>

        </table>

        {!qos && !error && (
          <p>Loading QoS data...</p>
        )}

        {error && (
          <p style={{ color: "red" }}>
            Error: {error}
          </p>
        )}

      </div>

    </div>
  );
}

export default App;