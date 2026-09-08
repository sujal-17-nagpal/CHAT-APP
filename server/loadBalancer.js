import express from "express";
import axios from "axios";

const app = express();

app.use(express.json());

const servers = [
  "http://localhost:5000",
  "http://localhost:5001"
];

let currentIndex = 0;

function getNextServer() {
  const target = servers[currentIndex];
  currentIndex = (currentIndex + 1) % servers.length;
  return target;
}

app.use(async (req, res) => {
  const targetServer = getNextServer();
  // console.log(`[Load Balancer] Forwarding ${req.method} ${req.url} -> ${targetServer}`);

  try {
    const response = await axios({
      method: req.method,
      url: `${targetServer}${req.url}`,
      headers: {
        ...req.headers,
        host: new URL(targetServer).host
      },
      data: req.body
    });

    // res.setHeader("X-Handled-By", targetServer);
    return res.status(response.status).json(response.data);

  } catch (error) {
    if (error.response) {
      // res.setHeader("X-Handled-By", targetServer);
      return res.status(error.response.status).json(error.response.data);
    }
    console.error(`[Load Balancer Error] Failed to connect to ${targetServer}:`, error.message);
    return res.status(502).json({ message: `Server at ${targetServer} is unreachable` });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`🚀 Load Balancer running on http://localhost:${PORT}`);
  console.log(`   Balancing between ${servers.join(" and ")}`);
});
