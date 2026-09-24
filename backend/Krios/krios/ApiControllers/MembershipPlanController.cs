using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class MembershipPlanController : ControllerBase
    {
        ILogger<MembershipPlanController> logger;
        MembershipPlanService membershipplanService;

        public MembershipPlanController(ILogger<MembershipPlanController> logger, MembershipPlanService membershipplanService)
        {
            this.logger = logger;
            this.membershipplanService = membershipplanService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<MembershipPlan>>> Entity()
        {
            ActionRes<MembershipPlan> result = new ActionRes<MembershipPlan>()
            {
               item = new MembershipPlan()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<MembershipPlan>>>> Select(ActionReq<MembershipPlanSelectReq> req)
        {
            ActionRes<List<MembershipPlan>> result = new ActionRes<List<MembershipPlan>>();

            result.item = await membershipplanService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<MembershipPlan>>> Insert(ActionReq<MembershipPlan> req)
        {
            ActionRes<MembershipPlan> result = new ActionRes<MembershipPlan>();

            result.item = await membershipplanService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<MembershipPlan>>> Update(ActionReq<MembershipPlan> req)
        {
            ActionRes<MembershipPlan> result = new ActionRes<MembershipPlan>();

            result.item = await membershipplanService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<MembershipPlan>>> Save(ActionReq<MembershipPlan> req)
        {
            ActionRes<MembershipPlan> result = new ActionRes<MembershipPlan>();

            if(req.item.id > 0){
                result.item = await membershipplanService.Update(req.item);
            }else{
                result.item = await membershipplanService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<MembershipPlanDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await membershipplanService.Delete(req.item);

            return Ok(result);
        }
    }
}
