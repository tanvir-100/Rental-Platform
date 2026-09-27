const mongoose = require('mongoose');
const dns = require('dns');

// Set custom DNS servers (Google + Cloudflare) - affects regular DNS lookups only
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
console.log('[db] Custom DNS servers set:', dns.getServers());

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rental-platform';
    // Log URI without credentials for debugging
    const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log('[db] Attempting connection to:', safeUri);
    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('[db] MongoDB connection failed:', err.message);
    console.error('[db] Full error:', err);
    console.error('[db] Error code:', err.code);
    console.error('[db] Error name:', err.name);
    process.exit(1);
  }
};

module.exports = connectDB;
