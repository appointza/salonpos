using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class FranchiseController : ControllerBase
    {
        ILogger<FranchiseController> logger;
        FranchiseService franchiseService;

        public FranchiseController(ILogger<FranchiseController> logger, FranchiseService franchiseService)
        {
            this.logger = logger;
            this.franchiseService = franchiseService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Franchise>>> Entity()
        {
            ActionRes<Franchise> result = new ActionRes<Franchise>()
            {
               item = new Franchise()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Franchise>>>> Select(ActionReq<FranchiseSelectReq> req)
        {
            ActionRes<List<Franchise>> result = new ActionRes<List<Franchise>>();

            result.item = await franchiseService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Franchise>>> Insert(ActionReq<Franchise> req)
        {
            ActionRes<Franchise> result = new ActionRes<Franchise>();

            result.item = await franchiseService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Franchise>>> Update(ActionReq<Franchise> req)
        {
            ActionRes<Franchise> result = new ActionRes<Franchise>();

            result.item = await franchiseService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Franchise>>> Save(ActionReq<Franchise> req)
        {
            ActionRes<Franchise> result = new ActionRes<Franchise>();

            if(req.item.id > 0){
                result.item = await franchiseService.Update(req.item);
            }else{
                result.item = await franchiseService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<FranchiseDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await franchiseService.Delete(req.item);

            return Ok(result);
        }
    }
}
