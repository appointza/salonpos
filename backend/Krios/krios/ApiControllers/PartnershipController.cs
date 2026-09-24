using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class PartnershipController : ControllerBase
    {
        ILogger<PartnershipController> logger;
        PartnershipService partnershipService;

        public PartnershipController(ILogger<PartnershipController> logger, PartnershipService partnershipService)
        {
            this.logger = logger;
            this.partnershipService = partnershipService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Partnership>>> Entity()
        {
            ActionRes<Partnership> result = new ActionRes<Partnership>()
            {
               item = new Partnership()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Partnership>>>> Select(ActionReq<PartnershipSelectReq> req)
        {
            ActionRes<List<Partnership>> result = new ActionRes<List<Partnership>>();

            result.item = await partnershipService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Partnership>>> Insert(ActionReq<Partnership> req)
        {
            ActionRes<Partnership> result = new ActionRes<Partnership>();

            result.item = await partnershipService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Partnership>>> Update(ActionReq<Partnership> req)
        {
            ActionRes<Partnership> result = new ActionRes<Partnership>();

            result.item = await partnershipService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Partnership>>> Save(ActionReq<Partnership> req)
        {
            ActionRes<Partnership> result = new ActionRes<Partnership>();

            if(req.item.id > 0){
                result.item = await partnershipService.Update(req.item);
            }else{
                result.item = await partnershipService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<PartnershipDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await partnershipService.Delete(req.item);

            return Ok(result);
        }
    }
}
