using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommissionController : ControllerBase
    {
        ILogger<CommissionController> logger;
        CommissionService commissionService;

        public CommissionController(ILogger<CommissionController> logger, CommissionService commissionService)
        {
            this.logger = logger;
            this.commissionService = commissionService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Commission>>> Entity()
        {
            ActionRes<Commission> result = new ActionRes<Commission>()
            {
               item = new Commission()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Commission>>>> Select(ActionReq<CommissionSelectReq> req)
        {
            ActionRes<List<Commission>> result = new ActionRes<List<Commission>>();

            result.item = await commissionService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Commission>>> Insert(ActionReq<Commission> req)
        {
            ActionRes<Commission> result = new ActionRes<Commission>();

            result.item = await commissionService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Commission>>> Update(ActionReq<Commission> req)
        {
            ActionRes<Commission> result = new ActionRes<Commission>();

            result.item = await commissionService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Commission>>> Save(ActionReq<Commission> req)
        {
            ActionRes<Commission> result = new ActionRes<Commission>();

            if(req.item.id > 0){
                result.item = await commissionService.Update(req.item);
            }else{
                result.item = await commissionService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<CommissionDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await commissionService.Delete(req.item);

            return Ok(result);
        }
    }
}
