const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

async function generateInvoice(invoiceData) {
    let htmlTemplate = fs.readFileSync(path.join(__dirname, "invoice-template.html"), "utf8");

    htmlTemplate = htmlTemplate
        .replace("{{invoiceNumber}}", invoiceData.invoiceNumber)
        .replace("{{clientName}}", invoiceData.clientName)
        .replace("{{invoiceDate}}", invoiceData.invoiceDate)
        .replace("{{dueDate}}", invoiceData.dueDate)
        .replace("{{items}}", items.replace(/\n/g, "<br>"))
        .replace("{{totalAmount}}", invoiceData.totalAmount);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlTemplate, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true});
    await browser.close();
    return pdfBuffer;
}

app.post("/generate-invoice", async (req, res) => {
    try {
        const pdfBuffer = await generateInvoice(req.body);
        res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"')
        res.setHeader("Content-Type", "application/pdf");
        res.send(pdfBuffer);
    } catch (error){
        console.error("Error generating invoice:", error);
        res.status(500).send("Error genertaing invoice");
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`server running at http://localhost:${PORT}`));