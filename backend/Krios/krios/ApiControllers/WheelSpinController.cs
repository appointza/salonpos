using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class WheelSpinController : ControllerBase
    {
        ILogger<WheelSpinController> logger;
        WheelSpinService wheelspinService;

        public WheelSpinController(ILogger<WheelSpinController> logger, WheelSpinService wheelspinService)
        {
            this.logger = logger;
            this.wheelspinService = wheelspinService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<WheelSpin>>> Entity()
        {
            ActionRes<WheelSpin> result = new ActionRes<WheelSpin>()
            {
               item = new WheelSpin()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<WheelSpin>>>> Select(ActionReq<WheelSpinSelectReq> req)
        {
            ActionRes<List<WheelSpin>> result = new ActionRes<List<WheelSpin>>();

            result.item = await wheelspinService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<WheelSpin>>> Insert(ActionReq<WheelSpin> req)
        {
            ActionRes<WheelSpin> result = new ActionRes<WheelSpin>();

            result.item = await wheelspinService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<WheelSpin>>> Update(ActionReq<WheelSpin> req)
        {
            ActionRes<WheelSpin> result = new ActionRes<WheelSpin>();

            result.item = await wheelspinService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<WheelSpin>>> Save(ActionReq<WheelSpin> req)
        {
            ActionRes<WheelSpin> result = new ActionRes<WheelSpin>();

            if(req.item.id > 0){
                result.item = await wheelspinService.Update(req.item);
            }else{
                result.item = await wheelspinService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<WheelSpinDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await wheelspinService.Delete(req.item);

            return Ok(result);
        }
    }
}
