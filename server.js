const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "invoice-form.html"));
});




async function generateInvoice(invoiceData) {
    let htmlTemplate = fs.readFileSync(path.join(__dirname, "templates", "invoice-template.html"), "utf8");

    const itemsArray = Array.isArray(invoiceData.items) ? invoiceData.items : [invoiceData.items];

    htmlTemplate = htmlTemplate
        .replace("{{invoiceNumber}}", invoiceData.invoiceNumber)
        .replace("{{clientName}}", invoiceData.clientName)
        .replace("{{invoiceDate}}", invoiceData.invoiceDate)
        .replace("{{dueDate}}", invoiceData.dueDate)
        .replace("{{items}}", itemsArray.map(item => `<p>${item}</p>`).join(""))
        .replace("{{totalAmount}}", invoiceData.totalAmount);

    // **Save HTML for Debugging**
    fs.writeFileSync("debug-invoice.html", htmlTemplate);
    console.log("Saved HTML template to debug-invoice.html");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // **Load and Capture a Screenshot**
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });
    console.log("HTML Loaded in Puppeteer");

    await page.screenshot({ path: "debug-screenshot.png", fullPage: true });
    console.log("Screenshot saved for debugging.");

    // **Generate PDF**
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    console.log("PDF Generated, Buffer Size:", pdfBuffer.length);

    await browser.close();

    if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("PDF generation failed: Empty buffer");
    }

    return pdfBuffer;
}



app.post("/generate-invoice", async (req, res) => {
    try {
        console.log("Received invoice data:", req.body);
        const pdfBuffer = await generateInvoice(req.body);

        console.log("Saving PDF to disk...");
        fs.writeFileSync("test-invoice.pdf", pdfBuffer);

        console.log("Sending PDF to client...");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
        res.setHeader("Content-Length", pdfBuffer.length);

        res.send(Buffer.from(pdfBuffer)); // Ensure correct encoding
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice");
    }
});



const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
