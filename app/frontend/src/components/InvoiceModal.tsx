import { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Mail, Download, X, FlaskConical, CheckCircle, Shield } from "lucide-react";
import { SITE } from "@/lib/site-config";

interface InvoiceData {
  invoiceNumber: string;
  planName: string;
  amount: string;
  currency: string;
  symbol: string;
  billingEmail: string;
  cardName: string;
  date: string;
  period: string;
}

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceData;
}

export default function InvoiceModal({ open, onClose, invoice }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const printWindow = window.open("", "_blank", "width=800,height=1000");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.invoiceNumber} — Flavor Experts Network</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
          .invoice-wrap { max-width: 720px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #7c3aed; }
          .logo { display: flex; align-items: center; gap: 12px; }
          .logo-icon { width: 48px; height: 48px; background: #7c3aed; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
          .logo-text h1 { font-size: 22px; font-weight: 800; color: #1a1a2e; }
          .logo-text p { font-size: 12px; color: #666; }
          .invoice-meta { text-align: right; }
          .invoice-meta h2 { font-size: 28px; font-weight: 900; color: #7c3aed; letter-spacing: -0.5px; }
          .invoice-meta .inv-num { font-size: 14px; color: #444; margin-top: 4px; }
          .invoice-meta .inv-date { font-size: 13px; color: #888; margin-top: 2px; }
          .status-paid { display: inline-block; background: #d1fae5; color: #065f46; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 6px; }
          .billing-section { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }
          .billing-block h3 { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .billing-block p { font-size: 14px; color: #222; line-height: 1.7; }
          .billing-block .name { font-weight: 700; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #7c3aed; color: white; }
          thead th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          tbody tr { border-bottom: 1px solid #f3f4f6; }
          tbody td { padding: 14px 16px; font-size: 14px; color: #333; }
          tbody tr:nth-child(even) { background: #faf9ff; }
          .totals { margin-left: auto; width: 280px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #555; border-bottom: 1px solid #f0f0f0; }
          .totals-row:last-child { border-bottom: none; padding-top: 12px; margin-top: 4px; border-top: 2px solid #7c3aed; }
          .totals-row.total { font-size: 18px; font-weight: 800; color: #7c3aed; }
          .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
          .footer p { font-size: 11px; color: #aaa; }
          .security { display: flex; gap: 16px; align-items: center; }
          .security-item { font-size: 11px; color: #aaa; display: flex; align-items: center; gap: 4px; }
          .note { background: #faf9ff; border: 1px solid #ede9fe; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 13px; color: #5b21b6; }
        </style>
      </head>
      <body>
        <div class="invoice-wrap">
          <div class="header">
            <div class="logo">
              <div class="logo-icon">FE</div>
              <div class="logo-text">
                <h1>Flavor Experts Network</h1>
                <p>Professional Community for Flavor Scientists</p>
              </div>
            </div>
            <div class="invoice-meta">
              <h2>INVOICE</h2>
              <div class="inv-num"># ${invoice.invoiceNumber}</div>
              <div class="inv-date">${invoice.date}</div>
              <div class="status-paid">✓ PAID</div>
            </div>
          </div>

          <div class="billing-section">
            <div class="billing-block">
              <h3>From</h3>
              <p class="name">Flavor Experts Network</p>
              <p>{SITE.supportEmail}</p>
              <p>flavorexpertsnetwork.com</p>
            </div>
            <div class="billing-block">
              <h3>Bill To</h3>
              <p class="name">${invoice.cardName}</p>
              <p>${invoice.billingEmail}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Period</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${invoice.planName} Subscription</strong><br><span style="font-size:12px;color:#888">Full access to platform features</span></td>
                <td>${invoice.period === "annual" ? "Annual" : "Monthly"}</td>
                <td>1</td>
                <td>${invoice.symbol} ${invoice.amount}</td>
                <td>${invoice.symbol} ${invoice.amount}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>${invoice.symbol} ${invoice.amount} ${invoice.currency}</span></div>
            <div class="totals-row"><span>Discount</span><span>—</span></div>
            <div class="totals-row"><span>Tax (0%)</span><span>${invoice.symbol} 0.00</span></div>
            <div class="totals-row total"><span>Total Paid</span><span>${invoice.symbol} ${invoice.amount} ${invoice.currency}</span></div>
          </div>

          <div class="note">
            Thank you for subscribing to Flavor Experts Network! Your subscription is now active and you have full access to all ${invoice.planName} features. This invoice serves as your official payment receipt.
          </div>

          <div class="footer">
            <p>Invoice generated automatically on ${invoice.date}</p>
            <div class="security">
              <div class="security-item">🔒 SSL Secured</div>
              <div class="security-item">✓ PCI Compliant</div>
              <div class="security-item">📧 ${invoice.billingEmail}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleEmailInvoice = () => {
    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} — Flavor Experts Network`);
    const body = encodeURIComponent(
      `Dear ${invoice.cardName},\n\n` +
      `Thank you for subscribing to Flavor Experts Network!\n\n` +
      `📄 INVOICE DETAILS\n` +
      `─────────────────────────────\n` +
      `Invoice No.: ${invoice.invoiceNumber}\n` +
      `Date:        ${invoice.date}\n` +
      `Plan:        ${invoice.planName}\n` +
      `Period:      ${invoice.period === "annual" ? "Annual" : "Monthly"}\n` +
      `Amount:      ${invoice.symbol} ${invoice.amount} ${invoice.currency}\n` +
      `Status:      ✓ PAID\n` +
      `─────────────────────────────\n\n` +
      `Your subscription is now active. Enjoy full access to all ${invoice.planName} features!\n\n` +
      `Best regards,\n` +
      `Flavor Experts Network Team\n` +
      `${SITE.supportEmail}\n` +
      `https://flavorexpertsnetwork.com`
    );
    window.open(`mailto:${invoice.billingEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Action bar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Invoice #{invoice.invoiceNumber}</span>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 text-xs">✓ Paid</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEmailInvoice} className="gap-2 text-xs">
              <Mail className="w-3.5 h-3.5" /> Email Invoice
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-2 text-xs bg-primary hover:bg-primary/90">
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={printRef} className="p-8 bg-white dark:bg-card">
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <FlaskConical className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground">Flavor Experts Network</h1>
                <p className="text-sm text-muted-foreground">Professional Community for Flavor Scientists</p>
                <p className="text-xs text-muted-foreground">{SITE.supportEmail} · {SITE.domain}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-primary">INVOICE</p>
              <p className="text-sm text-muted-foreground mt-1">#{invoice.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground">{invoice.date}</p>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 mt-2">✓ PAID</Badge>
            </div>
          </div>

          {/* Bill To / From */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">From</p>
              <p className="font-bold text-foreground">Flavor Experts Network</p>
              <p className="text-sm text-muted-foreground">ayoub@flavorexperts.net</p>
              <p className="text-sm text-muted-foreground">{SITE.domain}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Bill To</p>
              <p className="font-bold text-foreground">{invoice.cardName}</p>
              <p className="text-sm text-muted-foreground">{invoice.billingEmail}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl overflow-hidden border border-border mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left p-3 pl-4 font-semibold text-xs uppercase tracking-wide">Description</th>
                  <th className="text-center p-3 font-semibold text-xs uppercase tracking-wide">Period</th>
                  <th className="text-center p-3 font-semibold text-xs uppercase tracking-wide">Qty</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase tracking-wide">Unit Price</th>
                  <th className="text-right p-3 pr-4 font-semibold text-xs uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-3 pl-4">
                    <p className="font-semibold text-foreground">{invoice.planName} Subscription</p>
                    <p className="text-xs text-muted-foreground">Full access to platform features & content</p>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{invoice.period === "annual" ? "Annual" : "Monthly"}</td>
                  <td className="p-3 text-center text-muted-foreground">1</td>
                  <td className="p-3 text-right text-muted-foreground">{invoice.symbol} {invoice.amount}</td>
                  <td className="p-3 pr-4 text-right font-semibold text-foreground">{invoice.symbol} {invoice.amount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto w-72 space-y-2 text-sm">
            <div className="flex justify-between py-1.5 text-muted-foreground border-b border-border">
              <span>Subtotal</span><span>{invoice.symbol} {invoice.amount} {invoice.currency}</span>
            </div>
            <div className="flex justify-between py-1.5 text-muted-foreground border-b border-border">
              <span>Discount</span><span>—</span>
            </div>
            <div className="flex justify-between py-1.5 text-muted-foreground border-b border-border">
              <span>Tax (0%)</span><span>{invoice.symbol} 0.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t-2 border-primary font-bold text-lg">
              <span className="text-foreground">Total Paid</span>
              <span className="text-primary">{invoice.symbol} {invoice.amount} {invoice.currency}</span>
            </div>
          </div>

          {/* Thank you note */}
          <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Thank you for subscribing! 🎉</p>
            <p>Your <strong>{invoice.planName}</strong> subscription is now active. You have full access to all platform features. A copy of this invoice has been sent to <strong>{invoice.billingEmail}</strong>.</p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Generated on {invoice.date}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" /> SSL Secured</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> PCI Compliant</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
