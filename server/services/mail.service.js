const dns = require("dns");
const nodemailer = require("nodemailer");
const shared = require("nodemailer/lib/shared");

// Prefer IPv4 in Node.js DNS lookups
if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
}

// Nodemailer uses networkInterfaces to check if IPv6 is supported.
// Link-local IPv6 addresses (fe80::) falsely indicate IPv6 support even when there is no IPv6 internet gateway,
// which causes Nodemailer to pick Google's IPv6 address and throw ENETUNREACH.
// Restrict Nodemailer to IPv4 interfaces to ensure reliable connections.
if (shared.networkInterfaces) {
    for (const name of Object.keys(shared.networkInterfaces)) {
        shared.networkInterfaces[name] = shared.networkInterfaces[name].filter(
            (iface) => iface.family === "IPv4" || iface.family === 4
        );
    }
}

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

async function sendMail({ to, subject, text, attachments }, retries = 2) {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            return await transporter.sendMail({
                from: process.env.MAIL_USER,
                to,
                subject,
                text,
                attachments
            });
        } catch (error) {
            if (attempt > retries) throw error;
            console.warn(`[mail.service] sendMail failed on attempt ${attempt}/${retries + 1}, retrying in 2s:`, error.message || error);
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    }
}

module.exports = { sendMail };