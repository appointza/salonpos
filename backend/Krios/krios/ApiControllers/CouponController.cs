using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class CouponController : ControllerBase
    {
        ILogger<CouponController> logger;
        CouponService couponService;

        public CouponController(ILogger<CouponController> logger, CouponService couponService)
        {
            this.logger = logger;
            this.couponService = couponService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Coupon>>> Entity()
        {
            ActionRes<Coupon> result = new ActionRes<Coupon>()
            {
               item = new Coupon()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Coupon>>>> Select(ActionReq<CouponSelectReq> req)
        {
            ActionRes<List<Coupon>> result = new ActionRes<List<Coupon>>();

            result.item = await couponService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Coupon>>> Insert(ActionReq<Coupon> req)
        {
            ActionRes<Coupon> result = new ActionRes<Coupon>();

            result.item = await couponService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Coupon>>> Update(ActionReq<Coupon> req)
        {
            ActionRes<Coupon> result = new ActionRes<Coupon>();

            result.item = await couponService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Coupon>>> Save(ActionReq<Coupon> req)
        {
            ActionRes<Coupon> result = new ActionRes<Coupon>();

            if(req.item.id > 0){
                result.item = await couponService.Update(req.item);
            }else{
                result.item = await couponService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<CouponDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await couponService.Delete(req.item);

            return Ok(result);
        }

        [HttpPost("ValidateAtPos")]
        public async Task<ActionResult<ActionRes<CouponValidateAtPosRes>>> ValidateAtPos(ActionReq<CouponValidateAtPosReq> req)
        {
            ActionRes<CouponValidateAtPosRes> result = new ActionRes<CouponValidateAtPosRes>();
            result.item = await couponService.ValidateAtPos(req.item);
            return Ok(result);
        }

        [HttpPost("ClaimAtPos")]
        public async Task<ActionResult<ActionRes<CouponClaimAtPosRes>>> ClaimAtPos(ActionReq<CouponClaimAtPosReq> req)
        {
            ActionRes<CouponClaimAtPosRes> result = new ActionRes<CouponClaimAtPosRes>();
            result.item = await couponService.ClaimAtPos(req.item);
            return Ok(result);
        }
    }
}
