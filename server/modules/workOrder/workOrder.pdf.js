const { chromium } = require("playwright");

let browserPromise;

function getLaunchOptions() {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

    return {
        headless: true,
        executablePath: executablePath || undefined,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
    };
}

async function getBrowser() {
    if (!browserPromise) {
        browserPromise = chromium.launch(getLaunchOptions()).catch((error) => {
            browserPromise = null;
            throw error;
        });
    }

    return browserPromise;
}

async function renderHtmlToPdf(html, options = {}) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        await page.setContent(html, { waitUntil: "load" });

        return await page.pdf({
            format: "A4",
            landscape: true,
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: "<div></div>",
            footerTemplate: `
                <div style="width:100%; font-size:10px; padding:0 1mm; color:#111; font-family:Arial, Helvetica, sans-serif;">
                    <div style="border-top:1px solid #111; padding-top:4px; display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div style="font-weight:700;">${String(options.footerText || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                        <div>Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
                    </div>
                </div>
            `,
            margin: {
                top: "2mm",
                right: "2mm",
                bottom: "9mm",
                left: "2mm",
            },
        });
    } finally {
        await page.close();
    }
}

async function closeBrowser() {
    if (!browserPromise) {
        return;
    }

    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
}

module.exports = {
    closeBrowser,
    renderHtmlToPdf,
};
