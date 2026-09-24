/** Auto-generated — run: node scripts/generate-api-services.mjs */
import { KriosBaseService } from "@/services/krios-base.service";
import type { InvoiceCompleteSaleReq, InvoiceCompleteSaleRes, InvoiceQuoteReq, InvoiceQuoteRes, InvoiceRefundReq, InvoiceRefundRes, InvoiceRes } from "@/model/invoices";

export class InvoiceService extends KriosBaseService<InvoiceRes> {
  constructor() {
    super("Invoice");
  }

  async quote(req: InvoiceQuoteReq): Promise<InvoiceQuoteRes> {
    return this.postAction<InvoiceQuoteReq, InvoiceQuoteRes>("Quote", req);
  }

  async completeSale(req: InvoiceCompleteSaleReq): Promise<InvoiceCompleteSaleRes> {
    return this.postAction<InvoiceCompleteSaleReq, InvoiceCompleteSaleRes>("CompleteSale", req);
  }

  async refund(req: InvoiceRefundReq): Promise<InvoiceRefundRes> {
    return this.postAction<InvoiceRefundReq, InvoiceRefundRes>("Refund", req);
  }
}

export const invoiceService = new InvoiceService();
