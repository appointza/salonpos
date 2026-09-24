using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScratchPrizeController : ControllerBase
    {
        ILogger<ScratchPrizeController> logger;
        ScratchPrizeService scratchprizeService;

        public ScratchPrizeController(ILogger<ScratchPrizeController> logger, ScratchPrizeService scratchprizeService)
        {
            this.logger = logger;
            this.scratchprizeService = scratchprizeService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<ScratchPrize>>> Entity()
        {
            ActionRes<ScratchPrize> result = new ActionRes<ScratchPrize>()
            {
               item = new ScratchPrize()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<ScratchPrize>>>> Select(ActionReq<ScratchPrizeSelectReq> req)
        {
            ActionRes<List<ScratchPrize>> result = new ActionRes<List<ScratchPrize>>();

            result.item = await scratchprizeService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<ScratchPrize>>> Insert(ActionReq<ScratchPrize> req)
        {
            ActionRes<ScratchPrize> result = new ActionRes<ScratchPrize>();

            result.item = await scratchprizeService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<ScratchPrize>>> Update(ActionReq<ScratchPrize> req)
        {
            ActionRes<ScratchPrize> result = new ActionRes<ScratchPrize>();

            result.item = await scratchprizeService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<ScratchPrize>>> Save(ActionReq<ScratchPrize> req)
        {
            ActionRes<ScratchPrize> result = new ActionRes<ScratchPrize>();

            if(req.item.id > 0){
                result.item = await scratchprizeService.Update(req.item);
            }else{
                result.item = await scratchprizeService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ScratchPrizeDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await scratchprizeService.Delete(req.item);

            return Ok(result);
        }
    }
}
