using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class WheelSegmentController : ControllerBase
    {
        ILogger<WheelSegmentController> logger;
        WheelSegmentService wheelsegmentService;

        public WheelSegmentController(ILogger<WheelSegmentController> logger, WheelSegmentService wheelsegmentService)
        {
            this.logger = logger;
            this.wheelsegmentService = wheelsegmentService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<WheelSegment>>> Entity()
        {
            ActionRes<WheelSegment> result = new ActionRes<WheelSegment>()
            {
               item = new WheelSegment()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<WheelSegment>>>> Select(ActionReq<WheelSegmentSelectReq> req)
        {
            ActionRes<List<WheelSegment>> result = new ActionRes<List<WheelSegment>>();

            result.item = await wheelsegmentService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<WheelSegment>>> Insert(ActionReq<WheelSegment> req)
        {
            ActionRes<WheelSegment> result = new ActionRes<WheelSegment>();

            result.item = await wheelsegmentService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<WheelSegment>>> Update(ActionReq<WheelSegment> req)
        {
            ActionRes<WheelSegment> result = new ActionRes<WheelSegment>();

            result.item = await wheelsegmentService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<WheelSegment>>> Save(ActionReq<WheelSegment> req)
        {
            ActionRes<WheelSegment> result = new ActionRes<WheelSegment>();

            if(req.item.id > 0){
                result.item = await wheelsegmentService.Update(req.item);
            }else{
                result.item = await wheelsegmentService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<WheelSegmentDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await wheelsegmentService.Delete(req.item);

            return Ok(result);
        }
    }
}
