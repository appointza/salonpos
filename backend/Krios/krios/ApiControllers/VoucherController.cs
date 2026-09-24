using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherController : ControllerBase
    {
        ILogger<VoucherController> logger;
        VoucherService voucherService;

        public VoucherController(ILogger<VoucherController> logger, VoucherService voucherService)
        {
            this.logger = logger;
            this.voucherService = voucherService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Voucher>>> Entity()
        {
            ActionRes<Voucher> result = new ActionRes<Voucher>()
            {
               item = new Voucher()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Voucher>>>> Select(ActionReq<VoucherSelectReq> req)
        {
            ActionRes<List<Voucher>> result = new ActionRes<List<Voucher>>();

            result.item = await voucherService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Voucher>>> Insert(ActionReq<Voucher> req)
        {
            ActionRes<Voucher> result = new ActionRes<Voucher>();

            result.item = await voucherService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Voucher>>> Update(ActionReq<Voucher> req)
        {
            ActionRes<Voucher> result = new ActionRes<Voucher>();

            result.item = await voucherService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Voucher>>> Save(ActionReq<Voucher> req)
        {
            ActionRes<Voucher> result = new ActionRes<Voucher>();

            if(req.item.id > 0){
                result.item = await voucherService.Update(req.item);
            }else{
                result.item = await voucherService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<VoucherDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await voucherService.Delete(req.item);

            return Ok(result);
        }
    }
}
