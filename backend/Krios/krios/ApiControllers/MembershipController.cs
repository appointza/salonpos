using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class MembershipController : ControllerBase
    {
        ILogger<MembershipController> logger;
        MembershipService membershipService;

        public MembershipController(ILogger<MembershipController> logger, MembershipService membershipService)
        {
            this.logger = logger;
            this.membershipService = membershipService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Membership>>> Entity()
        {
            ActionRes<Membership> result = new ActionRes<Membership>()
            {
               item = new Membership()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Membership>>>> Select(ActionReq<MembershipSelectReq> req)
        {
            ActionRes<List<Membership>> result = new ActionRes<List<Membership>>();

            result.item = await membershipService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Membership>>> Insert(ActionReq<Membership> req)
        {
            ActionRes<Membership> result = new ActionRes<Membership>();

            result.item = await membershipService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Membership>>> Update(ActionReq<Membership> req)
        {
            ActionRes<Membership> result = new ActionRes<Membership>();

            result.item = await membershipService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Membership>>> Save(ActionReq<Membership> req)
        {
            ActionRes<Membership> result = new ActionRes<Membership>();

            if(req.item.id > 0){
                result.item = await membershipService.Update(req.item);
            }else{
                result.item = await membershipService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<MembershipDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await membershipService.Delete(req.item);

            return Ok(result);
        }
    }
}
