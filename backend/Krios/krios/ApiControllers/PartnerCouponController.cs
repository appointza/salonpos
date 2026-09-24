using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class PartnerCouponController : ControllerBase
    {
        ILogger<PartnerCouponController> logger;
        PartnerCouponService partnercouponService;

        public PartnerCouponController(ILogger<PartnerCouponController> logger, PartnerCouponService partnercouponService)
        {
            this.logger = logger;
            this.partnercouponService = partnercouponService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<PartnerCoupon>>> Entity()
        {
            ActionRes<PartnerCoupon> result = new ActionRes<PartnerCoupon>()
            {
               item = new PartnerCoupon()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<PartnerCoupon>>>> Select(ActionReq<PartnerCouponSelectReq> req)
        {
            ActionRes<List<PartnerCoupon>> result = new ActionRes<List<PartnerCoupon>>();

            result.item = await partnercouponService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<PartnerCoupon>>> Insert(ActionReq<PartnerCoupon> req)
        {
            ActionRes<PartnerCoupon> result = new ActionRes<PartnerCoupon>();

            result.item = await partnercouponService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<PartnerCoupon>>> Update(ActionReq<PartnerCoupon> req)
        {
            ActionRes<PartnerCoupon> result = new ActionRes<PartnerCoupon>();

            result.item = await partnercouponService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<PartnerCoupon>>> Save(ActionReq<PartnerCoupon> req)
        {
            ActionRes<PartnerCoupon> result = new ActionRes<PartnerCoupon>();

            if(req.item.id > 0){
                result.item = await partnercouponService.Update(req.item);
            }else{
                result.item = await partnercouponService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<PartnerCouponDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await partnercouponService.Delete(req.item);

            return Ok(result);
        }
    }
}
