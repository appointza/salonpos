using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class LoyaltyController : ControllerBase
    {
        ILogger<LoyaltyController> logger;
        LoyaltyService loyaltyService;

        public LoyaltyController(ILogger<LoyaltyController> logger, LoyaltyService loyaltyService)
        {
            this.logger = logger;
            this.loyaltyService = loyaltyService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Loyalty>>> Entity()
        {
            ActionRes<Loyalty> result = new ActionRes<Loyalty>()
            {
               item = new Loyalty()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Loyalty>>>> Select(ActionReq<LoyaltySelectReq> req)
        {
            ActionRes<List<Loyalty>> result = new ActionRes<List<Loyalty>>();

            result.item = await loyaltyService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Loyalty>>> Insert(ActionReq<Loyalty> req)
        {
            ActionRes<Loyalty> result = new ActionRes<Loyalty>();

            result.item = await loyaltyService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Loyalty>>> Update(ActionReq<Loyalty> req)
        {
            ActionRes<Loyalty> result = new ActionRes<Loyalty>();

            result.item = await loyaltyService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Loyalty>>> Save(ActionReq<Loyalty> req)
        {
            ActionRes<Loyalty> result = new ActionRes<Loyalty>();

            if(req.item.id > 0){
                result.item = await loyaltyService.Update(req.item);
            }else{
                result.item = await loyaltyService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<LoyaltyDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await loyaltyService.Delete(req.item);

            return Ok(result);
        }
    }
}
