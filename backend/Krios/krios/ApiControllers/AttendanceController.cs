using Krios.Models;
using Krios.Models.Krios;
using Krios.Services.Krios;
using Microsoft.AspNetCore.Mvc;

namespace Krios.Controllers.Krios
{
    [Route("api/[controller]")]
    [ApiController]
    public class AttendanceController : ControllerBase
    {
        ILogger<AttendanceController> logger;
        AttendanceService attendanceService;

        public AttendanceController(ILogger<AttendanceController> logger, AttendanceService attendanceService)
        {
            this.logger = logger;
            this.attendanceService = attendanceService;
        }

        [HttpGet("Entity")]
        public async Task<ActionResult<ActionRes<Attendance>>> Entity()
        {
            ActionRes<Attendance> result = new ActionRes<Attendance>()
            {
               item = new Attendance()
            };

            return Ok(result);
        }

        [HttpPost("Select")]
        public async Task<ActionResult<ActionRes<List<Attendance>>>> Select(ActionReq<AttendanceSelectReq> req)
        {
            ActionRes<List<Attendance>> result = new ActionRes<List<Attendance>>();

            result.item = await attendanceService.Select(req.item);

            return Ok(result);
        }

        [HttpPost("Insert")]
        public async Task<ActionResult<ActionRes<Attendance>>> Insert(ActionReq<Attendance> req)
        {
            ActionRes<Attendance> result = new ActionRes<Attendance>();

            result.item = await attendanceService.Insert(req.item);

            return Ok(result);
        }

        [HttpPost("Update")]
        public async Task<ActionResult<ActionRes<Attendance>>> Update(ActionReq<Attendance> req)
        {
            ActionRes<Attendance> result = new ActionRes<Attendance>();

            result.item = await attendanceService.Update(req.item);

            return Ok(result);
        }

        [HttpPost("Save")]
        public async Task<ActionResult<ActionRes<Attendance>>> Save(ActionReq<Attendance> req)
        {
            ActionRes<Attendance> result = new ActionRes<Attendance>();

            if(req.item.id > 0){
                result.item = await attendanceService.Update(req.item);
            }else{
                result.item = await attendanceService.Insert(req.item);
            }

            return Ok(result);
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<ActionRes<bool>>> Delete(ActionReq<AttendanceDeleteReq> req)
        {
            ActionRes<bool> result = new ActionRes<bool>();

            result.item = await attendanceService.Delete(req.item);

            return Ok(result);
        }
    }
}
