const mongoose = require("mongoose");
const dns = require("node:dns");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const connectDB = async () => {
  if (process.env.MONGO_DNS_SERVERS !== undefined) {
    const dnsServers = process.env.MONGO_DNS_SERVERS.split(",")
      .map((server) => server.trim())
      .filter(Boolean);

    if (dnsServers.length === 0) {
      throw new Error("MONGO_DNS_SERVERS must contain one or more DNS server IP addresses.");
    }

    dns.setServers(dnsServers);
  }

  const uri = process.env.MONGO_DBURL?.trim();
  if (!uri) {
    throw new Error(
      "MONGO_DBURL is not set. Add your MongoDB connection string to Backend/.env (see Backend/.env.example)."
    );
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`mongooose connected with url: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`mongooose connection failed with error: ${error.message}`);
    throw error;
  }
};
module.exports = connectDB;
