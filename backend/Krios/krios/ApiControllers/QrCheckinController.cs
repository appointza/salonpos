using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class QrCheckinController : ControllerBase
    {
        ILogger<QrCheckinController> logger;
        QrCheckinService qrcheckinService;

        public QrCheckinController(ILogger<QrCheckinController> logger, QrCheckinService qrcheckinService)
        {
            this.logger = logger;
            this.qrcheckinService = qrcheckinService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<QrCheckin>>> Entity()
        {
            ActionRes<QrCheckin> result = new ActionRes<QrCheckin>()
            {
               item = new QrCheckin()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<QrCheckin>>>> Select(ActionReq<QrCheckinSelectReq> req)
        {
            ActionRes<List<QrCheckin>> result = new ActionRes<List<QrCheckin>>();

            result.item = await qrcheckinService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<QrCheckin>>> Insert(ActionReq<QrCheckin> req)
        {
            ActionRes<QrCheckin> result = new ActionRes<QrCheckin>();

            result.item = await qrcheckinService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<QrCheckin>>> Update(ActionReq<QrCheckin> req)
        {
            ActionRes<QrCheckin> result = new ActionRes<QrCheckin>();

            result.item = await qrcheckinService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<QrCheckin>>> Save(ActionReq<QrCheckin> req)
        {
            ActionRes<QrCheckin> result = new ActionRes<QrCheckin>();

            if(req.item.id > 0){
                result.item = await qrcheckinService.Update(req.item);
            }else{
                result.item = await qrcheckinService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<QrCheckinDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await qrcheckinService.Delete(req.item);

            return Ok(result);
        }
    }
}
