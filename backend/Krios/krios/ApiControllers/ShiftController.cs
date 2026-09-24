using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShiftController : ControllerBase
    {
        ILogger<ShiftController> logger;
        ShiftService shiftService;

        public ShiftController(ILogger<ShiftController> logger, ShiftService shiftService)
        {
            this.logger = logger;
            this.shiftService = shiftService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Shift>>> Entity()
        {
            ActionRes<Shift> result = new ActionRes<Shift>()
            {
               item = new Shift()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Shift>>>> Select(ActionReq<ShiftSelectReq> req)
        {
            ActionRes<List<Shift>> result = new ActionRes<List<Shift>>();

            result.item = await shiftService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Shift>>> Insert(ActionReq<Shift> req)
        {
            ActionRes<Shift> result = new ActionRes<Shift>();

            result.item = await shiftService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Shift>>> Update(ActionReq<Shift> req)
        {
            ActionRes<Shift> result = new ActionRes<Shift>();

            result.item = await shiftService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Shift>>> Save(ActionReq<Shift> req)
        {
            ActionRes<Shift> result = new ActionRes<Shift>();

            if(req.item.id > 0){
                result.item = await shiftService.Update(req.item);
            }else{
                result.item = await shiftService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<ShiftDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await shiftService.Delete(req.item);

            return Ok(result);
        }
    }
}
