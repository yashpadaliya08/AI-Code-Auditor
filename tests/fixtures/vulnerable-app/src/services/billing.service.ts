import { exec } from 'node:child_process';

// CWE-78: OS Command Injection
export function generatePdfInvoice(invoiceId: string, outputName: string) {
  // Directly passes untrusted input into shell exec
  const cmd = `wkhtmltopdf https://billing.internal/invoices/${invoiceId} /tmp/${outputName}.pdf`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Invoice generation failed', err);
    }
  });
}
