using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class InvoiceController : ControllerBase
    {
        ILogger<InvoiceController> logger;
        InvoiceService invoiceService;

        public InvoiceController(ILogger<InvoiceController> logger, InvoiceService invoiceService)
        {
            this.logger = logger;
            this.invoiceService = invoiceService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Invoice>>> Entity()
        {
            ActionRes<Invoice> result = new ActionRes<Invoice>()
            {
               item = new Invoice()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Invoice>>>> Select(ActionReq<InvoiceSelectReq> req)
        {
            ActionRes<List<Invoice>> result = new ActionRes<List<Invoice>>();

            result.item = await invoiceService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Invoice>>> Insert(ActionReq<Invoice> req)
        {
            ActionRes<Invoice> result = new ActionRes<Invoice>();

            result.item = await invoiceService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Invoice>>> Update(ActionReq<Invoice> req)
        {
            ActionRes<Invoice> result = new ActionRes<Invoice>();

            result.item = await invoiceService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Invoice>>> Save(ActionReq<Invoice> req)
        {
            ActionRes<Invoice> result = new ActionRes<Invoice>();

            if(req.item.id > 0){
                result.item = await invoiceService.Update(req.item);
            }else{
                result.item = await invoiceService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<InvoiceDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await invoiceService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("Quote")]
        public async Task<ActionResult<ActionRes<InvoiceQuoteRes>>> Quote(ActionReq<InvoiceQuoteReq> req)
        {
            ActionRes<InvoiceQuoteRes> result = new ActionRes<InvoiceQuoteRes>();
            result.item = await invoiceService.Quote(req.item);
            return Ok(result);
        }

        [HttpPost("CompleteSale")]
        public async Task<ActionResult<ActionRes<InvoiceCompleteSaleRes>>> CompleteSale(ActionReq<InvoiceCompleteSaleReq> req)
        {
            ActionRes<InvoiceCompleteSaleRes> result = new ActionRes<InvoiceCompleteSaleRes>();
            result.item = await invoiceService.CompleteSale(req.item);
            return Ok(result);
        }

        [HttpPost("Refund")]
        public async Task<ActionResult<ActionRes<InvoiceRefundRes>>> Refund(ActionReq<InvoiceRefundReq> req)
        {
            ActionRes<InvoiceRefundRes> result = new ActionRes<InvoiceRefundRes>();
            result.item = await invoiceService.Refund(req.item);
            return Ok(result);
        }
    }
}
