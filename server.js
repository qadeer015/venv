//server.js
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const app = require('./config/app');
require("dotenv").config();
const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});