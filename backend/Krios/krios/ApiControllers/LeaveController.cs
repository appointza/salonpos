using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeaveController : ControllerBase
    {
        ILogger<LeaveController> logger;
        LeaveService leaveService;

        public LeaveController(ILogger<LeaveController> logger, LeaveService leaveService)
        {
            this.logger = logger;
            this.leaveService = leaveService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Leave>>> Entity()
        {
            ActionRes<Leave> result = new ActionRes<Leave>()
            {
               item = new Leave()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Leave>>>> Select(ActionReq<LeaveSelectReq> req)
        {
            ActionRes<List<Leave>> result = new ActionRes<List<Leave>>();

            result.item = await leaveService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Leave>>> Insert(ActionReq<Leave> req)
        {
            ActionRes<Leave> result = new ActionRes<Leave>();

            result.item = await leaveService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Leave>>> Update(ActionReq<Leave> req)
        {
            ActionRes<Leave> result = new ActionRes<Leave>();

            result.item = await leaveService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Leave>>> Save(ActionReq<Leave> req)
        {
            ActionRes<Leave> result = new ActionRes<Leave>();

            if(req.item.id > 0){
                result.item = await leaveService.Update(req.item);
            }else{
                result.item = await leaveService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<LeaveDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await leaveService.Delete(req.item);

            return Ok(result);
        }
    }
}
