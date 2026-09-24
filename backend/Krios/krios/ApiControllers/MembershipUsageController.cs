using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class MembershipUsageController : ControllerBase
    {
        ILogger<MembershipUsageController> logger;
        MembershipUsageService membershipusageService;

        public MembershipUsageController(ILogger<MembershipUsageController> logger, MembershipUsageService membershipusageService)
        {
            this.logger = logger;
            this.membershipusageService = membershipusageService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<MembershipUsage>>> Entity()
        {
            ActionRes<MembershipUsage> result = new ActionRes<MembershipUsage>()
            {
               item = new MembershipUsage()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<MembershipUsage>>>> Select(ActionReq<MembershipUsageSelectReq> req)
        {
            ActionRes<List<MembershipUsage>> result = new ActionRes<List<MembershipUsage>>();

            result.item = await membershipusageService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<MembershipUsage>>> Insert(ActionReq<MembershipUsage> req)
        {
            ActionRes<MembershipUsage> result = new ActionRes<MembershipUsage>();

            result.item = await membershipusageService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<MembershipUsage>>> Update(ActionReq<MembershipUsage> req)
        {
            ActionRes<MembershipUsage> result = new ActionRes<MembershipUsage>();

            result.item = await membershipusageService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<MembershipUsage>>> Save(ActionReq<MembershipUsage> req)
        {
            ActionRes<MembershipUsage> result = new ActionRes<MembershipUsage>();

            if(req.item.id > 0){
                result.item = await membershipusageService.Update(req.item);
            }else{
                result.item = await membershipusageService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<MembershipUsageDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await membershipusageService.Delete(req.item);

            return Ok(result);
        }
    }
}
