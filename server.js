const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


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

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // **Debugging: Check if PDF Buffer is Generated**
    if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("PDF generation failed: Empty buffer");
    }

    return pdfBuffer;
}


app.post("/generate-invoice", async (req, res) => {
    try {
        console.log("Received invoice data:", req.body); // Debugging
        const pdfBuffer = await generateInvoice(req.body);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
        res.setHeader("Content-Length", pdfBuffer.length);  // Ensure the correct content length
        fs.writeFileSync("test-invoice.pdf", pdfBuffer);

        res.send(pdfBuffer);
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice");
    }
});


const PORT = 3001;
    app.listen(PORT, () => console.log(`server running at http://localhost:${PORT}`));