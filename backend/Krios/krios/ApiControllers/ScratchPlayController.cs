using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScratchPlayController : ControllerBase
    {
        ILogger<ScratchPlayController> logger;
        ScratchPlayService scratchplayService;

        public ScratchPlayController(ILogger<ScratchPlayController> logger, ScratchPlayService scratchplayService)
        {
            this.logger = logger;
            this.scratchplayService = scratchplayService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ScratchPlay>>> Entity()
        {
            ActionRes<ScratchPlay> result = new ActionRes<ScratchPlay>()
            {
               item = new ScratchPlay()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ScratchPlay>>>> Select(ActionReq<ScratchPlaySelectReq> req)
        {
            ActionRes<List<ScratchPlay>> result = new ActionRes<List<ScratchPlay>>();

            result.item = await scratchplayService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ScratchPlay>>> Insert(ActionReq<ScratchPlay> req)
        {
            ActionRes<ScratchPlay> result = new ActionRes<ScratchPlay>();

            result.item = await scratchplayService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ScratchPlay>>> Update(ActionReq<ScratchPlay> req)
        {
            ActionRes<ScratchPlay> result = new ActionRes<ScratchPlay>();

            result.item = await scratchplayService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ScratchPlay>>> Save(ActionReq<ScratchPlay> req)
        {
            ActionRes<ScratchPlay> result = new ActionRes<ScratchPlay>();

            if(req.item.id > 0){
                result.item = await scratchplayService.Update(req.item);
            }else{
                result.item = await scratchplayService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ScratchPlayDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await scratchplayService.Delete(req.item);

            return Ok(result);
        }
    }
}
